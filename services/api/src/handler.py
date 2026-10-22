"""API Gateway HTTP API (payload v2) entry point: API key, routing, error codes of Architecture.md section 8."""
import base64
import hmac
import json
import logging
import os
from contextlib import contextmanager
from functools import lru_cache

import lookup
import speak
import validate
from botocore.exceptions import ClientError, ConnectTimeoutError, ReadTimeoutError

log = logging.getLogger()
log.setLevel(logging.INFO)
THROTTLE = {"ThrottlingException", "TooManyRequestsException"}


class _Err(Exception):
    def __init__(self, status, error):
        super().__init__(error)
        self.status, self.error = status, error


@lru_cache(maxsize=None)
def client(name):
    import boto3
    from botocore.config import Config

    # Two Bedrock attempts at 12 s each stay inside the 29 s API Gateway limit.
    # s3v4: botocore signs us-east-1 presigned URLs with the legacy SigV2 by default
    return boto3.client(name, config=Config(read_timeout=12, connect_timeout=3, retries={"max_attempts": 1}, signature_version="s3v4" if name == "s3" else None))


@lru_cache(maxsize=1)
def _api_key():
    # shortcut: cached for the container's life, rotate the key by redeploying or waiting for a cold start
    return client("ssm").get_parameter(Name=os.environ["API_KEY_SSM_PARAM"], WithDecryption=True)["Parameter"]["Value"]


@contextmanager
def _upstream(failed):
    """Map model/AWS failures to 502/504/429."""
    try:
        yield
    except validate.ValidationFailure:
        raise _Err(502, failed) from None
    except (ReadTimeoutError, ConnectTimeoutError):
        raise _Err(504, "timeout") from None
    except ClientError as e:
        log.warning("upstream error: %s", e.response["Error"]["Code"])
        raise _Err(429, "throttled") if e.response["Error"]["Code"] in THROTTLE else _Err(502, failed) from None


def _lookup(body):
    validate.validate("lookup-request", body)
    with _upstream("model_failed"):
        return lookup.run(client("bedrock-runtime"), client("dynamodb"), os.environ["TABLE_NAME"], body)


def _speak(body):
    text, voice = speak.parse(body)
    with _upstream("speak_failed"):
        return speak.run(client("polly"), client("s3"), os.environ["AUDIO_BUCKET"], text, voice)


ROUTES = {"POST /v1/lookup": _lookup, "POST /v1/speak": _speak}


def _body(event):
    raw = event.get("body") or ""
    try:
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        body = json.loads(raw)
    except ValueError:
        raise validate.ValidationFailure("body is not valid JSON") from None
    if not isinstance(body, dict):
        raise validate.ValidationFailure("body must be a JSON object")
    return body


def _resp(status, obj):
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(obj, ensure_ascii=False)}


def handler(event, context=None):
    try:
        supplied = (event.get("headers") or {}).get("x-api-key", "")
        if not hmac.compare_digest(supplied.encode("utf-8"), _api_key().encode("utf-8")):
            return _resp(403, {"error": "forbidden"})
        http = event["requestContext"]["http"]
        route = ROUTES.get(f"{http['method']} {event['rawPath']}")
        if not route:
            return _resp(404, {"error": "not_found"})
        return _resp(200, route(_body(event)))
    except validate.ValidationFailure as e:
        return _resp(400, {"error": "bad_request", "detail": str(e)[:200]})
    except _Err as e:
        return _resp(e.status, {"error": e.error})
    except Exception:
        log.exception("unhandled")  # stack trace stays in CloudWatch, never in the response
        return _resp(500, {"error": "internal"})

import io
import json
import sys
from pathlib import Path

import pytest
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[3]
# The same shared modules the SAM build copies into the Lambda package.
sys.path[:0] = [str(ROOT / "services/api/src"), str(ROOT / "tools/pregen")]

import handler  # noqa: E402

GOOD = {"meaning": "to move quickly and lightly", "example": "Rain began to patter on the roof.", "tr": {"es": "repiquetear"}, "confidence": 0.9, "isIdiom": False, "expression": None}
REQ = {"surface": "patter", "sentence": "Rain began to patter on the roof.", "filmId": "tears-of-steel", "targetLang": "es", "mode": "define"}


def client_error(code):
    return ClientError({"Error": {"Code": code, "Message": code}}, "op")


class FakeBedrock:
    """Queued replies in order; records the calls."""

    def __init__(self, *replies):
        self.replies, self.calls = list(replies), []

    def converse(self, **kw):
        self.calls.append(kw)
        return {"output": {"message": {"content": [{"text": self.replies.pop(0)}]}}}


class FakeDynamo:
    def __init__(self):
        self.items = {}

    def get_item(self, TableName, Key):
        item = self.items.get(Key["pk"]["S"])
        return {"Item": item} if item else {}

    def put_item(self, TableName, Item):
        self.items[Item["pk"]["S"]] = Item


class FakeS3:
    """In-memory objects; presigning is the handler's real S3 client with dummy credentials (no network)."""

    def __init__(self):
        self.objects = {}
        self.real = handler.client.__wrapped__("s3")

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise client_error("404")

    def put_object(self, Bucket, Key, Body, ContentType):
        self.objects[Key] = Body

    def generate_presigned_url(self, *a, **kw):
        return self.real.generate_presigned_url(*a, **kw)


class FakePolly:
    def __init__(self):
        self.calls = []

    def synthesize_speech(self, **kw):
        self.calls.append(kw)
        return {"AudioStream": io.BytesIO(b"mp3-bytes")}


@pytest.fixture
def aws(monkeypatch):
    class SSM:
        def get_parameter(self, Name, WithDecryption):
            return {"Parameter": {"Value": "secret"}}

    for k, v in {"AWS_ACCESS_KEY_ID": "x", "AWS_SECRET_ACCESS_KEY": "y", "AWS_DEFAULT_REGION": "us-east-1"}.items():
        monkeypatch.setenv(k, v)
    fakes = {"ssm": SSM(), "dynamodb": FakeDynamo(), "bedrock-runtime": FakeBedrock(), "s3": FakeS3(), "polly": FakePolly()}
    monkeypatch.setattr(handler, "client", fakes.__getitem__)
    for k, v in {"API_KEY_SSM_PARAM": "/wordwatch/api-key", "TABLE_NAME": "t", "AUDIO_BUCKET": "b"}.items():
        monkeypatch.setenv(k, v)
    handler._api_key.cache_clear()
    return fakes


def call(path, body, key="secret", method="POST"):
    event = {"rawPath": path, "requestContext": {"http": {"method": method}}, "headers": {"x-api-key": key} if key else {}, "body": body if isinstance(body, str) else json.dumps(body)}
    r = handler.handler(event)
    return r["statusCode"], json.loads(r["body"])

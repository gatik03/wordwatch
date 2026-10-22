import json

import cache
from conftest import GOOD, REQ, FakeBedrock, call


def test_lookup_miss_then_hit(aws):
    aws["bedrock-runtime"] = FakeBedrock(json.dumps(GOOD))
    status, first = call("/v1/lookup", REQ)
    assert status == 200 and first["cached"] is False and first["tr"]["es"] == "repiquetear" and first["audio"] is None
    assert cache.key("patter", REQ["sentence"], "es", "define") in aws["dynamodb"].items
    status, second = call("/v1/lookup", REQ)  # a second model call would pop an empty queue
    assert status == 200 and second["cached"] is True and second["meaning"] == first["meaning"]
    assert len(aws["bedrock-runtime"].calls) == 1


def test_lookup_bad_requests_400(aws):
    status, body = call("/v1/lookup", {**REQ, "targetLang": "fr"})
    assert status == 400 and body["error"] == "bad_request" and "targetLang" in body["detail"]
    assert call("/v1/lookup", {k: v for k, v in REQ.items() if k != "sentence"})[0] == 400
    assert call("/v1/lookup", {**REQ, "surface": "x" * 81})[0] == 400
    assert call("/v1/lookup", "{not json")[0] == 400
    assert call("/v1/lookup", "[]")[0] == 400


def test_bad_or_missing_api_key(aws):
    assert call("/v1/lookup", REQ, key="wrong") == (403, {"error": "forbidden"})
    assert call("/v1/lookup", REQ, key=None)[0] == 403
    assert call("/v1/nope", REQ)[0] == 404


def test_model_invalid_json_retried_once_then_502(aws):
    aws["bedrock-runtime"] = FakeBedrock("not json", "still not json")
    assert call("/v1/lookup", REQ) == (502, {"error": "model_failed"})
    calls = aws["bedrock-runtime"].calls
    assert len(calls) == 2 and "rejected" in calls[1]["messages"][0]["content"][0]["text"]
    assert not aws["dynamodb"].items


def test_model_retry_can_recover(aws):
    aws["bedrock-runtime"] = FakeBedrock("oops", json.dumps(GOOD))
    assert call("/v1/lookup", REQ)[0] == 200


def test_model_missing_target_language_is_rejected(aws):
    wrong = {**GOOD, "tr": {"hi": "x"}}
    aws["bedrock-runtime"] = FakeBedrock(json.dumps(wrong), json.dumps(wrong))
    assert call("/v1/lookup", REQ)[0] == 502


def test_speak_returns_presigned_url_and_reuses_audio(aws):
    status, body = call("/v1/speak", {"text": "patter", "voice": "Matthew"})
    assert status == 200 and body["expiresIn"] == 900
    assert body["url"].startswith("https://") and "/speak/" in body["url"] and "X-Amz-Signature" in body["url"]
    assert aws["polly"].calls[0]["VoiceId"] == "Matthew" and aws["polly"].calls[0]["Engine"] == "neural"
    assert list(aws["s3"].objects.values()) == [b"mp3-bytes"]
    assert call("/v1/speak", {"text": "patter", "voice": "Matthew"})[1]["url"].split("?")[0] == body["url"].split("?")[0]
    assert len(aws["polly"].calls) == 1


def test_speak_validation(aws):
    assert call("/v1/speak", {"text": "x" * 121})[0] == 400
    assert call("/v1/speak", {"text": "hi", "voice": "Zoe"})[0] == 400
    assert call("/v1/speak", {})[0] == 400

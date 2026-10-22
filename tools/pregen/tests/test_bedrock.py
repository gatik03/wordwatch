import json

import pytest

import bedrock
from conftest import StubBedrock
from validate import ValidationFailure

GOOD = json.dumps({"cues": [{"id": "c001", "items": [{"surface": "jerk", "lemma": "jerk", "pos": "noun", "level": "B2", "kind": "word", "meaning": "A rude person.", "example": "Don't be a jerk.", "tr": {"hi": "x"}, "confidence": 0.9}]}]})


def test_annotate_retries_once_with_error_appended(cues, monkeypatch):
    monkeypatch.setenv("BEDROCK_MODEL_ID", "test.model-v1")
    stub = StubBedrock("oops", GOOD)
    got = bedrock.annotate(stub, cues[:1], [], [], ["hi"])
    assert got["c001"][0]["surface"] == "jerk"
    assert len(stub.calls) == 2
    first, second = (c["messages"][0]["content"][0]["text"] for c in stub.calls)
    assert "rejected" not in first and "not valid JSON" in second and second.startswith(first)
    assert stub.calls[0]["modelId"] == "test.model-v1" and stub.calls[0]["inferenceConfig"]["temperature"] == 0.2


def test_second_failure_raises_after_exactly_two_calls(cues):
    stub = StubBedrock("oops", "still oops")
    with pytest.raises(ValidationFailure):
        bedrock.annotate(stub, cues[:1], [], [], ["hi"])
    assert len(stub.calls) == 2


def test_default_model_id(cues, monkeypatch):
    monkeypatch.delenv("BEDROCK_MODEL_ID", raising=False)
    stub = StubBedrock(GOOD)
    bedrock.annotate(stub, cues[:1], [], [], ["hi"])
    assert stub.calls[0]["modelId"] == "apac.amazon.nova-lite-v1:0"


def test_lookup(monkeypatch):
    body = {"meaning": "m", "example": "e", "tr": {"es": "x"}, "confidence": 0.5, "isIdiom": False}
    stub = StubBedrock(json.dumps(body))
    req = {"surface": "x", "sentence": "y", "filmId": "f", "targetLang": "es", "mode": "define"}
    assert bedrock.lookup(stub, req)["tr"] == {"es": "x"}

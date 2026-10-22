import json

import pytest

import validate
from validate import ValidationFailure


def ann(**over):
    it = {"surface": "jerk", "lemma": "jerk", "pos": "noun", "level": "B2", "kind": "word", "meaning": "A rude person.", "example": "Don't be a jerk.", "tr": {"hi": "x"}, "confidence": 0.9}
    it.update(over)
    return json.dumps({"cues": [{"id": "c001", "items": [it]}]})


def span(n):
    return {"id": f"c001-s{n}", "start": 0, "end": 1, "surface": "a", "lemma": "a", "pos": "noun", "level": "B1", "kind": "word"}


def test_cue_schema_resolves_span_ref():
    cue = {"id": "c001", "start": 0, "end": 1, "text": "a", "spans": [span(1)]}
    validate.validate("cue", cue)
    with pytest.raises(ValidationFailure, match="spans"):
        validate.validate("cue", {**cue, "spans": [span(n) for n in range(1, 5)]})
    with pytest.raises(ValidationFailure, match="level"):
        validate.validate("cue", {**cue, "spans": [{**span(1), "level": "A1"}]})


def test_lookup_request_limits():
    req = {"surface": "x", "sentence": "y", "filmId": "f", "targetLang": "hi", "mode": "define"}
    validate.validate("lookup-request", req)
    with pytest.raises(ValidationFailure):
        validate.validate("lookup-request", {**req, "targetLang": "fr"})


def test_parse_annotation_ok_clamps_and_strips_fence():
    got = validate.parse_annotation("```json\n" + ann(confidence=1.7) + "\n```", {"c001"}, ["hi"])
    assert got["c001"][0]["confidence"] == 1.0


@pytest.mark.parametrize("text, msg", [
    ("not json", "not valid JSON"),
    (ann(level="A1"), "level"),
    (ann(meaning="one " * 15), "meaning has 15 words"),
    (ann(example="one " * 13), "example has 13 words"),
    (ann(tr={"es": "x"}), "missing"),
])
def test_parse_annotation_failures(text, msg):
    with pytest.raises(ValidationFailure, match=msg):
        validate.parse_annotation(text, {"c001"}, ["hi"])


def test_parse_annotation_unknown_cue():
    with pytest.raises(ValidationFailure, match="unknown cue"):
        validate.parse_annotation(ann(), {"c002"}, ["hi"])


def test_parse_lookup_explain_allows_longer_meaning():
    body = {"meaning": "word " * 30, "example": "Short one.", "tr": {"es": "x"}, "confidence": 0.8, "isIdiom": False}
    assert validate.parse_lookup(json.dumps(body), "explain_more")["isIdiom"] is False
    with pytest.raises(ValidationFailure):
        validate.parse_lookup(json.dumps(body), "define")

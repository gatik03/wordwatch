import json

import prompts


def test_batches_of_12_with_2_cues_of_context(cues):
    got = list(prompts.batches(cues))
    assert len(got) == 7 and [len(b) for b, _, _ in got] == [12] * 6 + [4]
    b, before, after = got[1]
    assert [c["id"] for c in b][0] == "c013"
    assert [c["id"] for c in before] == ["c011", "c012"]
    assert [c["id"] for c in after] == ["c025", "c026"]
    assert got[0][1] == [] and got[-1][2] == []


def test_annotate_prompt_passes_text_as_json_data(cues):
    system, user = prompts.annotate_prompt(cues[:2], [], cues[2:4], ["hi", "es"])
    data = json.loads(user)
    assert [c["id"] for c in data["cues"]] == ["c001", "c002"] and data["before"] == []
    assert data["after"][0]["text"] == cues[2]["text"] and set(data["languages"]) == {"hi", "es"}
    assert "at most 14 words" in system and "at most 12 words" in system and "up to 3" in system


def test_lookup_prompt_and_retry_suffix():
    req = {"surface": "x", "sentence": "y", "filmId": "f", "targetLang": "es", "mode": "define"}
    assert json.loads(prompts.lookup_prompt(req)[1])["targetLanguage"] == "Spanish"
    assert prompts.with_error("U", "bad level").startswith("U") and "bad level" in prompts.with_error("U", "bad level")

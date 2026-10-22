import io
import json
from pathlib import Path

import pytest

import pregen
from conftest import FIX, StubBedrock
from test_bedrock import GOOD

SRT = str(FIX / "TOS-en.srt")
FIXTURE = str(FIX / "sample_lexicon.json")


def run_cli(out, *extra):
    pregen.main(["--film", "tears-of-steel", "--vtt", SRT, "--out", str(out), "--fixture", FIXTURE, *extra])


def load(out):
    return json.loads((out / "cues.json").read_text(encoding="utf-8")), json.loads((out / "lexicon.json").read_text(encoding="utf-8"))


def test_fixture_end_to_end(tmp_path):
    run_cli(tmp_path)
    cues, lex = load(tmp_path)
    assert len(cues) == 76 and 18 <= len(lex) <= 20
    assert not (tmp_path / "audio").exists()
    ids = {s["id"] for c in cues for s in c["spans"]}
    assert ids == set(lex)
    for c in cues:
        for s in c["spans"]:
            assert c["text"][s["start"]:s["end"]] == s["surface"]
    for e in lex.values():
        assert e["tr"]["hi"] and e["tr"]["es"] and "audio" not in e
        assert len(e["meaning"].split()) <= 14 and len(e["example"].split()) <= 12
    kinds = [s["kind"] for c in cues for s in c["spans"]]
    assert kinds.count("phrasal") + kinds.count("idiom") >= 2


def test_same_word_two_scenes_two_meanings(tmp_path):
    run_cli(tmp_path)
    cues, lex = load(tmp_path)
    times = [(c["id"], s["id"]) for c in cues for s in c["spans"] if s["surface"] == "time"]
    assert [c for c, _ in times] == ["c064", "c066"]
    assert lex[times[0][1]]["meaning"] != lex[times[1][1]]["meaning"]


def test_force_guard(tmp_path, capsys):
    run_cli(tmp_path)
    (tmp_path / "lexicon.json").write_text("hand edited")
    with pytest.raises(SystemExit) as e:
        run_cli(tmp_path)
    assert "--force" in str(e.value)
    assert (tmp_path / "lexicon.json").read_text() == "hand edited"
    run_cli(tmp_path, "--force")
    assert len(load(tmp_path)[1]) >= 18


def test_fixture_item_that_does_not_match_fails_loudly(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"entries": [{"cue": "c001", "surface": "nope"}]}))
    with pytest.raises(SystemExit, match="not found"):
        pregen.main(["--film", "f", "--vtt", SRT, "--out", str(tmp_path / "o"), "--fixture", str(bad)])
    assert not (tmp_path / "o").exists()


class StubPolly:
    def __init__(self):
        self.texts = []

    def synthesize_speech(self, **kw):
        self.texts.append(kw["Text"])
        assert kw["Engine"] == "neural" and kw["OutputFormat"] == "mp3"
        return {"AudioStream": io.BytesIO(b"ID3fake")}


def test_real_path_with_stubbed_aws(tmp_path):
    # c001 gets the GOOD reply; every other batch returns no items
    empty = json.dumps({"cues": []})
    stub = StubBedrock(GOOD, *[empty] * 6)
    polly = StubPolly()
    args = pregen.argparse.Namespace(film="f", vtt=SRT, out=str(tmp_path), lang="hi", fixture=None, force=False)
    with pytest.raises(SystemExit, match="targets missed"):  # 1 of 76 cues is far below 90 percent
        pregen.run(args, stub, polly)
    assert len(stub.calls) == 7 and polly.texts == ["jerk"]
    cues, lex = load(tmp_path)
    assert lex["c001-s1"]["audio"] == "audio/jerk.mp3" and (tmp_path / "audio" / "jerk.mp3").read_bytes() == b"ID3fake"
    assert cues[0]["spans"][0]["surface"] == "jerk"

import vtt


def test_tos_has_76_cues(cues):
    assert len(cues) == 76
    assert cues[0] == {"id": "c001", "start": 23.0, "end": 24.5, "text": "You're a jerk, Thom.", "spans": []}
    assert cues[-1]["id"] == "c076"


def test_lines_are_merged(cues):
    assert cues[2]["text"] == "...you have your robotics, and I just want to be awesome in space."
    assert cues[8]["text"] == '"Fourty years later" Whatever, Thom. We\'re done.'


def test_vtt_tags_and_speakers_stripped():
    src = "﻿WEBVTT\n\nNOTE hi\n\nintro\n00:01.500 --> 00:03.000 align:start\n<i>Hello</i> {\\an8}there\n- JOHN: Hi\n\n01:00:00.250 --> 01:00:01.000\n>> MARY: Bye\n\n00:05.000 --> 00:06.000\n<b></b>\n"
    got = vtt.parse(src)
    assert [(c["id"], c["start"], c["end"], c["text"]) for c in got] == [
        ("c001", 1.5, 3.0, "Hello there Hi"),
        ("c002", 3600.25, 3601.0, "Bye"),
    ]

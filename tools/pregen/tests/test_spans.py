import spans


def item(surface, **kw):
    return {"surface": surface, "lemma": surface, **kw}


def test_offsets_and_ids():
    got = spans.locate("c001", "You're a jerk, Thom.", [item("jerk")])
    assert [(g["id"], g["start"], g["end"]) for g in got] == [("c001-s1", 9, 13)]


def test_repeats_follow_order_of_appearance():
    text = "go go go"
    got = spans.locate("c002", text, [item("go"), item("go")])
    assert [(g["start"], g["end"]) for g in got] == [(0, 2), (3, 5)]


def test_misses_are_dropped_and_match_is_exact():
    assert spans.locate("c003", "Hello there", [item("hello"), item("nope")]) == []
    assert len(spans.locate("c003", "Hello there", [item("nope"), item("there")])) == 1
    assert spans.locate("c003", "go", [item("go"), item("go")])[0]["start"] == 0  # third occurrence does not exist


def test_overlaps_are_dropped_first_wins():
    got = spans.locate("c004", "freaked out by it", [item("freaked out"), item("out by"), item("by it")])
    assert [g["surface"] for g in got] == ["freaked out", "by it"]


def test_cap_of_three_and_sorted_by_position():
    got = spans.locate("c005", "a b c d e", [item(x) for x in "edcba"])
    assert [g["surface"] for g in got] == ["c", "d", "e"]
    assert [g["id"] for g in got] == ["c005-s1", "c005-s2", "c005-s3"]


def test_offsets_are_utf16():
    got = spans.locate("c006", "\U0001F600 jerk", [item("jerk")])
    assert (got[0]["start"], got[0]["end"]) == (3, 7)

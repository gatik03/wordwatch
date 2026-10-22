from pathlib import Path

import pytest

FIX = Path(__file__).resolve().parents[1] / "fixtures"


@pytest.fixture(scope="session")
def srt():
    return (FIX / "TOS-en.srt").read_text(encoding="utf-8")


@pytest.fixture
def cues(srt):
    import vtt

    return vtt.parse(srt)


class StubBedrock:
    """Returns the queued replies in order and records the calls."""

    def __init__(self, *replies):
        self.replies, self.calls = list(replies), []

    def converse(self, **kw):
        self.calls.append(kw)
        return {"output": {"message": {"content": [{"text": self.replies.pop(0)}]}}}

"""SRT/VTT parser: text in, Cue dicts out (no subtitle library, see Rules.md)."""
import re

_T = r"(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})"
_ARROW = re.compile(f"{_T}\\s*-->\\s*{_T}")
_TAG = re.compile(r"<[^>]*>|\{[^}]*\}")
# leading speaker marks: ">> ", "- ", "NAME: "
_SPEAKER = re.compile(r"^(?:(?:>>\s*|-\s+)|[A-Z][A-Z0-9 .'_-]{0,24}:\s+)+")


def _sec(h, m, s, ms):
    return int(h or 0) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000


def _clean(line):
    return _SPEAKER.sub("", _TAG.sub("", line).strip())


def parse(text):
    """Return [{id, start, end, text, spans: []}]; ids are c001... in file order."""
    text = text.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    cues = []
    for block in re.split(r"\n\s*\n", text):
        lines = block.strip("\n").split("\n")
        i = next((i for i, ln in enumerate(lines) if _ARROW.search(ln)), None)
        if i is None:  # WEBVTT header, NOTE, STYLE
            continue
        g = _ARROW.search(lines[i]).groups()
        body = re.sub(r"\s+", " ", " ".join(_clean(ln) for ln in lines[i + 1:])).strip()
        if body:
            cues.append({"id": f"c{len(cues) + 1:03d}", "start": _sec(*g[:4]), "end": _sec(*g[4:]), "text": body, "spans": []})
    return cues

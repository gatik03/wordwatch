"""Locate model-proposed surfaces in cue text. Offsets are never taken from the model."""

MAX_SPANS = 3


def _u16(text, i):
    """Python index -> UTF-16 offset (the app's JS strings)."""
    return len(text[:i].encode("utf-16-le")) // 2


def locate(cue_id, text, items):
    """Keep items (in model order) whose surface is found, non-overlapping, max 3.

    The k-th item with a given surface gets its k-th occurrence in the text.
    Returns copies sorted by position with id, start, end added.
    """
    seen, kept = {}, []
    for item in items:
        surface = item["surface"]
        n = seen[surface] = seen.get(surface, 0) + 1
        pos = -1
        for _ in range(n):
            pos = text.find(surface, pos + 1)
            if pos < 0:
                break
        if pos < 0:
            continue
        end = pos + len(surface)
        if any(pos < e and s < end for s, e, _ in kept):
            continue
        kept.append((pos, end, item))
        if len(kept) == MAX_SPANS:
            break
    kept.sort(key=lambda k: k[0])
    return [{**it, "id": f"{cue_id}-s{n}", "start": _u16(text, s), "end": _u16(text, e)} for n, (s, e, it) in enumerate(kept, 1)]

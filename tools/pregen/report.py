"""Pipeline report: cue coverage, spans, low confidence, audio size."""
from pathlib import Path

MIN_COVERAGE, MAX_AUDIO_BYTES, LOW_CONFIDENCE = 0.9, 5_000_000, 0.6


def build(cues, lexicon, audio_dir=None):
    annotated = sum(1 for c in cues if c["spans"])
    files = list(Path(audio_dir).glob("*.mp3")) if audio_dir and Path(audio_dir).is_dir() else []
    return {
        "cues": len(cues),
        "annotated": annotated,
        "coverage": annotated / len(cues) if cues else 0.0,
        "spans": sum(len(c["spans"]) for c in cues),
        "low_confidence": sorted(k for k, v in lexicon.items() if v["confidence"] < LOW_CONFIDENCE),
        "audio_files": len(files),
        "audio_bytes": sum(f.stat().st_size for f in files),
    }


def failures(r):
    out = []
    if r["coverage"] < MIN_COVERAGE:
        out.append(f"coverage {r['coverage']:.0%} is below {MIN_COVERAGE:.0%}")
    if r["audio_bytes"] > MAX_AUDIO_BYTES:
        out.append(f"audio {r['audio_bytes']} bytes is above {MAX_AUDIO_BYTES}")
    return out


def format(r):
    return "\n".join([
        f"cues annotated: {r['annotated']}/{r['cues']} ({r['coverage']:.0%}, target {MIN_COVERAGE:.0%})",
        f"spans total: {r['spans']}",
        f"low confidence (<{LOW_CONFIDENCE}): {len(r['low_confidence'])} {r['low_confidence']}",
        f"audio: {r['audio_files']} files, {r['audio_bytes'] / 1e6:.2f} MB (limit {MAX_AUDIO_BYTES / 1e6:.0f} MB)",
    ])

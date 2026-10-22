#!/usr/bin/env python3
"""SRT/VTT -> cues.json + lexicon.json (+ audio/)."""
import argparse
import json
import os
import sys
from pathlib import Path

import bedrock
import prompts
import report
import spans
import speak
import validate
import vtt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEFAULT_FIXTURE = HERE / "fixtures" / "sample_lexicon.json"
SPAN_KEYS = ("id", "start", "end", "surface", "lemma", "pos", "level", "kind")
ENTRY_KEYS = ("meaning", "example", "tr", "confidence")


def build(cues, items_by_cue):
    """Attach located spans to cues in place. Returns (lexicon, number of dropped items)."""
    lexicon, dropped = {}, 0
    for cue in cues:
        items = items_by_cue.get(cue["id"], [])
        kept = spans.locate(cue["id"], cue["text"], items)
        dropped += len(items) - len(kept)
        for it in kept:
            cue["spans"].append({k: it[k] for k in SPAN_KEYS})
            lexicon[it["id"]] = {"spanId": it["id"], **{k: it[k] for k in ENTRY_KEYS}}
    return lexicon, dropped


def load_fixture(path):
    items = {}
    for e in json.loads(Path(path).read_text(encoding="utf-8"))["entries"]:
        items.setdefault(e["cue"], []).append({k: v for k, v in e.items() if k != "cue"})
    return items


def annotate_all(client, cues, langs):
    items = {}
    for batch, before, after in prompts.batches(cues):
        items.update(bedrock.annotate(client, batch, before, after, langs))
    return items


def check_outputs(out, force):
    existing = [p for p in (out / "cues.json", out / "lexicon.json", out / "audio") if p.exists()]
    if existing and not force:
        sys.exit(f"error: {', '.join(p.name for p in existing)} already exist in {out}; pass --force to overwrite")


def write_json(path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def run(args, bedrock_client=None, polly_client=None):
    out = Path(args.out)
    check_outputs(out, args.force)
    langs = [x for x in args.lang.split(",") if x]
    cues = vtt.parse(Path(args.vtt).read_text(encoding="utf-8-sig"))
    fixture = args.fixture is not None
    items = load_fixture(args.fixture) if fixture else annotate_all(bedrock_client or bedrock.get_client(), cues, langs)
    lexicon, dropped = build(cues, items)
    if fixture and dropped:
        raise validate.ValidationFailure(f"{dropped} fixture item(s) not found in their cue text")
    audio_dir = out / "audio"
    if not fixture:
        paths = speak.generate(polly_client or speak.get_client(), [s["surface"].lower() for c in cues for s in c["spans"]], audio_dir)
        for c in cues:
            for s in c["spans"]:
                lexicon[s["id"]]["audio"] = paths[s["surface"].lower()]
    for c in cues:
        validate.validate("cue", c)
    for e in lexicon.values():
        validate.validate("lexentry", e)
    r = report.build(cues, lexicon, audio_dir)
    out.mkdir(parents=True, exist_ok=True)
    write_json(out / "cues.json", cues)
    write_json(out / "lexicon.json", lexicon)
    print(report.format(r))
    bad = report.failures(r)
    if bad and fixture:
        print("fixture mode: targets not enforced (" + "; ".join(bad) + ")")
    elif bad:  # output is complete and kept; the exit code flags the missed targets
        sys.exit("error: report targets missed: " + "; ".join(bad))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--film", required=True)
    ap.add_argument("--vtt", required=True, help="SRT or VTT file")
    ap.add_argument("--out", help="default: apps/tv/assets/film/<film>")
    ap.add_argument("--lang", default="hi", help="comma separated target languages")
    ap.add_argument("--fixture", nargs="?", const=str(DEFAULT_FIXTURE), help="skip Bedrock and Polly; read entries from this file")
    ap.add_argument("--force", action="store_true", help="overwrite existing output")
    args = ap.parse_args(argv)
    args.out = args.out or str(ROOT / "apps" / "tv" / "assets" / "film" / args.film)
    try:
        run(args)
    except (validate.ValidationFailure, OSError, KeyError) as e:
        sys.exit(f"error: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()

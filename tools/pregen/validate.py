"""JSON Schema validation and limits for model output. Shared with the Lambda (Rules.md section 3)."""
import json
import os
import re
from functools import lru_cache
from pathlib import Path

SCHEMA_DIR = Path(os.environ.get("WORDWATCH_SCHEMA_DIR") or Path(__file__).resolve().parents[2] / "shared" / "schemas")
MEANING_MAX, EXPLAIN_MAX, EXAMPLE_MAX = 14, 40, 12


class ValidationFailure(ValueError):
    pass


@lru_cache(maxsize=1)
def _registry():
    from referencing import Registry, Resource

    files = [json.loads(p.read_text(encoding="utf-8")) for p in SCHEMA_DIR.glob("*.schema.json")]
    return Registry().with_resources([(s["$id"], Resource.from_contents(s)) for s in files])


def validate(name, data):
    """Raise ValidationFailure unless data matches shared/schemas/<name>.schema.json."""
    from jsonschema import Draft202012Validator

    schema = json.loads((SCHEMA_DIR / f"{name}.schema.json").read_text(encoding="utf-8"))
    err = next(iter(sorted(Draft202012Validator(schema, registry=_registry()).iter_errors(data), key=lambda e: list(map(str, e.path)))), None)
    if err:
        where = "/".join(map(str, err.path)) or "(root)"
        raise ValidationFailure(f"{name}: {where}: {err.message}")
    return data


def extract_json(text):
    """Parse model text as JSON, tolerating a code fence or stray prose around the object."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    a, b = text.find("{"), text.rfind("}")
    try:
        return json.loads(text[a:b + 1])
    except ValueError as e:
        raise ValidationFailure(f"not valid JSON: {e}") from None


def _words(s):
    return len(s.split())


def _limits(label, obj, meaning_max):
    for key, cap in (("meaning", meaning_max), ("example", EXAMPLE_MAX)):
        if _words(obj[key]) > cap:
            raise ValidationFailure(f"{label}: {key} has {_words(obj[key])} words (max {cap})")
    obj["confidence"] = min(1.0, max(0.0, float(obj["confidence"])))


def parse_annotation(text, cue_ids, langs):
    """Model text -> {cue_id: [item]}. Raises ValidationFailure (the caller retries once)."""
    data = validate("annotation", extract_json(text))
    out = {}
    for cue in data["cues"]:
        if cue["id"] not in cue_ids:
            raise ValidationFailure(f"unknown cue id {cue['id']}")
        for item in cue["items"]:
            label = f"{cue['id']} '{item['surface']}'"
            missing = [lg for lg in langs if lg not in item["tr"]]
            if missing:
                raise ValidationFailure(f"{label}: tr is missing {missing}")
            _limits(label, item, MEANING_MAX)
        out.setdefault(cue["id"], []).extend(cue["items"])
    return out


def parse_lookup(text, mode="define"):
    """Model text -> LookupResponse dict."""
    data = validate("lookup-response", extract_json(text))
    _limits("lookup", data, EXPLAIN_MAX if mode == "explain_more" else MEANING_MAX)
    return data

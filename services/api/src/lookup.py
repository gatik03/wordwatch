"""POST /v1/lookup: cache, else Bedrock via the shared prompts/validate/bedrock modules."""
import bedrock
import cache
import prompts
import validate

FIELDS = ("surface", "lemma", "sentence", "prevLine", "nextLine", "filmId", "targetLang", "mode")


def _parse(text, req):
    data = validate.parse_lookup(text, req["mode"])
    if req["targetLang"] not in data["tr"]:
        raise validate.ValidationFailure(f"tr is missing '{req['targetLang']}'")
    return data


def run(bedrock_client, ddb, table, req):
    """Return a LookupResponse dict. Raises ValidationFailure when the model fails twice."""
    req = {k: req[k] for k in FIELDS if k in req}  # model sees only schema fields
    pk = cache.key(req["surface"], req["sentence"], req["targetLang"], req["mode"])
    hit = cache.get(ddb, table, pk)
    if hit:
        return {**hit, "cached": True}
    system, user = prompts.lookup_prompt(req)
    data = bedrock.ask(bedrock_client, system, user, lambda t: _parse(t, req), max_tokens=1024)
    resp = {**data, "expression": data.get("expression"), "audio": None, "cached": False}
    cache.put(ddb, table, pk, resp)
    return resp

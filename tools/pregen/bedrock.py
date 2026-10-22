"""Bedrock Converse calls. boto3 is imported lazily so fixture mode needs no AWS."""
import os

import prompts
import validate

DEFAULT_MODEL = "apac.amazon.nova-lite-v1:0"


def get_client():
    import boto3

    return boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "ap-southeast-2"))


def converse(client, system, user, max_tokens=4096):
    resp = client.converse(
        modelId=os.environ.get("BEDROCK_MODEL_ID", DEFAULT_MODEL),
        system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": user}]}],
        inferenceConfig={"temperature": 0.2, "maxTokens": max_tokens},
    )
    return resp["output"]["message"]["content"][0]["text"]


def ask(client, system, user, parse, max_tokens=4096):
    """Call, parse; on ValidationFailure retry once with the error appended, then raise."""
    try:
        return parse(converse(client, system, user, max_tokens))
    except validate.ValidationFailure as e:
        return parse(converse(client, system, prompts.with_error(user, e), max_tokens))


def annotate(client, batch, before, after, langs):
    """One batch -> {cue_id: [item]}."""
    system, user = prompts.annotate_prompt(batch, before, after, langs)
    ids = {c["id"] for c in batch}
    return ask(client, system, user, lambda t: validate.parse_annotation(t, ids, langs))


def lookup(client, req):
    system, user = prompts.lookup_prompt(req)
    return ask(client, system, user, lambda t: validate.parse_lookup(t, req["mode"]), max_tokens=1024)

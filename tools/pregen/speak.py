"""Polly neural pronunciation mp3s, one per unique expression. boto3 is imported lazily."""
import os
import re
from pathlib import Path


def get_client():
    import boto3

    return boto3.client("polly", region_name=os.environ.get("AWS_REGION", "ap-southeast-2"))


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "x"


def generate(client, expressions, audio_dir, voice="Joanna"):
    """Write audio_dir/<slug>.mp3 for each expression (skip existing). Returns {expression: 'audio/<slug>.mp3'}."""
    audio_dir = Path(audio_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)
    out = {}
    for expr in sorted(set(expressions)):
        path = audio_dir / f"{slug(expr)}.mp3"
        if not path.exists():
            resp = client.synthesize_speech(Text=expr, OutputFormat="mp3", VoiceId=voice, Engine="neural")
            path.write_bytes(resp["AudioStream"].read())
        out[expr] = f"audio/{path.name}"
    return out

"""POST /v1/speak: Polly neural mp3 stored once in S3, returned as a presigned GET URL."""
import hashlib

import validate
from botocore.exceptions import ClientError

VOICES = ("Joanna", "Matthew")
MAX_TEXT = 120
EXPIRES = 900


def parse(body):
    """Return (text, voice) or raise ValidationFailure. There is no shared schema for /speak."""
    text, voice = body.get("text"), body.get("voice", VOICES[0])
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT:
        raise validate.ValidationFailure(f"text must be a string of 1 to {MAX_TEXT} characters")
    if voice not in VOICES:
        raise validate.ValidationFailure(f"voice must be one of {list(VOICES)}")
    return text, voice


def run(polly, s3, bucket, text, voice):
    key = f"speak/{hashlib.sha256(f'{voice}|{text}'.encode('utf-8')).hexdigest()}.mp3"
    try:
        s3.head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] not in ("404", "NoSuchKey", "NotFound"):
            raise
        audio = polly.synthesize_speech(Text=text, OutputFormat="mp3", VoiceId=voice, Engine="neural")["AudioStream"].read()
        s3.put_object(Bucket=bucket, Key=key, Body=audio, ContentType="audio/mpeg")
    url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=EXPIRES)
    return {"url": url, "expiresIn": EXPIRES}

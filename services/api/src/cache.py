"""DynamoDB lookup cache. Failures are logged and ignored: a broken cache must not break a lookup."""
import hashlib
import json
import logging
import time

from botocore.exceptions import ClientError

log = logging.getLogger(__name__)
TTL_SECONDS = 30 * 24 * 3600


def key(surface, sentence, lang, mode):
    return hashlib.sha256("|".join((surface, sentence, lang, mode)).encode("utf-8")).hexdigest()


def get(ddb, table, pk):
    try:
        item = ddb.get_item(TableName=table, Key={"pk": {"S": pk}}).get("Item")
    except ClientError:
        log.warning("cache read failed", exc_info=True)
        return None
    return json.loads(item["resp"]["S"]) if item else None


def put(ddb, table, pk, resp):
    try:
        ddb.put_item(TableName=table, Item={"pk": {"S": pk}, "resp": {"S": json.dumps(resp)}, "ttl": {"N": str(int(time.time()) + TTL_SECONDS)}})
    except ClientError:
        log.warning("cache write failed", exc_info=True)

# WordWatch API (SAM)

`POST /v1/lookup` and `POST /v1/speak` behind an HTTP API, one Python 3.12 Lambda, DynamoDB cache, S3 audio, Bedrock (Amazon Nova Lite) and Polly. Not deployed yet.

## Layout

- `template.yaml`: the whole stack. `src/`: `handler.py` (API key, routing, error codes), `lookup.py`, `speak.py`, `cache.py`.
- `prompts.py`, `validate.py`, `bedrock.py` and `shared/schemas/` are **not** copied into git. `src/Makefile` (SAM `BuildMethod: makefile`) copies them from `tools/pregen/` and `shared/schemas/` into the package during `sam build` (ADR-13). The tests import them from the same place.
- Errors: 400 `bad_request`, 403 bad or missing `x-api-key`, 404 unknown route, 429 throttled, 502 `model_failed` (model output invalid twice) or `speak_failed`, 504 `timeout`, 500 `internal`.

## Test

`cd services/api && python3 -m venv .venv && .venv/bin/pip install -r ../../tools/pregen/requirements.txt && .venv/bin/pytest -q` (no AWS needed).

## Deploy

Prerequisites: AWS CLI configured (`aws sts get-caller-identity` works), SAM CLI, `python3` with `pip` on the PATH (the Makefile uses it to fetch Linux wheels for `jsonschema`). Use **ap-southeast-2** (Nova Lite).

1. **Bedrock model access.** AWS console, region ap-southeast-2, Bedrock, Model access, request **Amazon Nova Lite** (Nova models are usually enabled on first use; if the first call returns `AccessDeniedException`, request access here). Check:
   ```bash
   aws bedrock-runtime converse --region ap-southeast-2 --model-id apac.amazon.nova-lite-v1:0 \
     --messages '[{"role":"user","content":[{"text":"Say hi"}]}]'
   ```
   The default model is the `apac.amazon.nova-lite-v1:0` cross-Region inference profile. The Lambda's `bedrock:InvokeModel` permission covers that profile plus the Nova Lite foundation model (in any Region, until the profile's routing Regions are pinned in `template.yaml`).
2. **Create the API key in SSM** (before the first request; the stack only grants read access). Keep the value out of git:
   ```bash
   aws ssm put-parameter --region ap-southeast-2 --name /wordwatch/api-key --type SecureString \
     --value "$(openssl rand -hex 24)"
   aws ssm get-parameter --region ap-southeast-2 --name /wordwatch/api-key --with-decryption --query Parameter.Value --output text
   ```
   (A different name needs `--parameter-overrides ApiKeyParam=/your/name` at deploy.) The Lambda caches the key per container; after rotating it, redeploy or wait for containers to recycle.
3. **Build and deploy** from `services/api`:
   ```bash
   sam validate --lint
   sam build
   sam deploy --guided     # stack name e.g. wordwatch-api, region ap-southeast-2, accept creating roles, save samconfig.toml
   ```
4. **Smoke test** with the `ApiUrl` output:
   ```bash
   URL=https://xxxx.execute-api.ap-southeast-2.amazonaws.com; KEY=<the SSM value>
   curl -s -X POST $URL/v1/lookup -H "x-api-key: $KEY" -H 'content-type: application/json' \
     -d '{"surface":"patter","sentence":"Rain began to patter on the roof.","filmId":"tears-of-steel","targetLang":"es","mode":"define"}'
   ```
   Run it twice: the second answer has `"cached": true` and a new item appears in the DynamoDB table. `POST /v1/speak` with `{"text":"patter","voice":"Joanna"}` returns `{"url": "...", "expiresIn": 900}`; open the URL to hear it. A wrong key gives 403.
5. **Point the TV app at it.** Set `API_BASE_URL` in `apps/tv/src/app/config.ts` to the `ApiUrl` output (no trailing slash) and put the API key in the gitignored local config the TV build reads. Never commit either the key or the account id. An empty `API_BASE_URL` keeps the app in offline mode.

Clean up with `sam delete` (the audio bucket must be emptied first).

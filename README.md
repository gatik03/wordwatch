# WordWatch

Word Wise for TV: pause the film, point at a subtitle word, get its meaning, translation and pronunciation, without leaving the couch.

## What it is

WordWatch is a Fire TV (Vega OS) app built for the Amazon Developer Hackathon 2026. Looking up a word while watching TV usually means reaching for a phone and losing the scene. WordWatch brings that lookup onto the TV, controlled with the remote alone. It removes the friction of looking words up; it makes no claim about proficiency or learning outcomes.

The app plays the CC BY film "Tears of Steel" with English subtitles.

## Features

- Pause and enter learn mode, then move a cursor across the underlined subtitle words.
- Word Card: in-context meaning, a Hindi or Spanish translation, an example and a pronunciation.
- "Explain more" for a longer explanation (needs the backend).
- Save words, review them, and take a short quiz built from your saved words.
- 10-foot UI: large type, focus ring plus scale, no scrolling lists.

Remote controls:

| Button | Action |
|---|---|
| Select | Pause and enter learn mode; open the Word Card for the focused word; activate a button |
| D-pad | Move between subtitle words and buttons |
| Back | Close the card or leave learn mode |
| Play/Pause | Pause or resume the film |

## How it works

The bundle comes first; AWS is called only on demand.

```
tools/pregen --> cues.json + lexicon.json (bundled) --+
                                                      v
 Fire TV app (Vega RN, bundle-first) ---- bundled card, instant
        | Explain more / Spanish / Hear (6 s timeout, falls back to bundle)
        v
 API Gateway --> Lambda --> Bedrock (explain), Polly (audio)
                    |-----> DynamoDB (cache), S3 (audio)
```

The base card always renders from the bundle, so the UI never waits on the network.

## AWS services

- Amazon Bedrock (Nova Lite): word explanations.
- Amazon Polly: pronunciation audio.
- Amazon API Gateway (HTTP API) and AWS Lambda: the lookup and speak endpoints.
- Amazon DynamoDB: response cache with TTL.
- Amazon S3: private audio bucket, served by presigned URLs.
- AWS Systems Manager Parameter Store: the API key.

## Status

- The app runs fully offline on the bundled lexicon, Hindi, and Spanish (bundled `tr.es`).
- "Explain more" needs the backend and shows "Needs a network connection" without it.
- The backend in `services/api` is built but not deployed.
- Tested on the Vega Virtual Device (x86_64) only, not on a physical Fire TV.

## Setup and run on the Vega Virtual Device

Prerequisites: Ubuntu, the Vega SDK (installed with `get_vvm.sh`), Node 22, ffmpeg, watchman and lz4.

```bash
source ~/vega/env                      # Vega SDK, installed with get_vvm.sh
cd apps/tv && npm install

# film (CC BY-ND, container remux only, never re-encode)
curl -L -o tears_of_steel_720p.mov https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov
ffmpeg -i tears_of_steel_720p.mov -c copy -movflags +faststart tears_of_steel_720p.mp4
cp tears_of_steel_720p.mp4 src/spike/media/

# optional, for live features: set API_BASE_URL and API_KEY
cp src/app/local.config.example.ts src/app/local.config.ts

vega virtual-device start --timeout 600
npx react-native build-vega --target x86_64
vega run-app build/x86_64-release/wordwatch_x86_64.vpkg com.wordwatch.tv -d VirtualDevice
```

To relaunch without wiping app storage:

```bash
vega device terminate-app -d VirtualDevice --appName com.wordwatch.tv
vega device launch-app    -d VirtualDevice --appName com.wordwatch.tv
```

## Optional: deploy the backend

Needs the AWS CLI, SAM CLI and Bedrock access to Nova Lite. Region `ap-southeast-2`, model `apac.amazon.nova-lite-v1:0` (an inference profile, so widen the Bedrock IAM policy in `services/api/template.yaml` and set `BedrockModelId`). Create the API key in SSM Parameter Store, then:

```bash
cd services/api
sam build && sam deploy --guided
```

Put the resulting `ApiUrl` and the key in `apps/tv/src/app/local.config.ts` (gitignored). See `services/api/README.md`.

## Repo layout

- `apps/tv`: the Vega React Native app.
- `tools/pregen`: subtitle to cues and lexicon pipeline (`--fixture` runs without AWS).
- `services/api`: the SAM backend.
- `shared`: JSON Schemas shared by the pipeline and the backend.

## Credits and license

- Film: "Tears of Steel" (c) Blender Foundation, CC BY 3.0, played unmodified.
- Soundtrack: CC BY-ND 3.0, played unmodified.
- Code: MIT ([LICENSE](LICENSE)). The MIT license does not cover the film, soundtrack or subtitles; see [NOTICE](NOTICE).

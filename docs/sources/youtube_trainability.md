# Youtube Trainability

Wire source: `youtube_trainability`. Helper: `client.youtube.licenseCheck`. Required input: `video_id`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_trainability).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_trainability.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.licenseCheck({"video_id": "dQw4w9WgXcQ"});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |


For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).
The wire source is `youtube_trainability`; the SDK helper is named license check because the result classifies a Creative Commons label. It does not read separate training permissions or grant rights.

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "youtube_trainability",
  "status": "done",
  "results": [
    {
      "videoId": "dQw4w9WgXcQ",
      "kind": "youtube#videoTrainability",
      "etag": "dQw4w9WgXcQ",
      "permitted": [
        "none"
      ]
    }
  ],
  "usage": {
    "credits": 0.01
  },
  "created_at": "2026-09-16T07:45:48.691Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

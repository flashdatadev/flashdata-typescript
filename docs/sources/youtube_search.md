# Youtube Search

Wire source: `youtube_search`. Helper: `client.youtube.search`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_search).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_search.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.search({"query": "python", "max_results": 20});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `max_results` | integer | 20 |  Range: 1–20. |
| `filters` | object | Omitted; provider/server behavior |  |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "youtube_search",
  "status": "done",
  "results": [
    {
      "results": [
        {
          "videoId": "K5KVEU3aaeQ",
          "title": "Python Full Course for Beginners",
          "channel": "Programming with Mosh",
          "channelId": "UCWv7vMbMWH4-V0ZXdmDpPBA",
          "channelUrl": "https://www.youtube.com/channel/UCWv7vMbMWH4-V0ZXdmDpPBA",
          "duration": 7341,
          "durationString": "2:02:21",
          "viewCount": 7565956,
          "uploadDate": null,
          "description": "Master Python from scratch No fluff\u2014just clear, practical coding skills to kickstart your journey! Want to dive deeper? - Check\u00a0...",
          "thumbnails": [
            {
              "url": "https://i.ytimg.com/vi/K5KVEU3aaeQ/hq720.jpg?sqp=-oaymwEcCOgCEMoBSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLAXbPvWkQhvRSOYWD6mp9EVbfWSYg",
              "width": 360,
              "height": 202
            },
            {
              "url": "https://i.ytimg.com/vi/K5KVEU3aaeQ/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLAbeaIhlZJzT49VmWFTFrL3rCq--Q",
              "width": 720,
              "height": 404
            }
          ]
        }
      ],
      "totalResults": 20,
      "query": "python"
    }
  ],
  "usage": {
    "credits": 0.01
  },
  "created_at": "2026-09-16T07:41:45.295Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

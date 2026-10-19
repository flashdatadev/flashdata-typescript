# Google Videos

Wire source: `google_videos`. Helper: `client.google.videos`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/google_videos).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/google_videos.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.videos({"query": "me at the zoo", "gl": "us", "hl": "en", "num": 10, "page": 1});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `gl` | string | Omitted; provider/server behavior | Country code. Set explicitly when needed; omitted values use the search provider’s behavior. Must match the documented format. |
| `hl` | string | Omitted; provider/server behavior | Interface language. Set explicitly when needed; omitted values use the search provider’s behavior. Must match the documented format. |
| `location` | string | Omitted; provider/server behavior |  |
| `num` | integer | Omitted; provider/server behavior | Requested result count. Actual count varies by query and search type; no fixed value is added when omitted. Range: 1–100. |
| `page` | integer | Omitted; provider/server behavior | Requested page. Set explicitly for pagination; each page is a separate query. Range: 1–100. |
| `tbs` | string | Omitted; provider/server behavior |  |
| `autocorrect` | boolean | Omitted; provider/server behavior |  |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "google_videos",
  "status": "done",
  "results": [
    {
      "searchParameters": {
        "q": "me at the zoo",
        "gl": "us",
        "hl": "en",
        "type": "videos",
        "num": 10,
        "page": 1,
        "engine": "google"
      },
      "videos": [
        {
          "title": "Me at the zoo",
          "link": "https://www.youtube.com/watch?v=jNQXAC9IVRw&vl=en",
          "snippet": "Microplastics are accumulating in human brains at an alarming rate https://www.youtube.com/watch?v=0PT5c1z3LL8 \u201cNanoplastics and Human ...",
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNoybJBMfqr7vwH-saySvflZreMzBKZDBjW_zQMrY81E-xQZBBMzVuRw&s",
          "videoUrl": "https://encrypted-vtbn0.gstatic.com/video?q=tbn:ANd9GcS8uZHJMduuLjzsxqOtyhx8VWeRlui2Fo0sUg",
          "duration": "0:19",
          "source": "YouTube",
          "channel": "jawed",
          "date": "Apr 23, 2005",
          "position": 1
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.02
  },
  "created_at": "2026-09-16T07:41:45.419Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

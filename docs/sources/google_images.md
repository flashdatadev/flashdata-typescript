# Google Images

Wire source: `google_images`. Helper: `client.google.images`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/google_images).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/google_images.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.images({"query": "tokyo skyline", "gl": "us", "hl": "en", "num": 50, "page": 1});
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
  "source": "google_images",
  "status": "done",
  "results": [
    {
      "searchParameters": {
        "q": "tokyo skyline",
        "gl": "us",
        "hl": "en",
        "type": "images",
        "num": 100,
        "page": 1,
        "engine": "google"
      },
      "images": [
        {
          "title": "Tokyo Skyline: where to enjoy the best views - WarmCheapTrips",
          "imageUrl": "https://warmcheaptrips.com/wp-content/uploads/2024/11/Tokyo-Skyline.jpg",
          "imageWidth": 1945,
          "imageHeight": 1459,
          "thumbnailUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLQIAqps-rU9vbSrchB9MbLVMr9p7IvzeeCYqcN_hv3g&s=10",
          "thumbnailWidth": 638,
          "thumbnailHeight": 480,
          "source": "WarmCheapTrips",
          "domain": "warmcheaptrips.com",
          "link": "https://warmcheaptrips.com/en/tokyo-skyline-best-views/",
          "googleUrl": "https://www.google.com/imgres?imgurl=https%3A%2F%2Fwarmcheaptrips.com%2Fwp-content%2Fuploads%2F2024%2F11%2FTokyo-Skyline.jpg&tbnid=jLiJTfR5YhGSnM&imgrefurl=https%3A%2F%2Fwarmcheaptrips.com%2Fen%2Ftokyo-skyline-best-views%2F&docid=pz0xCtPT4NmkPM&w=1945&h=1459",
          "position": 1
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.02
  },
  "created_at": "2026-09-16T07:41:43.800Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

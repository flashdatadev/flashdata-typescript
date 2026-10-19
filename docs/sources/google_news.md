# Google News

Wire source: `google_news`. Helper: `client.google.news`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/google_news).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/google_news.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.news({"query": "renewable energy", "gl": "us", "hl": "en", "num": 10, "page": 1});
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
  "source": "google_news",
  "status": "done",
  "results": [
    {
      "searchParameters": {
        "q": "renewable energy",
        "gl": "us",
        "hl": "en",
        "type": "news",
        "num": 10,
        "page": 1,
        "allowSuggested": true,
        "engine": "google"
      },
      "news": [
        {
          "title": "Molder and Hatcher discuss positions on renewable energy, nuclear power ahead of November election",
          "link": "https://tennesseelookout.com/2026/09/14/molder-and-hatcher-discuss-positions-on-renewable-energy-nuclear-power-ahead-of-november-election/",
          "snippet": "District 5 candidates Charlie Hatcher, a Republican farmer and former Tennessee agriculture commissioner, and Chaz Molder, the Democratic...",
          "date": "1 day ago",
          "source": "Tennessee Lookout",
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyHCzprpdTHLlK8zYoWi3-Xyuoj_YpfKHcxb3VhP2GPBH5xvFAhl0fRQA&usqp=CAI&s"
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.02
  },
  "created_at": "2026-09-16T07:38:04.737Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

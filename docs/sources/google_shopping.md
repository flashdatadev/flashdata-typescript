# Google Shopping

Wire source: `google_shopping`. Helper: `client.google.shopping`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/google_shopping).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/google_shopping.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.shopping({"query": "mechanical keyboard", "gl": "us", "hl": "en", "num": 10, "page": 1});
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
  "source": "google_shopping",
  "status": "done",
  "results": [
    {
      "searchParameters": {
        "q": "mechanical keyboard",
        "gl": "us",
        "hl": "en",
        "type": "shopping",
        "num": 40,
        "page": 1,
        "engine": "google"
      },
      "shopping": [
        {
          "title": "Keychron V1 Wired Custom Mechanical Keyboard barebone version 75% layout QMK/via programmable macro with Hot-swappable suppo",
          "source": "Keychron.com",
          "link": "https://www.google.com/search?ibp=oshop&q=mechanical+keyboard&prds=localAnnotatedOfferId:1,catalogid:4646494883927026855,pvo:2,pvt:hg,rds:PC_6027158597472037202%7CPROD_PC_6027158597472037202&gl=us&udm=28&pvorigin=2",
          "price": "$69.99",
          "imageUrl": "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTmFH2V5iUcuY9yRuK1-vTVeyU3DJLVq_MomMlGTQnfiyxxBIB9ISDiXNuhtyWOBoDJNM1rCNvc07jUU4l1bilumAMkF8aHZ07__xTWQQw1dPRD8xAGCvk4",
          "rating": 4.8,
          "ratingCount": 336,
          "productId": "4646494883927026855",
          "position": 1
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.02
  },
  "created_at": "2026-09-16T07:41:40.048Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

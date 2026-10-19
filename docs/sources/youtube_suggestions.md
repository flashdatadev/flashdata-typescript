# Youtube Suggestions

Wire source: `youtube_suggestions`. Helper: `client.youtube.suggestions`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_suggestions).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_suggestions.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.suggestions({"query": "python", "language": "en", "region": "us"});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `language` | string | "en" |  Must match the documented format. |
| `region` | string | "US" |  Must match the documented format. |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "youtube_suggestions",
  "status": "done",
  "results": [
    [
      "python for beginners",
      "python hunting everglades",
      "python",
      "python full course",
      "python funk",
      "python got7",
      "python commands",
      "python cowboy",
      "python tutorial",
      "python projects",
      "python coding",
      "python course",
      "python snake",
      "python basics"
    ]
  ],
  "usage": {
    "credits": 0.01
  },
  "created_at": "2026-09-16T07:41:47.147Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

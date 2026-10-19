# Google Search

Wire source: `google_search`. Helper: `client.google.search`. Required input: `query`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/google_search).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/google_search.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.google.search({"query": "openai", "gl": "us", "hl": "en", "num": 10, "page": 1});
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
  "source": "google_search",
  "status": "done",
  "results": [
    {
      "searchParameters": {
        "q": "openai",
        "gl": "us",
        "hl": "en",
        "type": "search",
        "num": 10,
        "page": 1,
        "engine": "google"
      },
      "organic": [
        {
          "title": "OpenAI | Research & Deployment",
          "link": "https://openai.com/",
          "snippet": "We believe our research will eventually lead to artificial general intelligence, a system that can solve human-level problems.",
          "position": 1
        },
        {
          "title": "OpenAI",
          "link": "https://en.wikipedia.org/wiki/OpenAI",
          "snippet": "OpenAI is an American artificial intelligence (AI) public benefit corporation (PBC) headquartered in San Francisco. It develops proprietary generative AI models ...",
          "position": 2
        },
        {
          "title": "OpenAI",
          "link": "https://x.com/OpenAI",
          "snippet": "OpenAI's mission is to ensure that artificial general intelligence benefits all of humanity. can develop research, build financial models, and create ...",
          "position": 3
        },
        {
          "title": "OpenAI",
          "link": "https://www.linkedin.com/company/openai",
          "snippet": "OpenAI is an AI research and deployment company dedicated to ensuring that general-purpose artificial intelligence benefits all of humanity.",
          "position": 4
        },
        {
          "title": "r/OpenAI",
          "link": "https://www.reddit.com/r/OpenAI/",
          "snippet": "OpenAI is an AI research and deployment company. OpenAI&#39;s mission is to create safe and powerful AI that benefits all of humanity. OpenAI's ...",
          "position": 5
        }
      ],
      "peopleAlsoAsk": [
        {
          "question": "Is OpenAI created by Elon Musk?"
        },
        {
          "question": "Why are people leaving ChatGPT?"
        },
        {
          "question": "Is OpenAI the same as ChatGPT?"
        },
        {
          "question": "Why is OpenAI in trouble?"
        }
      ],
      "relatedSearches": [
        {
          "query": "OpenAI login"
        },
        {
          "query": "OpenAI chat"
        },
        {
          "query": "OpenAI ChatGPT"
        },
        {
          "query": "OpenAI - wikipedia"
        },
        {
          "query": "OpenAI API"
        },
        {
          "query": "OpenAI app"
        },
        {
          "query": "OpenAI download"
        },
        {
          "query": "OpenAI video"
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.02
  },
  "created_at": "2026-09-16T07:41:40.043Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

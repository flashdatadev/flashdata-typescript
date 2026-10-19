# Youtube Download

Wire source: `youtube_download`. Helper: `client.youtube.download`. Required input: `video_id`.
Modes: async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_download).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_download.mjs
```

```javascript
import { readFile } from "node:fs/promises";
import { FlashData } from "../dist/index.js";
const storage = JSON.parse(await readFile(process.env.FLASHDATA_STORAGE_FILE, "utf8"));
const client = new FlashData();
const receipt = await client.youtube.download({video_id: "dQw4w9WgXcQ", storage, video_quality: "<=720"});
console.log(receipt.id);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `download_type` | string | "audio_video" |  Values: `audio_video`, `video`, `audio` |
| `video_quality` | string | "<=720" |  Values: `best`, `worst`, `<=144`, `==144`, `>=144`, `<=360`, `==360`, `>=360`, `<=480`, `==480`, `>=480`, `<=720`, `==720`, `>=720`, `<=1080`, `==1080`, `>=1080`, `<=1440`, `==1440`, `>=1440`, `<=2160`, `==2160`, `>=2160`, `<=4320`, `==4320`, `>=4320` |
| `fps` | string | Omitted; provider/server behavior |  Must match the documented format. |
| `audio_language` | string | "default" |  Values: `default`, `original` |
| `audio_quality` | string | "best" |  Values: `best`, `320`, `256`, `192`, `128` |
| `yt_dlp_format` | string | Omitted; provider/server behavior |  |
| `upload_metadata` | boolean | false |  |
| `output_format` | string | "mp4" |  Values: `mp4`, `webm`, `mkv`, `m4a`, `mp3`, `opus` |
| `start_at` | string | Omitted; provider/server behavior |  Must match the documented format. |
| `end_at` | string | Omitted; provider/server behavior |  Must match the documented format. |
| `storage` | object, required | none | [Customer storage configuration](../storage.md). |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).
Download defaults to async. Persist the receipt ID before waiting or reading results. Format combinations and destination credentials are validated by the server.

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "id": "job_example123",
  "source": "youtube_download",
  "status": "pending",
  "usage": {
    "credits": 0
  },
  "created_at": "2026-10-19T00:00:00Z",
  "links": [
    {
      "rel": "self",
      "href": "https://api.flashdata.dev/v2/jobs/job_example123",
      "method": "GET"
    },
    {
      "rel": "results",
      "href": "https://api.flashdata.dev/v2/jobs/job_example123/results",
      "method": "GET"
    }
  ]
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

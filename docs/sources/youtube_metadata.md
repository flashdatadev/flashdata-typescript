# YouTube metadata

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs/sources/youtube_metadata)

Enrich video IDs with title, channel, duration, upload date, counts, and available transcript languages. Disable formats and chapters when they are unnecessary to reduce payload size.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.metadata({
  video_id: 'dQw4w9WgXcQ',
  include_formats: false,
  include_chapters: false,
});
for (const video of response.results)
  console.log(video.title, video.duration, video.transcriptLanguages ?? []);
```

Run `node examples/youtube_metadata.mjs dQw4w9WgXcQ --output artifacts/youtube_metadata.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`video_id` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

JSON is the default. Pass `{ accept: 'text/plain' }` in the second argument for text.
Realtime results also support `{ respondWith: 'markdown' }`. For background work,
choose Markdown when reading the completed result. See [response formats](../response-formats.md).

| Option             | Type / constraints | Default |
| ------------------ | ------------------ | ------- |
| `include_formats`  | boolean            | true    |
| `include_chapters` | boolean            | true    |

## Use at scale

Use [bulk jobs](../bulk.md) for a file of video IDs with the same options. All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

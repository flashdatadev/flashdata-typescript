# Google videos

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs/sources/google_videos)

Find video pages from across the web. Entries may include `title`, `link`, `videoUrl`, `duration`, `channel`, and `source`; `link` and `videoUrl` can differ.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.videos({
  query: 'espresso tutorial',
  num: 5,
  gl: 'us',
  hl: 'en',
});
for (const payload of response.results) {
  for (const item of payload.videos ?? [])
    console.log(item.title, item.link ?? item.videoId ?? item.address);
}
```

Run `node examples/google_videos.mjs espresso tutorial --output artifacts/google_videos.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`query` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

JSON is the default. Pass `{ accept: 'text/plain' }` in the second argument for text.
Realtime results also support `{ respondWith: 'markdown' }`. For background work,
choose Markdown when reading the completed result. See [response formats](../response-formats.md).

| Option        | Type / constraints                | Default                    |
| ------------- | --------------------------------- | -------------------------- |
| `gl`          | string; pattern `^[A-Za-z]{2}$`   | service default / optional |
| `hl`          | string; pattern `^[A-Za-z0-9-]+$` | service default / optional |
| `location`    | string                            | service default / optional |
| `num`         | integer; 1–100                    | service default / optional |
| `page`        | integer; 1–100                    | service default / optional |
| `tbs`         | string                            | service default / optional |
| `autocorrect` | boolean                           | service default / optional |

## Use at scale

Use [bounded Google pagination](../pagination.md) for multiple pages. Each page is a separately charged request. All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

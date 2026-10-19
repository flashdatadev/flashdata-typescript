# Google images

Discover visual assets and their source pages. `imageUrl` is the image resource, `thumbnailUrl` is the preview, and `link` is the source page. These URLs do not grant reuse rights.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.images({ query: 'coffee beans', num: 5, gl: 'us', hl: 'en' });
for (const payload of response.results) {
  for (const item of payload.images ?? [])
    console.log(item.title, item.link ?? item.videoId ?? item.address);
}
```

Run `node examples/google_images.mjs coffee beans --output artifacts/google_images.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`query` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

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

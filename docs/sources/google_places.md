# Google places

Discover local businesses using `title`, `address`, `category`, `rating`, and optional coordinates. Website and location fields may be absent.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.places({
  query: 'coffee shops in Seattle',
  num: 5,
  gl: 'us',
  hl: 'en',
});
for (const payload of response.results) {
  for (const item of payload.places ?? [])
    console.log(item.title, item.link ?? item.videoId ?? item.address);
}
```

Run `node examples/google_places.mjs coffee shops in Seattle --output artifacts/google_places.json` from the checkout. Use `--help` for options. The command consumes credits.

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

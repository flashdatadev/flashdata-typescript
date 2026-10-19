# YouTube suggestions

Expand query ideas using autocomplete. Each item of the outer `results` array is a list of suggestion strings, rather than an object with a `suggestions` property.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.suggestions({
  query: 'python',
  language: 'en',
  region: 'US',
});
for (const suggestions of response.results) for (const text of suggestions) console.log(text);
```

Run `node examples/youtube_suggestions.mjs python --output artifacts/youtube_suggestions.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`query` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

| Option     | Type / constraints                | Default |
| ---------- | --------------------------------- | ------- |
| `language` | string; pattern `^[A-Za-z0-9-]+$` | "en"    |
| `region`   | string; pattern `^[A-Za-z]{2}$`   | "US"    |

## Use at scale

All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

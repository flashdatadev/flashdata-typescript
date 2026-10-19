# YouTube extended search

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs/sources/youtube_search_extended)

Collect a larger discovery set in one request. Request 1–700 entities with `max_results`; fewer may be available. Use an explicit bound for predictable workloads.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.searchExtended({ query: 'python tutorial', max_results: 5 });
for (const payload of response.results) {
  for (const item of payload.results ?? [])
    console.log(item.title, item.link ?? item.videoId ?? item.address);
}
```

Run `node examples/youtube_search_extended.mjs python tutorial --output artifacts/youtube_search_extended.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`query` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

| Option        | Type / constraints | Default                    |
| ------------- | ------------------ | -------------------------- |
| `max_results` | integer; 1–700     | 20                         |
| `filters`     | object / null      | service default / optional |

### Search filters

`filters` is a dictionary. Supported fields:

| Field              | Allowed values                                               |
| ------------------ | ------------------------------------------------------------ |
| `360`              | boolean                                                      |
| `duration`         | `<4`, `4-20`, `>20`                                          |
| `sort_by`          | `rating`, `relevance`, `view_count`, `upload_date`           |
| `type`             | `video`, `channel`, `playlist`, `movie`                      |
| `upload_date`      | `today`, `last_hour`, `this_week`, `this_month`, `this_year` |
| `3d`               | boolean                                                      |
| `4k`               | boolean                                                      |
| `creative_commons` | boolean                                                      |
| `hd`               | boolean                                                      |
| `hdr`              | boolean                                                      |
| `live`             | boolean                                                      |
| `location`         | boolean                                                      |
| `purchased`        | boolean                                                      |
| `subtitles`        | boolean                                                      |
| `vr180`            | boolean                                                      |

For example, `filters: {type: 'video', duration: '<4', hd: true}`. Unsupported filters are rejected locally.

## Use at scale

All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

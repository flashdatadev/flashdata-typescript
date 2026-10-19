# Bounded Google pagination

Each fetched page is a separate paid query, including an empty last page. `google.pages`
requires an explicit budget, yields responses lazily, and stops after an empty hit list.
Breaking iteration prevents future page submissions.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
for await (const response of client.google.pages('google_search', 'coffee', {
  maxPages: 2,
  params: { num: 5, gl: 'us', hl: 'en' },
})) {
  for (const payload of response.results) {
    for (const hit of payload.organic ?? []) console.log(hit.title, hit.link);
  }
}
```

`source` is one of the six Google source names. `maxPages` is 1–100; `startPage` defaults
to 1 and the final page must be at most 100. Put source fields in `params`; use `startPage`
instead of `params.page`. For one page, call the source helper with `page` in its input.
Request options accept `signal` and `timeoutMs` alongside the page budget.

The `search_to_csv.mjs` example deduplicates links and exports page, position, title, link,
and snippet. Positions are upstream values; the SDK does not infer global ranks.
YouTube search uses `max_results`, not Google's `page` parameter. Extended search requests
up to 700 entities in one call, subject to availability. Bulk listings instead use free
cursor pagination through `bulk.list` or bounded `bulk.iterJobs`.

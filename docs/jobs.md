# Background jobs and mixed batches

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

## Submit, save, wait, retrieve

By default, stored background results have `id`, `source`, `status`, `results`, `completed_at`, and
`expires_at`. Data results also include `usage`; media delivery receipts may omit it.
Unlike realtime responses, stored results do not include a guaranteed `created_at`.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const receipt = await client.google.search({ query: 'coffee', num: 3 }, { mode: 'async' });
console.log('Save this ID:', receipt.id);
await client.jobs.wait(receipt.id, { timeoutMs: 300000, pollIntervalMs: 3000 });
const result = await client.jobs.result(receipt.id);
for (const payload of result.results) {
  for (const hit of payload.organic ?? []) console.log(hit.title, hit.link);
}
```

Jobs progress through `pending`, `processing`, `completed`, or `failed`. `get(id)` unwraps
the HTTP response's `job` property. `wait(id)` returns the completed record or raises
`JobFailedError` with `.job`. A polling timeout preserves `.jobId`; resume the same ID.

By default, `result(id)` retrieves an object with `id`, `source`, `status`, `results`, `usage`,
`completed_at`, and `expires_at`. The payloads in `results` follow the source field paths
used in realtime calls. The helper validates signed storage redirects against authenticated
discovery and fetches storage without an API key. Export results within the 24-hour
retention window. HTTP 409 means not ready; 410 means expired.

## Submit a mixed batch

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const batch = await client.queries.batch([
  { source: 'google_search', query: 'coffee', params: { num: 3 } },
  { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', params: { include_formats: false } },
]);
for (const item of batch.queries) console.log(item.source, item.id);
```

The SDK validates every input before sending the request. The server prevalidates inputs,
checks plan limits and admits the batch; malformed batches can fail as a whole. A successful
response contains a receipt for each input. Jobs can later fail independently, so save all
IDs and check final states. Submission charges are in `total_credits` and `usage.credits`.
Read `account.limits()` for the current `batchSize`.

Generic `queries.realtime` and `queries.submit` accept wire objects: `source` and the main
input at the top level, source options inside `params`, and `callback_url` at the top level.
Source helpers put execution mode and callback URL in their second options argument.

## Callbacks and recovery

Background queries accept a public HTTPS `callback_url` on port 443. Delivery may be
repeated or fail; deduplicate by delivery/job identifiers and read the job API for final
state. Saving the job ID is still necessary. The SDK does not start a webhook server.

There is no standard-job list or cancellation endpoint for API keys. Keep your own request
metadata and IDs. If submission loses its response, do not blindly retry; see
[unknown submissions and recovery](errors.md). The runnable background example supports
`--job-id` to resume without creating another query.

## Response formats

Submission, batch and status methods accept `{ accept: 'text/plain' }` for text.
Keep JSON receipts when saving IDs programmatically. Choose Markdown when retrieving
completed content with `jobs.result(id, { respondWith: 'markdown' })`. Format choices
apply to each call and are not saved with the job. See [response formats](response-formats.md).

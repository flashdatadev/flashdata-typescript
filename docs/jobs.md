# Background queries, batches and jobs

Use realtime for a response in the same HTTP request. Submit a background query when
your application can retain the returned ID and read it later. Download always uses
background submission. Batch submits multiple background queries in one request;
every accepted query is billed independently and your plan's batch/pending limits apply.

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const receipt = await client.queries.submit({source: "youtube_metadata", video_id: "dQw4w9WgXcQ"});
console.log(receipt.id); // Persist immediately.
const job = await client.jobs.wait(receipt.id, {timeoutMs: 300000, pollIntervalMs: 2000});
console.log(await client.jobs.result(job.id));
```

Use `client.queries.batch([query1, query2])` for a mixed batch and `client.jobs.get(id)`
for a single status read. Pass a request `signal` to cancel local waits and reads.

`wait` is explicit, bounded polling of the same ID. It never resubmits the query.
Completion returns the job; failed jobs raise `JobFailedError`. A polling timeout keeps
the ID in the exception so you can resume reading it. Stopping a local wait does not
cancel remote work. Standard jobs expose no cancellation endpoint in the public contract.

Result retrieval authenticates with Management, validates its 302 location against the
current access response's `result_origin`, then fetches storage with no API credential.
Storage redirects are rejected. Results are available for 24 hours after completion;
an expired result returns HTTP 410. Call `jobs.result` again to obtain a fresh signed
URL while the result still exists. Persist results in your own storage when needed.

Callbacks are optional top-level `callback_url` values in async queries, including each
batch member. Use a public HTTPS endpoint on port 443. A callback can be duplicated or
arrive after your application restarts; correlate by the returned job ID. For callback
payloads and server behavior see [the API guide](https://flashdata.dev/docs/guides/async-batch).

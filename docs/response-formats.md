# JSON, plain text and Markdown

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

JSON objects remain the default. Pass `accept: 'text/plain'` to receive a string,
or `respondWith: 'markdown'` to select Markdown content. Put these options in the
second argument, alongside `signal` or `timeoutMs`, rather than in source inputs or `params`.
`accept` sets HTTP `Accept`; `respondWith` sets `X-Respond-With`.

For realtime queries and completed results:

| `accept`                       | `respondWith` | Return value                                           |
| ------------------------------ | ------------- | ------------------------------------------------------ |
| `'application/json'` (default) | Omitted       | Object with the original `results`                     |
| `'text/plain'`                 | Omitted       | String with the original fields as indented text       |
| `'application/json'` (default) | `'markdown'`  | Object with Markdown in `content`, replacing `results` |
| `'text/plain'`                 | `'markdown'`  | String with metadata followed by Markdown              |

Markdown retains source links, transcript timestamps and response metadata.
The API formats the retrieved content without generating a summary.

## Search and transcripts

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const search = await client.google.search(
  { query: 'vector databases' },
  { respondWith: 'markdown' },
);
console.log(search.content);
const transcript = await client.youtube.transcript(
  { video_id: 'dQw4w9WgXcQ', language: 'en', auto: false },
  { accept: 'text/plain', respondWith: 'markdown' },
);
console.log(transcript);
```

Each call above makes a separate query. All realtime source helpers and
`queries.realtime()` support both options. Pass only `accept: 'text/plain'` to
receive the original fields as text.

## Background jobs and batches

`queries.submit()`, `queries.batch()`, background source helpers and `jobs.get()`
support `accept`. Their text responses contain receipts or status fields.
Keep the default JSON receipt when your application needs to save job IDs.

Choose Markdown when retrieving completed results with `jobs.result()`:

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const receipt = await client.google.search({ query: 'vector databases' }, { mode: 'async' });
console.log('Save this ID:', receipt.id);
await client.jobs.wait(receipt.id);
console.log(await client.jobs.get(receipt.id, { accept: 'text/plain' }));
console.log(
  await client.jobs.result(receipt.id, { accept: 'text/plain', respondWith: 'markdown' }),
);
```

Retrieving a completed result in another format does not run another query or charge
query credits. Choose the format on each call; preferences are not saved with the job.
`jobs.get()` unwraps the `job` object for JSON; text contains the full status response.
`jobs.wait()` continues to return a job object.

Download receipts support `accept`. Completed download manifests also support Markdown
through `jobs.result()`. Media files, bulk exports, account methods and public discovery
keep their existing formats.

## TypeScript and errors

Return types follow the selected format: the original response type, `MarkdownQueryResult`,
or `string`. A variable format choice produces the corresponding union. For reusable options:

```typescript
import { FlashData, type ContentOptions } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const options = { accept: 'text/plain', respondWith: 'markdown' } satisfies ContentOptions;
const text: string = await client.google.search({ query: 'vector databases' }, options);
console.log(text);
```

The SDK accepts `'application/json'` and `'text/plain'` for `accept`, and `'markdown'`
or an omitted `respondWith`. It rejects incompatible options before sending a request.
Use `respondWith` only on realtime queries and completed results; submission and status
methods reject it. API errors still raise `APIError` when text was requested.

ESM and CommonJS use the same options. See the
[API response-format guide](https://flashdata.dev/docs/guides/response-formats) for
HTTP requests and response bodies.

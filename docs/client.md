# Client configuration, timeouts and cancellation

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

## Configure API keys explicitly

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({
  apiKey: process.env.FLASHDATA_API_KEY,
  timeoutMs: 120000,
  maxResponseBytes: 64 * 1024 * 1024,
  maxLineBytes: 16 * 1024 * 1024,
});
const response = await client.google.search({ query: 'coffee' }, { timeoutMs: 60000 });
console.log(response.usage.credits);
```

`apiKey` accepts a string. Omitting it or passing `undefined` uses `FLASHDATA_API_KEY`
as a convenience; explicit strings take precedence. Public discovery works with
`apiKey: ''`. Authenticated endpoints reject a missing key before sending a request.
The SDK does not load `.env` files and never writes credentials to files.

## Deadlines and cancellation

`timeoutMs` is a positive integer in milliseconds (up to 2147483647), defaulting to 120000. It covers each HTTP request and its body read. Result retrieval has separate
API, initial discovery, and storage HTTP phases. A source-method override is its second
argument; source parameters remain in the first input object.

```javascript
import { FlashData, RequestAbortedError } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const controller = new AbortController();
controller.abort();
try {
  await client.account.balance({ signal: controller.signal });
} catch (error) {
  if (!(error instanceof RequestAbortedError)) throw error;
}
```

A signal already aborted before submission raises `RequestAbortedError` without sending
anything. A mutation interrupted after dispatch raises `SubmissionUnknownError`, because
the server may have accepted it. Aborting a read or local wait never cancels accepted jobs.
Polling cancellation preserves `jobId`. `jobs.wait` and `bulk.wait` use `timeoutMs` for the
whole polling period; their `pollIntervalMs` sets the delay between status reads.

## Fetch implementations and connection ownership

The client uses Node's native `fetch` by default. Reuse one client for a workload.
Native fetch owns its shared connection pool; the SDK does not expose a separate close
method. If your application injects a fetch implementation through `fetch` or
`storageFetch`, it owns any custom connection pools and should close them itself.

Inject configured fetch functions for custom proxy, certificate, or test behavior. They
must honor the provided signal, manual redirect mode and credential handling. API and
storage calls use separate request headers; the key is never passed to signed storage.
The authenticated storage origin is cached for the client's lifetime, avoiding an extra
account read for every result part. Create a new client if that origin changes.

`dataURL` and `managementURL` accept HTTPS origins, or loopback HTTP for local development.
Do not include `/v1`, `/v2`, query strings or embedded credentials in them. These are
explicit destinations for API credentials. `examples/offline.mjs` shows fetch injection.

## Response limits and concurrency

`maxResponseBytes` defaults to 64 MiB and applies after HTTP content decoding and to a
decompressed bulk part. `maxLineBytes` defaults to 16 MiB per NDJSON row. A bulk iterator
buffers one bounded part at a time, rather than a whole dataset. Increase bounds when
your expected metadata/transcript size requires it; violations raise `ResponseTooLargeError`.

Use bounded concurrency, as in `examples/concurrent_search.mjs`. Plan ceilings are shared
across all account keys and do not describe currently free worker slots. Source defaults
are applied by the service; omitted parameters are not silently filled by the SDK.

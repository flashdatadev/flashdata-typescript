# Errors and recovery

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

All SDK exceptions inherit from `FlashDataError` and expose a meaningful `name`.

| Exception                | Meaning and next step                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| `ValidationError`        | Invalid local input; no request was sent. Fix the indicated field.            |
| `APIError`               | Non-success HTTP response from API or storage. Inspect structured attributes. |
| `RequestTimeoutError`    | A read/upload exceeded its network deadline. Keep existing job IDs.           |
| `RequestAbortedError`    | Local cancellation. Polling errors preserve `jobId`.                          |
| `ConnectionError`        | Read/upload connection failed. Check connectivity and existing task state.    |
| `SubmissionUnknownError` | A mutation lost its response; it may have taken effect. Reconcile first.      |
| `PollingTimeoutError`    | Polling deadline reached; continue reading the same `jobId`.                  |
| `JobFailedError`         | A job failed or bulk was cancelled. Inspect `job`.                            |
| `JobPausedError`         | Bulk needs action. Inspect pause state before deciding how to resume.         |
| `ProtocolError`          | Malformed JSON/gzip/UTF-8, invalid envelope, or unsafe signed redirect.       |
| `ResponseTooLargeError`  | Response/decompressed part/row exceeded configured bounds.                    |

```javascript
import { APIError, FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
try {
  await client.youtube.captions({ video_id: 'dQw4w9WgXcQ', language: 'en', auto: false });
} catch (error) {
  if (!(error instanceof APIError)) throw error;
  console.error(error.statusCode, error.code, error.requestId, error.retryAfter, error.fieldErrors);
}
```

`APIError.body` retains parsed JSON with known credential fields redacted. Error text
removes the API key and request storage secret values. `requestId` comes from a response
header or Management API problem body; `retryAfter` comes from a header or the Data API's
retry hint converted to a string. It can be absent. `fieldErrors` contains Management
validation details when available. Avoid logging raw requests or signed URLs yourself.

Typical statuses are 400/422 for inputs, 401 for authentication, 402 for credit admission,
403 for access, 404 for absent/inaccessible jobs, 409 for state conflict/not-ready results,
410 for expired results, 429 for limits, and 5xx for service errors. Missing caption tracks
are API errors; do not treat every error as transient.

## Unknown submissions and retries

No request is automatically retried. Interrupted POST/PATCH/DELETE requests may have
taken effect and raise `SubmissionUnknownError`. Repeating paid work can create another
charge. Save IDs as soon as receipts arrive. Continue reads with those IDs after polling
or process failure. API keys cannot list standard jobs; if no ID was received, reconcile
through your account or support before repeating the submission. No idempotency behavior
is promised by this SDK.

Read retries can use application-controlled backoff and a bounded budget. Respect
`retryAfter`. Polling stops on network/API errors instead of hiding them behind more calls.
A status read limited by the remaining polling budget raises `PollingTimeoutError` with
the existing job ID. A shorter client network timeout raises `RequestTimeoutError` while
the overall polling budget remains available.
Signals already aborted before dispatch send nothing; cancellation after mutation dispatch
is an unknown outcome. See [configuration](client.md) for examples.

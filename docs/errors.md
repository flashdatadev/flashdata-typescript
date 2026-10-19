# Errors, timeouts and recovery

| Exception | Meaning / next action |
| --- | --- |
| ValidationError | Input/configuration was rejected before a request; correct the indicated field. Values and credentials are not echoed. |
| APIError | HTTP failure with status, code, request ID, retry-after and redacted body. Inspect server details. |
| SubmissionUnknownError | A mutation lost its response; it may already have taken effect or consumed Credits. Inspect Jobs before another submission. |
| RequestTimeoutError | A GET exceeded its network timeout or was cancelled. Read the same existing job/result again when appropriate. |
| ConnectionError | A read/upload network operation failed; keep its existing IDs. |
| ProtocolError | Unexpected JSON/status, untrusted signed origin or unsupported redirect. |
| ResponseTooLargeError | Transferred/decompressed data or a row exceeded configured bounds. |
| PollingTimeoutError | The explicit wait deadline elapsed; the exception retains the job ID. |
| JobFailedError | A standard/bulk job failed or a bulk job was cancelled; the exception contains its job record. |
| JobPausedError | A bulk collection paused and requires explicit action before resume. |

Common HTTP statuses: 401 invalid key; 402 insufficient Credits; 403 source/access
restriction; 409 current job state; 410 expired result; 422 invalid fields; 429 rate/plan
limit; 5xx unavailable service/upstream. A batch may return item-level errors in HTTP 200.
No request is automatically retried, including 429/5xx. Retry-after metadata is exposed
for your application's deliberate policy. A failed output read does not authorize
repeating a paid submission.

`APIError` fields are `statusCode`, `code`, `requestId`, `retryAfter`, `body`.
Request deadlines are milliseconds and cover fetch plus body reading. Pass `signal`
to cancel local requests or waits. Cancelling a paid request cannot roll back admission.
Polling total timeout and individual HTTP timeout are separate budgets.

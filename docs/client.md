# Client configuration and responses

`new FlashData({apiKey, dataURL, managementURL, timeoutMs, maxResponseBytes, fetch, storageFetch})`

The key defaults to `FLASHDATA_API_KEY`. Network timeout defaults to 120000 milliseconds;
the response limit defaults to 64 MiB. Each method accepts request options with an
`AbortSignal` and timeout override; source methods also accept `mode` and `callback_url`.
The package includes ESM and CommonJS entry points and declaration files.

All public wire types are exported. Source convenience methods infer the corresponding
payload and distinguish realtime results from asynchronous job receipts. Provider
fields are optional and may be null. Unknown provider fields are preserved. Payload
autocomplete covers documented example fields; it does not guarantee their presence.
Run API-key code on a server. The client rejects browser construction.

Configured API URLs are HTTPS origins without paths, credentials, query strings or
fragments. Loopback HTTP is supported for local development. Do not append `/v1`, `/v2`
or `/mcp`; the SDK adds the appropriate route. Custom origins receive your API key.

Query methods return the original JSON envelope. Account reads return their original
JSON object. Job and bulk `get`/control methods unwrap the outer `job` field. A failed
HTTP response raises a structured exception. A failed item inside a successful batch
stays in the batch result; inspect every item.

The SDK validates source input shape without injecting catalog defaults. Server-side
admission, provider-specific storage rules, media format compatibility and permissions
remain enforced by FlashData. Public discovery requests omit the API key. Generic query
methods use the checked-in source contract and reject unknown fields until the SDK is
updated for a newer contract.

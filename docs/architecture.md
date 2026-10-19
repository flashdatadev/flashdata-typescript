# SDK architecture

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

`FlashData` delegates to query, Google, YouTube, account, jobs, bulk, and public resources.
Source helpers construct typed wire objects and call `queries`. Source validation uses
checked-in JSON Schemas without injecting billing defaults. The service is authoritative
for admission, provider credentials, source availability and state transitions.

`client.ts` owns authentication, deadlines, response byte limits, signed redirects and
streamed uploads. `common.ts` contains validation, redaction, JSON parsing and safe origins.
`resources.ts` provides resource methods, polling and bounded iterators. `types.ts` preserves
wire names such as `video_id` and `availableCredits`; SDK configuration uses `apiKey` and
`timeoutMs`. Responses preserve additional source fields.

API requests use explicit headers on Data/Management origins. Signed storage receives no
API key or cookies and redirects are manual. The authenticated storage origin is cached
for the client's lifetime. Neither request retries nor submission repetition is implicit.
Native fetch owns its shared connection pools; custom fetch implementations remain owned
by their caller.

Update schemas, types, API snapshots, guides, examples and contract tests together when
the service changes. Keep request validation separate from provider result assumptions.
The default suite executes source examples and documentation with isolated API fixtures;
opt-in live tests verify the production contract. The TypeDoc site is generated locally,
and no workflow publishes packages or documentation.

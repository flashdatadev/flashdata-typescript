# SDK review and validation — 2026-10-20

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

The [Python and TypeScript comparison](sdk-parity.md) records the latest cross-SDK
alignment, matching endpoints, workflow recovery and official-link checks. Offline
evidence below was refreshed after alignment; paid live evidence comes from the earlier
individual review and was not rerun during the comparison.

This review compared the TypeScript implementation with FlashData's current backend,
the source catalogue, live API responses, the reviewed Python SDK, and
[SerpApi's Python SDK at commit 827ebf4](https://github.com/serpapi/serpapi-python/tree/827ebf4886d36dd7b40f294f6857dd2471ac7667).
The SerpApi review covered its client/HTTP layer, result helpers, README, recipes,
configuration, exceptions, documentation, tests, packaging and workflows. It informed
the onboarding, useful result traversal, guides and executable documentation here.
FlashData code is original and follows FlashData's execution, management and bulk APIs.

## Changes from the review

| Area              | Finding and resulting change                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding        | Most examples printed raw JSON. The README now shows useful field paths, background recovery and a complete bulk media download lifecycle.                                                    |
| Authentication    | Implicit environment lookup hid key configuration. Every example now supplies `apiKey`; public discovery explicitly supplies an empty key.                                                    |
| API coverage      | Added all-part bulk row and bounded cursor iterators. All 15 source guides cover every request parameter, defaults, constraints and result paths.                                             |
| Typing            | Optional receipt IDs obstructed valid polling code. IDs are required, realtime helper fields retain their types, downloads are background-only, and bulk inputs have source-specific options. |
| Cancellation      | Aborts could become generic network errors or escape polling. Reads and waits now raise `RequestAbortedError`; waits preserve the ID. Buffered row iteration honors cancellation.             |
| Submission safety | Serialization errors could be confused with lost responses. Invalid JSON now rejects before dispatch. Interrupted mutations remain explicitly ambiguous and are never retried.                |
| Protocol errors   | Corrupt gzip, invalid UTF-8 and malformed envelopes could leak unrelated errors. Bounded readers normalize them and detect invalid parts/cursor loops.                                        |
| Errors            | Management body request IDs, field errors and Data retry hints were not fully exposed. They now populate `APIError` attributes.                                                               |
| Bulk throughput   | Each signed result repeated account discovery. The authenticated storage origin is cached for the client lifetime.                                                                            |
| Examples          | Added CLI inputs/help, JSON/CSV/NDJSON exports, bounded concurrency, resumable jobs, a typed example and a CommonJS example.                                                                  |
| Project quality   | Added formatting, a warning-free local TypeDoc site, executable guides, failure regressions and repeatable independent-package verification.                                                  |

FlashData responses remain ordinary JavaScript objects with FlashData's own envelopes.
SerpApi-specific engines, markdown conversion and archive APIs are not FlashData endpoints.

## Verification

Validated locally on Windows with Node.js 24.19.0 and TypeScript 5.9.3:

- **200 offline checks passed**, with 19 live checks skipped by default. Coverage includes
  all 15 source contracts, bulk controls, native fetch against two loopback origins,
  streamed input upload, signed result isolation, bounded decoding, cancellation and recovery.
- **38 documentation code blocks execute** against source-shaped fixtures. TypeScript
  blocks also compile strictly. Relative links and every source parameter are checked.
- **27 runnable examples** support import safety and help without a key. Source and
  workflow checks verify exports, saved IDs, partial bulk results and resume paths.
- **18 paid/live integration checks passed**: all 14 realtime sources, background jobs,
  a 14-source batch with completed results, metadata bulk upload/start/wait/manifest/rows,
  invalid input counts, listing, draft update/cancel, account/public APIs and error IDs.
- **23 CLI examples passed against production**, including every data source, account,
  discovery, background, batch, bounded concurrency, CSV, bulk NDJSON, CommonJS and typed
  execution. Export files were read back and validated.
- Strict source/example typing and formatting pass. TypeDoc builds with warnings treated
  as errors and produces a navigable local API reference plus guides.
- A local npm archive installs into a separate application. ESM and CommonJS run with
  injected fetch; strict `.mts` and `.cts` NodeNext consumers compile with library checks
  enabled; the installed offline example runs. Archive checks exclude build HTML, tests,
  outputs and credentials, and include runtime, declarations and source-map sources.

Run the same local checks with the development commands in the README and
`npm run verify:package`. Production checks require deliberate opt-in as described in
[contributing](../CONTRIBUTING.md). No key was written into project files or archives.

## Limits of this verification

Media downloads and customer result-storage delivery were tested with simulated requests
and responses. A successful write to a customer bucket requires destination credentials,
which were not supplied. Live pause/resume transitions and external webhook delivery
were not exercised; their request contracts and recovery behavior are covered offline.
Upstream data, caption availability and cloud provider credentials remain service concerns.

CI is configured for Linux and Windows on Node 22 and 24, including documentation and
package verification. Those GitHub matrix runs have not run because this repository is
local. Neither GitHub/npm publication nor hosted documentation deployment occurred.

# Changelog

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Final local release check: verified Node 22.0.0/24, documented consumer TypeScript/Node
type dependencies in English and Chinese, and tested clean ESM/CommonJS consumers with
their own compiler/types and without DOM libraries or SDK checkout type roots.

Cross-SDK review: corrected stored background result types, allowed nullable data-result
storage, validated CLI waiting arguments before submission, preserved structured partial
failures, documented Python/TypeScript parity, and linked every guide to official FlashData pages.

## 1.1.0 — 2026-10-23

- Add per-call `accept` and `respondWith` to realtime helpers and completed results;
  JSON remains the default. Plain-text receipts, batches and status are also supported.
- Preserve precise return types and reject incompatible mode, format and callback options.
- Keep structured errors, cancellation, response limits and signed-storage credential separation.
- Add format examples, English/Chinese README guidance, refreshed OpenAPI and
  API-generated stored-result fixtures for all 15 sources.

Align English/Chinese workflow navigation with all SDKs and the CLI. Bulk examples now reserve exports and recovery records before API calls, sync accepted IDs, preserve orphaned records, check every item status and recover without replay. Add an MP3 audio variant and update the side-by-side comparison.

## 1.0.0

- Fixed polling deadline errors for standard and bulk jobs when status timers fire early.
  Shorter client network timeouts keep their original error type.
- All 15 Google and YouTube sources, source validation and typed requests.
- Realtime queries, background submissions, mixed batches and bounded Google pagination.
- Job readers, signed results and explicit bounded polling.
- Bulk create, streaming file upload, start, pause, resume, update, cancel, progress, manifest and gzip NDJSON parts.
- Account access, balance, pricing, limits, usage and public discovery.
- Documentation, runnable examples, offline tests, packaging and CI configuration.
- Explicit `apiKey` in every example; source guides cover all request fields and result paths.
- Complete bulk download lifecycle in the README, resumable CLI workflows and JSON/CSV/NDJSON exports.
- Required background receipt IDs, source-specific bulk types and strict ESM/CommonJS consumers.
- Separate local cancellation, polling deadlines and interrupted-submission errors.
- Bounded, validated gzip/UTF-8 result readers; all-part and cursor iterators; cached signed-storage discovery.
- Public discovery without a key, structured error details and local JSON validation before dispatch.
- Executable documentation, a local TypeDoc site and an explicit paid integration suite.

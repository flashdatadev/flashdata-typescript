# Python and TypeScript SDK comparison

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Both local 0.1.0 release candidates implement the same FlashData developer APIs. The
comparison checks API contracts, resource methods, source guides, runnable examples,
bulk recovery, packaging and official website links. Language conventions remain idiomatic.

## API and behavior coverage

| Capability             | Python                                                                 | TypeScript / JavaScript                             |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| Developer endpoints    | 24 operations; identical OpenAPI snapshot                              | Same 24 operations and snapshot                     |
| Sources and validation | 15 source schemas                                                      | Identical 15 schemas and source contracts           |
| Realtime               | 14 data sources                                                        | Same 14 sources                                     |
| Background and batch   | All 15 sources                                                         | All 15 sources                                      |
| Google helpers         | Six sources plus bounded `pages`                                       | Same seven methods                                  |
| YouTube helpers        | Nine helpers; `search_extended`, `license_check`                       | Same nine; `searchExtended`, `licenseCheck`         |
| Account                | Access, balance, pricing, limits, usage                                | Same five methods                                   |
| Public discovery       | Sources, plans, health, status; explicit empty key                     | Same four methods and key behavior                  |
| Standard jobs          | Get, wait, result                                                      | Same three methods; no API-key list/cancel endpoint |
| Bulk                   | All 15 lifecycle, listing and result methods                           | Same 15 methods                                     |
| Bulk sources           | Metadata, transcripts, captions, license labels, downloads             | Same five sources                                   |
| Bulk recovery          | Persist job, resume ID, stop on pause/failure, export partial outcomes | Same behavior                                       |
| Result bounds          | 64 MiB response/decompressed part; 16 MiB row                          | Same defaults                                       |
| Submission safety      | No automatic retries; lost mutation response is ambiguous              | Same guarantees                                     |
| Signed storage         | Authenticated origin, isolated credentials, bounded reads              | Same guarantees                                     |
| Retention and upload   | 24-hour results; 15-minute input URL; 1 byte–2 GiB ID file             | Same service constraints                            |

The 46 public resource methods map one to one after converting Python's snake_case to
TypeScript's camelCase. The checked-in request schemas and OpenAPI/source snapshots are
structurally equal. See [API reference](api-reference.md) and [source guides](sources/index.md).

## Language conventions

| Concern                | Python                                                          | TypeScript / JavaScript                                     |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Key configuration      | `FlashData(api_key=os.getenv("FLASHDATA_API_KEY"))`             | `new FlashData({apiKey: process.env.FLASHDATA_API_KEY})`    |
| Invocation             | Main input plus keyword source parameters                       | One source input object plus request options                |
| Concurrency            | Sync client or `AsyncFlashData`; `await` / `async for`          | Promise methods; `await` / `for await`                      |
| Time units             | `timeout`, `poll_interval`: seconds                             | `timeoutMs`, `pollIntervalMs`: milliseconds                 |
| HTTP timeout semantics | HTTPX connect/read/write/pool timeouts                          | Wall-clock deadline for each fetch and body read            |
| Cancellation           | Keyboard interrupt / native `asyncio.CancelledError`            | `AbortSignal` / `RequestAbortedError`                       |
| Connection ownership   | Context managers, `close()` / `aclose()`                        | Native fetch pool; caller owns injected fetch pools         |
| Typing                 | `TypedDict`, source query/bulk unions, `Required` fields        | Source query/bulk unions and inferred helper responses      |
| Distribution           | Wheel for runtime; source archive also contains guides/examples | npm archive contains runtime, declarations, guides/examples |

Cancelling local work never cancels an accepted server job. Cancellation during a
submission can leave admission unknown. Save received IDs and reconcile before
submitting the same paid work again. Raw JSON field names are preserved in both SDKs.
Stored background results have completion/expiry fields, with optional usage for media
receipts; they do not promise the realtime envelope's `created_at` field.

## Documentation and examples

Both repositories provide English and Simplified Chinese READMEs with language-switch
links. The Chinese versions retain the complete API examples and bulk download workflow;
all localized Python/JavaScript blocks execute in the offline documentation checks.

Both READMEs explain what FlashData does, who the APIs serve, source installation,
explicit keys, working queries, result traversal, background jobs, bulk media delivery,
errors, API coverage and development. Both include destination JSON and the complete
create → upload → start → wait → inspect-results bulk download task.

Both example catalogues cover all 15 sources, public discovery, account reads, bounded
concurrency, background recovery, mixed batches, deduplicated CSV, bulk metadata, bulk
downloads and offline usage. Python has 25 runnable scripts; TypeScript has 27, including
additional typed and CommonJS entry points. Extra language examples do not imply extra APIs.

Bulk CLIs validate input files and waiting options before task creation, save only a job
record to `OUTPUT.job.json`, preserve NDJSON before reporting item failures, and resume
already started IDs without re-upload or submission. Drafts require upload/start; paused
tasks require resolving the pause and calling resume. Concurrency examples use bounded
workers and preserve successful results alongside errors before a failure exit.

Every Markdown guide and root project document links to FlashData and official API
documentation. Source guides link to their matching official source page. READMEs link
to [pricing](https://flashdata.dev/pricing), and local guides retain working relative links.
Tests enforce explicit key examples, link presence, relative link validity, source parameter
coverage, code execution and recovery. See [the example catalogue](../examples/README.md).

## Verification and release boundary

The 2026-10-20 alignment checks passed locally on Windows with Python 3.12.14 and Node.js
24.19.0:

| Verification                    | Python                                                                              | TypeScript                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Offline tests                   | 307 passed; live checks skipped by default                                          | 200 passed; live checks skipped by default                              |
| Executable documentation blocks | 40 Python blocks                                                                    | 38 JavaScript/TypeScript blocks; typed blocks also compile              |
| Runnable examples               | 25, including discovery and bulk downloads                                          | 27, including typed and CommonJS examples                               |
| Formatting and types            | Ruff and mypy pass                                                                  | Prettier and strict TypeScript pass                                     |
| Generated documentation         | Sphinx builds with warnings as errors                                               | TypeDoc builds with warnings as errors                                  |
| Clean package consumer          | Wheel installs; sync/async, mypy and offline example pass; source archive inspected | npm archive installs; ESM/CommonJS runtime and strict declarations pass |
| Live public discovery           | All four endpoints pass without a key                                               | All four endpoints pass without a key                                   |

All 75 guide/root Markdown pages have official navigation links. All 18 distinct linked
FlashData URLs returned HTTP 200, including every source guide, the homepage, API docs
and pricing. API/schema snapshots match, and all 46 methods match between Python sync,
Python async and TypeScript resources. Each project documents repeatable checks in the
README and [release guide](release.md). Earlier paid API results are recorded in
[validation evidence](validation.md); this alignment did not repeat paid submissions.

Successful customer cloud delivery still requires real destination credentials. External
webhook delivery, real cloud writes, live pause/resume transitions and the full GitHub
OS/runtime matrices have not been verified in this local comparison. Media request flows
and failure recovery use offline fixtures. No GitHub repository, registry package or
hosted documentation was published.

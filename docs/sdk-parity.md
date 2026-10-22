# FlashData SDK and CLI comparison

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Python, TypeScript, JavaScript and Go are the language entry points. TypeScript and
JavaScript share one npm package and implementation. The standalone CLI uses the Go SDK.
This comparison describes the current source on `main`; it is not a claim that every
source change is included in previously published v1.0.0 archives.

## Choose an integration

| Concern                   | Python                                                    | TypeScript                                 | JavaScript                       | Go                                          | CLI                                                        |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------ | -------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Best fit                  | Python applications, notebooks, data pipelines            | Typed Node.js services and agents          | Node.js scripts and integrations | Go services and workers                     | Terminal research, scripts and agents                      |
| Runtime                   | Python 3.10+                                              | Node.js 22+; compiler for your application | Node.js 22+                      | Go 1.25+                                    | Standalone Linux/macOS amd64/arm64 or Windows amd64 binary |
| Client/key                | `FlashData(api_key=...)` or `AsyncFlashData(api_key=...)` | `new FlashData({apiKey: ...})`             | Same constructor                 | `flashdata.New(Options{APIKey: ...})`       | `flashdata auth login`; hidden prompt or stdin             |
| Async model               | Sync and asyncio clients                                  | Promises and async iterators               | Same                             | `context.Context`, goroutines and iterators | Background jobs, batch and bulk commands                   |
| Time units                | Seconds                                                   | Milliseconds                               | Milliseconds                     | `time.Duration`                             | Duration flags such as `--timeout 1h`                      |
| Local credentials/history | Application-owned                                         | Application-owned                          | Application-owned                | Application-owned                           | Protected profiles, vault and persistent run journal       |

SDK examples pass the API key explicitly. Applications can read a key from the environment
or a secret manager. The CLI can also use an explicit `FLASHDATA_API_KEY` override. No
project automatically loads `.env` files. Run the Node.js SDK on your server.

## Core API coverage

| Capability                            | Python                                                                                                  | TypeScript   | JavaScript   | Go                            | CLI                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ----------------------------- | ----------------------------------------------------------------- |
| Core developer REST operations        | 24                                                                                                      | 24           | Same package | Same 24                       | Same 24 on `main`; v1.0.0 binaries omit public plans/status reads |
| Source schemas                        | 15                                                                                                      | Identical 15 | Same         | Identical 15                  | Same schemas through Go SDK v1.0.0                                |
| Realtime / background / batch sources | 14 / 15 / 15                                                                                            | Same         | Same         | Same                          | Same via `query`, `--mode async`, `batch submit`                  |
| Google sources                        | Search, images, news, shopping, videos, places                                                          | Same six     | Same         | Same six                      | `search` shortcut; all six via `query`                            |
| YouTube sources                       | Search, extended search, metadata, transcript, captions, license labels, channel, suggestions, download | Same nine    | Same         | Same nine                     | Dedicated shortcuts plus `query` for all nine                     |
| Standard jobs                         | Get, wait, result                                                                                       | Same         | Same         | Same                          | `jobs get`, `jobs wait`, `jobs result`                            |
| Bulk sources                          | Metadata, transcript, captions, license labels, download                                                | Same five    | Same         | Same                          | Same five via `bulk run` or manual commands                       |
| Bulk operations                       | Create, upload file, start, get/list, update, pause/resume/cancel, wait, manifest/parts/rows            | Same         | Same         | Same plus reader-based upload | Manual lifecycle commands and streamed `bulk results`             |
| Account reads                         | Access, balance, pricing, limits, usage                                                                 | Same five    | Same         | Same plus verified identity   | Auth/access checks, account reads and verified identity           |
| Public discovery                      | Sources, plans, health, status                                                                          | Same four    | Same         | Same four                     | `sources list`, `discover`, `discover plans`, `discover status`   |

`discover plans` and `discover status` were added after the CLI v1.0.0 binary release.
Use a source build of `main` for those commands until the next binary release. This
distinction does not affect the existing search, YouTube, batch or bulk commands.

The 15 sources are six `google_*` sources and nine `youtube_*` sources. Media downloads
are background-only and require customer cloud storage. Other sources can run in realtime.
No SDK or CLI invents a list/cancel endpoint for standard background jobs; those controls
are available for bulk jobs only.

Go and the CLI additionally implement agent onboarding and verified ownership reads.
Python and the Node.js package do not expose that optional protocol. These are separate
from the shared developer APIs; availability depends on the service deployment. The
additional Go contract also documents browser-owned operations that are not SDK methods.

## README and example coverage

All four repositories keep English as the default README, with a Simplified Chinese link
at the top. Both languages include the same eight workflow choices: web context, news,
video discovery, metadata, transcripts, bulk datasets, media delivery and bulk recovery.

All have copyable first-search examples, explicit key setup, manual-caption examples,
background/batch guidance, bulk metadata exports and complete customer-storage download
workflows. Each source has a runnable program in the SDK repositories; the CLI uses
dedicated shortcuts or the source JSON returned by `sources show SOURCE`.

The Python/Node.js media scripts default to MP4 and offer `--audio` for MP3. The Go bulk
example defaults to MP3 and accepts `-options video-options.json` for MP4. The CLI has
complete MP3 and MP4 bulk commands; its single-video `youtube download` shortcut is
audio-oriented, while `query --mode async` exposes the complete download source input.
Different defaults are examples, not differences in the media formats supported by APIs.

README transcript snippets explicitly request an existing automatic English track;
caption snippets request an existing uploaded track. Runnable track scripts document
their manual/automatic selection flags and defaults. Availability depends on the video. The
service does not generate missing transcripts, translate captions, summarize text or
create embeddings. Those application steps use the data returned by FlashData.

## Bulk lifecycle and recovery

| Step                    | SDK runnable examples                                                                     | CLI                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Prepare                 | A UTF-8 file with one 11-character video ID per line                                      | Same; private storage/options files for credentials                                            |
| Create                  | Reserve fresh export/recovery paths before creating work                                  | Commit a run ID and intent in the journal                                                      |
| Save acceptance         | Sync the accepted ID/job before upload; never save signed upload URLs in ordinary records | Save job ID and signed upload capability in the protected vault/journal                        |
| Execute                 | Create → upload → start → wait → stream JSONL                                             | `bulk run` performs the same lifecycle                                                         |
| Export                  | Stream results and preserve partial rows; check row statuses and final counts             | Stream results, preserve failed rows and exit nonzero for failures                             |
| Repeat                  | Existing export or recovery record blocks creation                                        | Same run ID prevents duplicate creation; changed input conflicts                               |
| Recover                 | Explicit accepted ID and a fresh output path; no create/upload/resume                     | `runs recover RUN_ID` reads accepted work; no implicit replay                                  |
| Pre-upload interruption | ID-only records cannot restore a lost signed upload; application needs a secure store     | Original capability is kept privately; explicit upload/start recovery is available while valid |

The README's inline API examples explain the lifecycle. Use the repository's runnable
bulk program as the starting point for file preflight, saved IDs, failure exits and recovery.
An empty reserved recovery file after an uncertain create is not permission to create again:
reconcile the account/server outcome first. None of the SDKs automatically retries paid
queries or mutations. Local cancellation or a polling timeout does not cancel accepted work.

`.jsonl` and `.ndjson` both mean one JSON object per line. Media bytes go to the configured
customer bucket; local files contain per-item data or delivery receipts. A completed task
can contain failed/invalid items. Export before internal results expire (24 hours after
completion); signed input uploads expire after 15 minutes. Input files support 1 byte to
2 GiB. Cloud credential validation and delivery permissions remain server responsibilities.

Go and the CLI additionally validate/snapshot IDs before upload. The CLI owns OS credential
storage and durable execution history; SDK applications own their persistence. These are
intentional implementation differences, not cross-machine exactly-once guarantees.

## Validation

The comparison checks parsed source schemas and source contracts across all SDKs, the
24 core OpenAPI operations, sync/async resource parity, and the local backend catalog and
bulk option validators. The Go snapshot adds 14 identity/onboarding contract operations;
five are browser-owned. Core source/API coverage does not depend on those additions.

Tests execute README code and runnable examples using local mock transports, verify
no accidental resubmission after an interrupted bulk start, preserve orphaned recovery
records and inspect exported item statuses. Documentation checks cover translations,
explicit key examples, official website links, relative links and workflow anchors.
Package checks exercise clean consumers; GitHub Actions checks the supported runtimes.
These checks do not perform paid API queries or customer-cloud writes.

| Repository              | README                                                                | Examples                                                                            | API / commands                                                                              | Bulk recovery                                                                       |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Python                  | [README](https://github.com/flashdatadev/flashdata-python#readme)     | [Examples](https://github.com/flashdatadev/flashdata-python/tree/main/examples)     | [API](https://github.com/flashdatadev/flashdata-python/blob/main/docs/api-reference.md)     | [Bulk](https://github.com/flashdatadev/flashdata-python/blob/main/docs/bulk.md)     |
| TypeScript / JavaScript | [README](https://github.com/flashdatadev/flashdata-typescript#readme) | [Examples](https://github.com/flashdatadev/flashdata-typescript/tree/main/examples) | [API](https://github.com/flashdatadev/flashdata-typescript/blob/main/docs/api-reference.md) | [Bulk](https://github.com/flashdatadev/flashdata-typescript/blob/main/docs/bulk.md) |
| Go                      | [README](https://github.com/flashdatadev/flashdata-go#readme)         | [Examples](https://github.com/flashdatadev/flashdata-go/tree/main/examples)         | [API](https://github.com/flashdatadev/flashdata-go/blob/main/docs/api-reference.md)         | [Bulk](https://github.com/flashdatadev/flashdata-go/blob/main/docs/bulk.md)         |
| CLI                     | [README](https://github.com/flashdatadev/flashdata-cli#readme)        | [Inputs](https://github.com/flashdatadev/flashdata-cli/tree/main/examples)          | [Commands](https://github.com/flashdatadev/flashdata-cli/blob/main/docs/commands.md)        | [Bulk](https://github.com/flashdatadev/flashdata-cli/blob/main/docs/bulk.md)        |

# FlashData TypeScript & JavaScript SDK

[English](https://github.com/flashdatadev/flashdata-typescript/blob/main/README.md) | [简体中文](https://github.com/flashdatadev/flashdata-typescript/blob/main/README.zh-CN.md)

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Google search results and YouTube data for Node.js applications, search monitoring,
research pipelines, and retrieval workflows.

Get web, news, shopping, image, video, and local search results; discover YouTube videos,
read metadata and existing caption tracks; run background and batch queries; and process
video ID files in bulk. Includes typed requests and responses, input validation, structured
errors, bounded pagination, cancellation, and ESM/CommonJS support. Requires Node.js 22+.

## What is FlashData?

[FlashData](https://flashdata.dev) provides APIs for Google search results, YouTube data,
and cloud media delivery. Developers and data teams use these APIs for search monitoring,
research, analytics, content discovery, and retrieval workflows for AI applications.

Retrieve web, news, shopping, image, video, and local search results; discover YouTube
videos and read metadata, existing caption tracks, channel data, and license labels.
Use realtime requests, background jobs, mixed batches, or bulk video ID files to fit your
workload. Media downloads deliver audio or video into your own cloud storage.
See the [API documentation](https://flashdata.dev/docs) and [pricing](https://flashdata.dev/pricing).

## Choose a workflow

| What you want to build                                  | Start here                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Web context and source links for an AI assistant        | [Google search](#search-google)                                 |
| Industry research or news monitoring                    | [News search](#follow-industry-news)                            |
| Video discovery for a topic or learning resource        | [YouTube search](#find-youtube-videos-about-a-topic)            |
| Video analytics and catalog enrichment                  | [Video metadata](#get-a-videos-metadata)                        |
| Text for video summaries, search or retrieval           | [Existing transcripts](#get-transcript-text-for-an-ai-workflow) |
| A dataset from a list of video IDs                      | [Bulk metadata export](#build-a-youtube-metadata-dataset)       |
| Audio or video files delivered to your own cloud bucket | [Bulk media download](#download-youtube-videos-in-bulk)         |
| Continue an interrupted bulk job                        | [Recovery](#recover-an-already-started-bulk-job)                |

The examples collect data; your application provides summarization, indexing, scheduling
and AI model calls.

## Install

```sh
npm install @flashdata-dev/sdk
```

Use version 1.1.0 or newer for plain-text and Markdown response options.
For development, see [installation from source](#install-from-source). Run the SDK on your server.

For a TypeScript application, also install the compiler and Node.js types as development
dependencies; the SDK includes its own API types:

```sh
npm install --save-dev typescript@~5.9.3 @types/node@^22
```

## Configure your API key

Obtain a key from your [FlashData account](https://flashdata.dev) and pass it through
`apiKey`. Examples read it using `process.env.FLASHDATA_API_KEY`; a key supplied by your
secret manager works too.

The SDK does not automatically load `.env` files. Load application configuration before
reading `process.env` if you use them.

```sh
# macOS / Linux
export FLASHDATA_API_KEY="YOUR_API_KEY"
```

```powershell
$env:FLASHDATA_API_KEY = "YOUR_API_KEY"
```

Each code block below is a standalone example. After installing and setting your API key,
save a block as `quickstart.mjs` and run:

```sh
node quickstart.mjs
```

The `.mjs` extension runs these ESM examples directly in Node.js. For TypeScript project
configuration and compilation, see the [TypeScript guide](docs/typescript.md).

## Search Google

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.search({
  query: 'coffee roasters',
  gl: 'us',
  hl: 'en',
  num: 5,
});
for (const payload of response.results) {
  for (const hit of payload.organic ?? []) {
    console.log(hit.title, hit.link);
  }
}
```

By default, responses are ordinary objects. The outer `results` array contains source payloads;
Google web hits are inside each payload's `organic` list. Charged credits are in
`response.usage.credits`. Other sources have their own field paths.

## Choose a response format

Available in `@flashdata-dev/sdk` 1.1.0 or newer.

JSON objects remain the default. Pass `accept: 'text/plain'` for a string, or
`respondWith: 'markdown'` for Markdown content, in the second argument.

| `accept`                       | `respondWith` | Result                            |
| ------------------------------ | ------------- | --------------------------------- |
| `'application/json'` (default) | Omitted       | Object with original `results`    |
| `'text/plain'`                 | Omitted       | Original fields as text           |
| `'application/json'` (default) | `'markdown'`  | Object with Markdown in `content` |
| `'text/plain'`                 | `'markdown'`  | Metadata followed by Markdown     |

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.search(
  { query: 'vector databases' },
  { respondWith: 'markdown' },
);
console.log(response.content);
const text = await client.youtube.transcript(
  { video_id: 'dQw4w9WgXcQ', language: 'en', auto: false },
  { accept: 'text/plain', respondWith: 'markdown' },
);
console.log(text);
```

`accept` also works on background submissions, batches and `jobs.get()`.
Choose Markdown for completed jobs with `jobs.result(id, { respondWith: 'markdown' })`.
Formatting a completed result does not repeat the query or charge query credits.
See [response formats](docs/response-formats.md) for supported methods and TypeScript examples.

## Follow industry news

Collect headlines, publishers and article links for a research tool or monitoring script.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.news({
  query: 'battery recycling',
  gl: 'us',
  hl: 'en',
  num: 5,
});
for (const payload of response.results) {
  for (const article of payload.news ?? []) {
    console.log(article.title, article.source, article.link);
  }
}
```

## Find YouTube videos about a topic

Discover relevant videos and get IDs you can pass to metadata or transcript requests.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.search({ query: 'python tutorial', max_results: 5 });
for (const payload of response.results) {
  for (const video of payload.results ?? []) {
    console.log(video.videoId, video.title, video.channel);
  }
}
```

## Get a video's metadata

Enrich a video catalog with titles, channels, duration and view counts. Replace the example
ID with a video you want to analyze.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.metadata({
  video_id: 'dQw4w9WgXcQ',
  include_formats: false,
});
for (const video of response.results) {
  console.log(video.title, video.channel);
  console.log('Seconds:', video.duration, 'Views:', video.viewCount);
}
```

## Get transcript text for an AI workflow

Read an existing English automatic caption track for your application to summarize or index.
The API returns text; your application performs the summarization or embedding.

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.transcript({
  video_id: 'dQw4w9WgXcQ',
  language: 'en',
  auto: true,
});
for (const track of response.results) {
  console.log(track.fullText ?? '');
}
```

Transcripts depend on the language tracks available on the video; missing tracks are not
transcribed or translated. For uploaded captions, use the `captions` example below.

## Read a YouTube caption track

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.captions({
  video_id: 'dQw4w9WgXcQ',
  language: 'en',
  auto: false,
});
for (const track of response.results) {
  console.log(track.languageCode, track.isAutoGenerated);
  for (const segment of (track.segments ?? []).slice(0, 3)) {
    console.log(segment.start, segment.end, segment.text);
  }
}
```

Captions default to an uploaded track (`auto: false`); transcripts default to an automatic
track (`auto: true`). Choose a language and track that exist on the video. Missing tracks
raise API errors; the service does not generate or translate them.

## Background jobs and batches

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const receipt = await client.youtube.metadata(
  { video_id: 'dQw4w9WgXcQ', include_formats: false },
  { mode: 'async' },
);
console.log('Save this job ID:', receipt.id);
await client.jobs.wait(receipt.id, { timeoutMs: 300000, pollIntervalMs: 3000 });
const result = await client.jobs.result(receipt.id);
console.log(result);
```

Save IDs before waiting. `wait()` returns a completed job record; `result()` reads its
JSON output. A polling deadline or process restart does not require a new submission.
Use `queries.batch()` for mixed queries; see [jobs and batch](docs/jobs.md).

## Build a YouTube metadata dataset

Create `video-ids.txt` with one YouTube video ID per line:

```text
dQw4w9WgXcQ
jNQXAC9IVRw
```

This example creates the job, uploads the IDs, starts processing, waits, and exports
NDJSON (one JSON object per line). Each row includes an input item's status and data.

```javascript
import { open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const output = await open('videos.ndjson', 'wx', 0o600);
try {
  const record = await open('videos.ndjson.job.json', 'wx', 0o600);
  try {
    const receipt = await client.bulk.create({
      source: 'youtube_metadata',
      options: { include_formats: false },
    });
    const bulkId = receipt.job.id;
    console.log('Save this bulk ID:', bulkId);
    await record.writeFile(JSON.stringify({ id: bulkId }) + '\n', 'utf8');
    await record.sync();
    await client.bulk.uploadFile(receipt, 'video-ids.txt');
    await client.bulk.start(bulkId);
    const completed = await client.bulk.wait(bulkId, {
      timeoutMs: 3600000,
      pollIntervalMs: 5000,
    });

    for await (const row of client.bulk.rows(bulkId)) {
      await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
    }
    console.log('Saved videos.ndjson; counts:', completed.counts);
    if (completed.counts.failed || completed.counts.invalid) {
      throw new Error('Some items failed; inspect the saved rows before retrying');
    }
  } finally {
    await record.close();
  }
} finally {
  await output.close();
}
```

The inline program saves the accepted ID to `videos.ndjson.job.json` before uploading. After a restart or timeout,
use the [recovery flow](#recover-an-already-started-bulk-job) below instead of rerunning creation.
The inline export uses exclusive creation and refuses to overwrite an existing file.

For a ready-to-run script, run these commands from the repository root. It saves the job
record to `OUTPUT.job.json` before upload and preserves exports with per-item failures:

```sh
node examples/bulk.mjs video-ids.txt --output artifacts/videos.ndjson
node examples/bulk.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/videos-recovered.ndjson
```

The create and recovery commands are separate runs; use the second only when recovering,
and replace the saved ID. Other bulk sources include `youtube_transcript`, `youtube_captions`
and `youtube_trainability`; each job applies one set of options to all IDs. See [bulk options](docs/bulk.md).

## Download YouTube videos in bulk

Create `video-ids.txt` with one 11-character ID per line:

```text
dQw4w9WgXcQ
jNQXAC9IVRw
```

Create a private `private-storage.json` file for your destination. For example, for S3:

```json
{
  "storage_type": "s3",
  "storage_url": "your-media-bucket",
  "region": "us-east-1",
  "object_prefix": "youtube",
  "access_key": "YOUR_ACCESS_KEY",
  "secret_key": "YOUR_SECRET_KEY"
}
```

Create the task, upload the file, start processing, and read per-video status:

```javascript
import { readFile, open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const storage = JSON.parse(await readFile('private-storage.json', 'utf8'));
const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const output = await open('downloads.ndjson', 'wx', 0o600);
try {
  const record = await open('downloads.ndjson.job.json', 'wx', 0o600);
  try {
    const receipt = await client.bulk.create({
      source: 'youtube_download',
      options: {
        download_type: 'audio_video',
        video_quality: '<=720',
        output_format: 'mp4',
        storage,
      },
    });
    const bulkId = receipt.job.id;
    console.log('Save this bulk ID:', bulkId);
    await record.writeFile(JSON.stringify({ id: bulkId }) + '\n', 'utf8');
    await record.sync();
    await client.bulk.uploadFile(receipt, 'video-ids.txt');
    await client.bulk.start(bulkId);
    const completed = await client.bulk.wait(bulkId, { timeoutMs: 3600000, pollIntervalMs: 5000 });
    console.log('Counts:', completed.counts);
    for await (const row of client.bulk.rows(bulkId)) {
      await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
      console.log(row.video_id, row.status);
    }
    if (completed.counts.failed || completed.counts.invalid) {
      throw new Error('Some items failed; inspect downloads.ndjson before retrying');
    }
  } finally {
    await record.close();
  }
} finally {
  await output.close();
}
```

The inline program saves its accepted ID to `downloads.ndjson.job.json` before uploading.
It saves delivery receipts to `downloads.ndjson` and refuses to overwrite
an existing file. Item failures are reported after receipts have been saved.

Media is delivered into your configured bucket. `bulk.rows()` reads JSON result records
with each video's status and source output in `results`; it does not download media files
to your computer. Check final counts and row statuses because completed tasks can contain
failed items. Downloads are billed by actual delivered bytes; cloud storage may charge separately.

Resume with the saved ID using `bulk.get()`, `bulk.wait()`, and `bulk.rows()`. The runnable
example saves the job ID and exports NDJSON, and can resume without creating another task:

```sh
node examples/bulk_download.mjs video-ids.txt --storage-file private-storage.json --output artifacts/downloads.ndjson
node examples/bulk_download.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/downloads-recovered.ndjson
```

Run the second command only to recover an already started job, replacing the saved ID.
Use a fresh output path to retain any previous export.

See [bulk controls and recovery](docs/bulk.md), [download options](docs/sources/youtube_download.md),
and [supported storage providers](docs/storage.md).

### Deliver MP3 audio instead

Use the same ID file and private storage configuration. In the inline request, set
`download_type` to `audio`, set `output_format` to `mp3`, and remove `video_quality`;
or run the ready-to-use script from the repository root:

```sh
node examples/bulk_download.mjs video-ids.txt --audio --storage-file private-storage.json --output artifacts/audio.ndjson
```

## Recover an already started bulk job

Replace `bulk_YOUR_SAVED_ID` with the ID printed and saved from either the metadata or
download task. This flow only waits for and reads existing work: no creation, upload or
new download submission.

```javascript
import { open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const bulkId = 'bulk_YOUR_SAVED_ID';
const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const completed = await client.bulk.wait(bulkId, {
  timeoutMs: 3600000,
  pollIntervalMs: 5000,
});
const output = await open('recovered.ndjson', 'wx');
try {
  for await (const row of client.bulk.rows(bulkId)) {
    await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
  }
} finally {
  await output.close();
}
console.log('Saved recovered.ndjson; counts:', completed.counts);
if (completed.counts.failed || completed.counts.invalid) {
  throw new Error('Some items failed; inspect the saved rows before retrying');
}
```

A polling timeout stops local waiting; accepted server work continues. An `awaiting_upload`
job still needs the original upload descriptor and an explicit `start`; a paused job needs
its cause fixed and an explicit `resume`. The example job records omit signed upload
descriptors, so an ID alone cannot recover a process interrupted before upload. Keep storage
credentials and signed URLs out of ordinary job records.

Export promptly: internal results are retained for 24 hours after completion. See
[bulk controls and recovery](docs/bulk.md).

## Handle failures and cancellation

```javascript
import { APIError, FlashData, SubmissionUnknownError } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY, timeoutMs: 120000 });
try {
  const response = await client.google.search({ query: 'coffee' }, { timeoutMs: 60000 });
  console.log(response.usage.credits);
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.statusCode, error.code, error.requestId, error.retryAfter);
  } else if (error instanceof SubmissionUnknownError) {
    // The server may have accepted this paid request. Reconcile before repeating it.
    throw error;
  } else {
    throw error;
  }
}
```

Each request is sent once. The SDK does not automatically retry paid queries or mutations.
Every request accepts an `AbortSignal`; cancellation stops local work and leaves accepted
server jobs running. See [errors and recovery](docs/errors.md) and [client configuration](docs/client.md).

## Supported APIs

| Resource | Methods                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google   | `search`, `images`, `news`, `shopping`, `videos`, `places`, bounded `pages`                                                                       |
| YouTube  | `search`, `searchExtended`, `metadata`, `transcript`, `captions`, `licenseCheck`, `channel`, `suggestions`, `download`                            |
| Queries  | `realtime`, `submit`, `batch` with typed wire objects                                                                                             |
| Jobs     | `get`, `wait`, `result`                                                                                                                           |
| Bulk     | `create`, `uploadFile`, `start`, `get`, `list`, `iterJobs`, `update`, `pause`, `resume`, `cancel`, `wait`, `manifest`, `part`, `iterRows`, `rows` |
| Account  | `access`, `balance`, `pricing`, `limits`, `usage`                                                                                                 |
| Public   | `sources`, `plans`, `health`, `status` (no key needed)                                                                                            |

All 15 sources support background submission and batch. The 14 data sources also support
realtime requests. Bulk supports metadata, transcripts, captions, license labels, and downloads.

## Guides and runnable examples

- [Getting started](docs/getting-started.md) and [source guides](docs/sources/index.md).
- [Examples](examples/README.md): CLI inputs, useful output, JSON/CSV/NDJSON exports.
- [Pagination](docs/pagination.md), [jobs](docs/jobs.md), [bulk datasets](docs/bulk.md).
- [TypeScript, ESM and CommonJS](docs/typescript.md), [API reference](docs/api-reference.md).

```sh
node examples/google_search.mjs "coffee roasters" --output artifacts/search.json
node examples/search_to_csv.mjs coffee --max-pages 2 --output artifacts/search.csv
node examples/concurrent_search.mjs coffee tea --concurrency 2
npm run examples:typescript -- coffee
```

Live examples consume credits. `node examples/offline.mjs` demonstrates a mock query
with no account or network. All scripts support `--help` and do no network work on import.

The [SDK and CLI comparison](docs/sdk-parity.md) maps Python, TypeScript/JavaScript, Go
and CLI coverage, examples, bulk recovery and intentional language differences side by side.

Bulk scripts refuse existing exports or `OUTPUT.job.json` records before any API call.
After a timeout or interruption, recover the saved ID into a fresh output path; do not
rerun creation. An empty reserved record needs reconciliation before new work.

## Install from source

From this repository checkout:

```sh
npm ci
npm run build
```

For another application, create and install a local package:

```sh
# In this repository
npm pack
# In your application
npm install /absolute/path/to/flashdata-dev-sdk-1.0.0.tgz
```

## Development

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run docs:build
npm run verify:package
npm pack
```

Default tests use injected fetch responses and a loopback HTTP server. Live tests require
explicit opt-in; see [contributing](CONTRIBUTING.md). The package is MIT licensed. Report
sensitive issues through the [security policy](SECURITY.md).

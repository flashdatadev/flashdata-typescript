# Bulk datasets and cloud media downloads

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Bulk applies one source and shared options to a UTF-8 file containing one 11-character
YouTube video ID per line (1 byte to 2 GiB). It supports metadata, transcripts, captions,
license labels, and downloads. Search/channel/suggestions use individual queries or batch.

## Create, upload, start, export

Create `video-ids.txt` with one ID per line, then run:

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

Creation returns `{job, upload}`. Keep the whole receipt for `uploadFile`, which streams
the input file using the signed PUT descriptor's content type and length. Its upload URL
expires after 15 minutes. Creating or uploading does not start the task. Keep the ID if
upload fails; retry the same upload only while its descriptor is valid. An expired input
upload requires a replacement draft; cancel the unused draft before creating another.
Do not log upload descriptors or signed URLs.

## Download media into your storage

Downloads require `source: 'youtube_download'` and destination credentials in `options.storage`.
Use the same lifecycle as data jobs. Here is the complete task (prepare `video-ids.txt`
and private destination JSON first; see [storage](storage.md)):

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

Media goes to your bucket; signed task result parts contain JSON delivery records. A
completed task may contain failed items, so inspect final counts and per-row status.
Downloads are billed by actual delivered bytes. Customer cloud charges apply separately.
The `bulk_download.mjs` CLI saves a job record beside the NDJSON export and supports
`--bulk-id` to resume without re-uploading or re-submitting work.
This resume command waits for a task that has already started. An `awaiting_upload`
draft still needs its input uploaded and `start` called; a paused task needs its blocking
condition resolved and `resume` called before waiting again.

## Options and controls

Bulk uses `options`, rather than individual-query `params`. Metadata accepts
`include_formats` and `include_chapters`; transcript/captions accept `language` and `auto`;
license checks have no data options. These data sources can set `result_storage` to deliver
result parts into customer storage. Downloads use `storage` instead of `result_storage`.

`get(id)` returns status, counts, pause reason and delivery state. Expected states are
`awaiting_upload`, `running`, `paused`, `finalizing`, `completed`, `failed`, and `cancelled`.
`pause` requests a pause for running admission; already active items may finish. `resume`
continues paused work after its blocking condition is resolved. `update` changes settings
allowed by the current state, including supported storage credential patches. `cancel`
stops remaining admission; completed/admitted work can already be charged.

`wait` raises `JobPausedError` on a pause and `JobFailedError` on failure/cancellation.
It does not resume, cancel, or repeat submissions automatically. Use saved IDs to continue
reading after timeouts or process restarts.

## Results and listing

`manifest(id)` reads ordered part descriptors, counts and expiry. `part(id, number)` reads
bounded raw bytes. `iterRows(id, number)` decodes one gzip/NDJSON part; `rows(id)` walks
all manifest parts in order. It constructs API routes and does not follow arbitrary
manifest hyperlinks. Part numbers are zero based. Decoding bounds total and per-line
bytes and rejects malformed gzip/UTF-8/JSON. Export within the 24-hour result window.

`list({cursor, limit})` returns `data` and `pagination`. `iterJobs({maxPages, limit})` yields
jobs from a bounded number of pages and rejects missing/repeated continuation cursors.
All iterators support request options with `signal` and `timeoutMs`.

## Safe local exports

The bulk scripts reserve new output and `OUTPUT.job.json` files before any API call,
refuse existing files, and sync accepted IDs before upload. Completion records are
replaced atomically. A lost start response leaves its accepted ID available; recovery
uses that ID and a fresh output path without another creation or upload. Empty reserved
records after an uncertain create require account/server reconciliation.

Use `bulk_download.mjs` with `--audio` for MP3; the default is MP4.
Compare [all SDKs and the CLI](sdk-parity.md) for coverage and persistence differences.

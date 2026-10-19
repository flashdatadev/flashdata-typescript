# Bulk YouTube collections

Bulk accepts `youtube_metadata`, `youtube_transcript`, `youtube_captions`,
`youtube_trainability` and `youtube_download`. Search, channels and suggestions use
individual queries or regular batches. A bulk input is a non-empty UTF-8 text file of
one 11-character video ID per line, up to 2 GiB. Uploads are streamed in 64 KiB chunks.

1. Create a collection with a source and shared options. Persist `created.job.id`.
2. Upload the file to the returned descriptor using the upload helper. The presigned
   upload URL lasts 15 minutes. It receives the declared content type and file size.
3. Start the existing collection by ID. Creating/uploading alone does not start queries.
4. Read progress or explicitly wait. A paused state raises `JobPausedError` and requires
   a deliberate update/resume; the SDK never replenishes Credits or resumes itself.
5. Retrieve the manifest and read its `parts[].number` with the part/row methods.

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const created = await client.bulk.create({source: "youtube_metadata", options: {include_formats: false}});
const bulkId = created.job.id;
console.log(bulkId);
await client.bulk.uploadFile(created, "video-ids.txt");
await client.bulk.start(bulkId);
await client.bulk.wait(bulkId, {timeoutMs: 3600000, pollIntervalMs: 5000});
const manifest = await client.bulk.manifest(bulkId);
for (const part of manifest.parts) {
  for await (const row of client.bulk.iterRows(bulkId, part.number)) console.log(row);
}
```

`pause`, `resume`, `update` and `cancel` operate on the same bulk ID. Cancellation stops
new admission; already-admitted child jobs may finish and retain their charges. Updates
affect future admissions and may receive 409 while a coordinator slice finishes. After
all IDs are scanned, paused data collections accept only supported credential updates.
Set `callback_url` to null to remove a bulk completion callback.

Each result row preserves its input index and completed/failed/invalid outcome. A
completed collection can include failed rows. The manifest and parts expire 24 hours
after collection completion. Read one part at a time: the SDK bounds both transferred
and decompressed bytes by the configured response limit and caps each NDJSON line at
1 MiB. It does not load every collection part into memory together. The raw part method
returns bytes, which may be gzip-compressed; row iteration detects gzip automatically.

Data collections can specify `options.result_storage` to deliver result parts to customer
storage. Downloads require `options.storage` instead. Storage type/credentials use the
[same destination schema](storage.md). Default result prefixes use the UTC creation date.
Customer-delivered manifests and internal signed results have separate storage retention.

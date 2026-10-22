# Runnable TypeScript and JavaScript examples

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Run `npm ci` and `npm run build` from the checkout. Each live example passes
`apiKey: process.env.FLASHDATA_API_KEY` explicitly. Set that environment variable before
execution. `--help` needs no key and makes no request. Imports never start paid work.
The SDK does not load `.env` files; load application configuration yourself if needed.

Most examples accept `--output artifacts/name.json`, save the complete response, and
print useful fields. CSV/NDJSON workflows write their own formats. Errors produce a
nonzero exit status. Outputs, credentials and signed URLs belong outside version control.

## Source examples

| Command                                                                                  | Output                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `node examples/google_search.mjs "coffee roasters"`                                      | Titles, links and snippets                     |
| `node examples/google_images.mjs "coffee beans"`                                         | Image URLs and source pages                    |
| `node examples/google_news.mjs "renewable energy"`                                       | Headlines, publishers, dates and links         |
| `node examples/google_shopping.mjs "mechanical keyboard"`                                | Listings, price strings, merchants and links   |
| `node examples/google_videos.mjs "espresso tutorial"`                                    | Video pages and snippets                       |
| `node examples/google_places.mjs "coffee shops in Seattle"`                              | Businesses, addresses and ratings              |
| `node examples/youtube_search.mjs "python tutorial" --max-results 5`                     | Video titles, channels and watch URLs          |
| `node examples/youtube_search_extended.mjs "python tutorial" --max-results 30`           | Larger discovery sets                          |
| `node examples/youtube_metadata.mjs dQw4w9WgXcQ`                                         | Title, channel, duration and caption languages |
| `node examples/youtube_transcript.mjs dQw4w9WgXcQ --language en`                         | Existing track segments                        |
| `node examples/youtube_captions.mjs dQw4w9WgXcQ --language en`                           | Uploaded caption segments                      |
| `node examples/youtube_trainability.mjs dQw4w9WgXcQ`                                     | Detected license labels                        |
| `node examples/youtube_channel.mjs @freecodecamp --video-limit 5`                        | Channel and recent videos                      |
| `node examples/youtube_suggestions.mjs python`                                           | Autocomplete suggestions                       |
| `node examples/youtube_download.mjs VIDEO_ID --storage-file private-storage.json --wait` | Job ID and delivery completion                 |

Google examples accept `--num`, `--page`, `--gl`, and `--hl`. YouTube search accepts
`--short`. Metadata includes formats/chapters only when their flags are requested.
Transcript/captions CLI examples explicitly select uploaded English captions for the
default video; `--auto` selects automatic captions if available. The transcript SDK
method itself defaults to `auto: true`. Missing tracks are errors, without generation,
translation or fallback. License labels do not grant media reuse or training rights.

## Workflow examples

```sh
node examples/offline.mjs
node examples/discovery.mjs
node examples/account.mjs --output artifacts/account.json
node examples/concurrent_search.mjs coffee tea --concurrency 2 --output artifacts/searches.json
node examples/async_query.mjs coffee --output artifacts/job.json
node examples/batch.mjs --wait --output artifacts/batch.json
node examples/search_to_csv.mjs coffee --max-pages 2 --output artifacts/search.csv
node examples/bulk.mjs examples/video-ids.example.txt --output artifacts/videos.ndjson
node examples/bulk_download.mjs examples/video-ids.example.txt --storage-file private-storage.json --output artifacts/downloads.ndjson
node examples/commonjs.cjs coffee
npm run examples:typescript -- coffee
```

`offline.mjs` uses a simulated transport. Public `discovery.mjs` needs no key; account
reads are free. Other examples consume credits. Download examples need a real cloud
destination; see the storage guide in `docs/storage.md`.

## Resume saved work

The bulk CLIs save a job record beside the NDJSON output as `OUTPUT.job.json`. They never
save the signed upload descriptor. Keep the printed ID if upload or polling fails.

```sh
node examples/async_query.mjs --job-id job_YOUR_SAVED_ID --output artifacts/job.json
node examples/bulk.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/videos-recovered.ndjson
node examples/bulk_download.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/downloads-recovered.ndjson
```

Resume commands read existing tasks without creating another submission. Bulk completion
does not imply every item succeeded; inspect counts and row statuses. Exports complete
before an item-failure exit status, preserving data for application recovery. NDJSON
records describe media delivery; the media itself is written to your configured bucket.
Bulk resume assumes the task has already started. Drafts still require upload/start;
paused tasks require resolving the pause and calling `bulk.resume()` before waiting.

## Bulk export and recovery safety

Bulk scripts reserve fresh export and `OUTPUT.job.json` paths before contacting the API.
They refuse to overwrite either file, including an orphaned or empty recovery record.
Accepted IDs are synced before upload, and completion checkpoints are replaced atomically.
After interruption, use `--bulk-id` with a fresh `--output` filename; never rerun creation
with an old output path. Empty records after uncertain creation need reconciliation.

The media example defaults to MP4. Add `--audio` for MP3 using the same private storage
configuration. See the [workflow comparison](../docs/sdk-parity.md).

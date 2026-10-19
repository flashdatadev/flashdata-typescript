# YouTube cloud downloads

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs/sources/youtube_download)

Deliver audio or video to your cloud storage. Individual and batch downloads run in the background. Pass destination credentials through `storage`; output media is not returned as a local file.

## Example

```javascript
import { readFile } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const storage = JSON.parse(await readFile('private-storage.json', 'utf8'));
const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const receipt = await client.youtube.download({
  video_id: 'dQw4w9WgXcQ',
  storage,
  video_quality: '<=720',
  output_format: 'mp4',
});
console.log('Save this ID:', receipt.id);
await client.jobs.wait(receipt.id, { timeoutMs: 600000, pollIntervalMs: 5000 });
console.log(await client.jobs.result(receipt.id));
```

Run `node examples/youtube_download.mjs dQw4w9WgXcQ --storage-file private-storage.json --output artifacts/youtube_download.json` from the checkout. Use `--help` for options. The command consumes credits.

Configure `private-storage.json` first; see [storage](../storage.md). Delivery requires a working customer destination.

## Parameters

`video_id` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Downloads always run in the background; realtime download is unsupported.

| Option            | Type / constraints                                                                                                                                                                                                                                  | Default                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `download_type`   | `audio_video`, `video`, `audio`                                                                                                                                                                                                                     | "audio_video"                    |
| `video_quality`   | `best`, `worst`, `<=144`, `==144`, `>=144`, `<=360`, `==360`, `>=360`, `<=480`, `==480`, `>=480`, `<=720`, `==720`, `>=720`, `<=1080`, `==1080`, `>=1080`, `<=1440`, `==1440`, `>=1440`, `<=2160`, `==2160`, `>=2160`, `<=4320`, `==4320`, `>=4320` | "<=720"                          |
| `fps`             | string; pattern `^(?:>=                                                                                                                                                                                                                             | <=                               | ==)(?:[1-9]\d? | 1\d\d | 2[0-3]\d | 240)$` | service default / optional |
| `audio_language`  | `default`, `original`                                                                                                                                                                                                                               | "default"                        |
| `audio_quality`   | `best`, `320`, `256`, `192`, `128`                                                                                                                                                                                                                  | "best"                           |
| `yt_dlp_format`   | string                                                                                                                                                                                                                                              | service default / optional       |
| `upload_metadata` | boolean                                                                                                                                                                                                                                             | false                            |
| `output_format`   | video: `mp4`, `webm`, `mkv`; audio: `m4a`, `mp3`, `opus`                                                                                                                                                                                            | `mp4` for video; `m4a` for audio |
| `start_at`        | string; pattern `^\d{1,2}:[0-5]\d:[0-5]\d$`                                                                                                                                                                                                         | service default / optional       |
| `end_at`          | string; pattern `^\d{1,2}:[0-5]\d:[0-5]\d$`                                                                                                                                                                                                         | service default / optional       |
| `storage`         | destination object; see storage guide                                                                                                                                                                                                               | required                         |

`audio_quality` applies only to audio downloads. `video_quality` and `fps` do not apply
to audio-only work. `audio_language` does not apply to video-only work. A `yt_dlp_format`
selector overrides the normal video quality, frame rate and audio language selection;
use it only when you need that control. `end_at` must be later than `start_at`.
Timestamps use `HH:MM:SS`; an omitted start defaults to `00:00:00` when clipping.
The server validates provider credentials and combinations before admitting the request.

## Use at scale

Use [bulk jobs](../bulk.md) for a file of video IDs with the same options. All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

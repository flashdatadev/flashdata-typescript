# YouTube license labels

Inspect the API’s `permitted` labels for a video. The source name is `youtube_trainability`, but these labels report detected license information; they do not grant model-training or media-reuse permission.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' });
for (const video of response.results) console.log(video.videoId, video.permitted ?? []);
```

Run `node examples/youtube_trainability.mjs dQw4w9WgXcQ --output artifacts/youtube_trainability.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`video_id` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

| Option | Type / constraints         | Default |
| ------ | -------------------------- | ------- |
| —      | No source-specific options | —       |

## Use at scale

Use [bulk jobs](../bulk.md) for a file of video IDs with the same options. All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

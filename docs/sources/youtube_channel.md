# YouTube channels

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs/sources/youtube_channel)

Read channel identity, description, subscriber/view counts, and a bounded `videos` list. Pass a handle such as `@freecodecamp`, and set `video_limit` to control the number of recent entries.

## Example

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.channel({ handle: '@freecodecamp', video_limit: 5 });
for (const payload of response.results) {
  for (const item of payload.videos ?? [])
    console.log(item.title, item.link ?? item.videoId ?? item.address);
}
```

Run `node examples/youtube_channel.mjs @freecodecamp --output artifacts/youtube_channel.json` from the checkout. Use `--help` for options. The command consumes credits.

## Parameters

`handle` is required. Source options are properties on the first input object, or entries in `params` when using `queries`. Helpers default to realtime; pass `{mode: 'async'}` as the second argument for background work. Request options also accept `timeoutMs` and `signal`.

| Option        | Type / constraints | Default |
| ------------- | ------------------ | ------- |
| `video_limit` | integer; 1–100     | 20      |

## Use at scale

All sources support [background and batch queries](../jobs.md). Read [errors and recovery](../errors.md) before adding application retries.

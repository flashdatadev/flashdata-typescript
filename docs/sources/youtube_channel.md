# Youtube Channel

Wire source: `youtube_channel`. Helper: `client.youtube.channel`. Required input: `handle`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_channel).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_channel.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.channel({"handle": "@jawed", "video_limit": 10});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `video_limit` | integer | 20 |  Range: 1–100. |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "youtube_channel",
  "status": "done",
  "results": [
    {
      "channelId": "UC4QobU6STFB0P71PMvOGN5A",
      "channelHandle": "@jawed",
      "name": "jawed",
      "description": "",
      "subscriberCount": 6580000,
      "videoCount": 1,
      "viewCount": null,
      "avatarUrl": "https://yt3.googleusercontent.com/uI3VE4PVqvCy0xnWLqMJnEzyBUm3T8VHOCp4ee-1RxdHqKXCdUE_qXYQnpf9AfuEoIPactVyDhM=s0",
      "bannerUrl": null,
      "channelUrl": "https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A",
      "videos": [
        {
          "videoId": "jNQXAC9IVRw",
          "title": "Me at the zoo",
          "duration": 19,
          "viewCount": 431000000,
          "uploadDate": null,
          "thumbnail": "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg?sqp=-oaymwE2COADEI4CSFXyq4qpAygIARUAAIhCGAFwAcABBvABAfgBvgKAAvABigIMCAAQARhVIFkoZTAP&rs=AOn4CLDkGJrAGBspJ5G6u9b7tutsHbloEg"
        }
      ]
    }
  ],
  "usage": {
    "credits": 0.01
  },
  "created_at": "2026-09-16T07:41:47.218Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

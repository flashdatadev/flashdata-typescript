# Youtube Metadata

Wire source: `youtube_metadata`. Helper: `client.youtube.metadata`. Required input: `video_id`.
Modes: realtime, async, batch. [Product API reference](https://flashdata.dev/docs/sources/youtube_metadata).

## Runnable example

Run from the repository root after setting `FLASHDATA_API_KEY`:

```sh
node examples/youtube_metadata.mjs
```

```javascript
import { FlashData } from "../dist/index.js";
const client = new FlashData();
const response = await client.youtube.metadata({"video_id": "dQw4w9WgXcQ", "include_formats": false, "include_chapters": true});
console.log(response);
```

## Parameters

The helper takes the main input and the following source options. Generic query methods
put options inside `params`. Omitted defaults are resolved by the API, not inserted by
the SDK. Request options select mode/callback separately from source parameters.

| Parameter | Type | Server/catalog default | Meaning / bounds |
| --- | --- | --- | --- |
| `include_formats` | boolean | true |  |
| `include_chapters` | boolean | true |  |

For `filters`, see the complete property definitions in [source-contract.json](../../source-contract.json).

## Response example

Illustrative provider fields; availability varies. The SDK preserves unknown fields.

```json
{
  "source": "youtube_metadata",
  "status": "done",
  "results": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
      "description": "The official video for \u201cNever Gonna Give You Up\u201d by Rick Astley. \n\nNever: The Autobiography \ud83d\udcda OUT NOW! \nFollow this link to get your copy and listen to Rick\u2019s \u2018Never\u2019 playlist \u2764\ufe0f #RickAstleyNever\nhttps://linktr.ee/rickastleynever\n\n\u201cNever Gonna Give You Up\u201d was a global smash on its release in July 1987, topping the charts in 25 countries including Rick\u2019s native UK and the US Billboard Hot 100.  It also won the Brit Award for Best single in 1988. Stock Aitken and Waterman wrote and produced the track which was the lead-off single and lead track from Rick\u2019s debut LP \u201cWhenever You Need Somebody\u201d.  The album was itself a UK number one and would go on to sell over 15 million copies worldwide.\n\nThe legendary video was directed by Simon West \u2013 who later went on to make Hollywood blockbusters such as Con Air, Lara Croft \u2013 Tomb Raider and The Expendables 2.  The video passed the 1bn YouTube views milestone on 28 July 2021.\n\nSubscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/YTSubID\n\nFollow Rick Astley:\nFacebook: https://RickAstley.lnk.to/FBFollowID \nTwitter: https://RickAstley.lnk.to/TwitterID \nInstagram: https://RickAstley.lnk.to/InstagramID \nWebsite: https://RickAstley.lnk.to/storeID \nTikTok: https://RickAstley.lnk.to/TikTokID\n\nListen to Rick Astley:\nSpotify: https://RickAstley.lnk.to/SpotifyID \nApple Music: https://RickAstley.lnk.to/AppleMusicID \nAmazon Music: https://RickAstley.lnk.to/AmazonMusicID \nDeezer: https://RickAstley.lnk.to/DeezerID \n\nLyrics:\nWe\u2019re no strangers to love\nYou know the rules and so do I\nA full commitment\u2019s what I\u2019m thinking of\nYou wouldn\u2019t get this from any other guy\n\nI just wanna tell you how I\u2019m feeling\nGotta make you understand\n\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you\n\nWe\u2019ve known each other for so long\nYour heart\u2019s been aching but you\u2019re too shy to say it\nInside we both know what\u2019s been going on\nWe know the game and we\u2019re gonna play it\n\nAnd if you ask me how I\u2019m feeling\nDon\u2019t tell me you\u2019re too blind to see\n\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you\n\n#RickAstley #NeverGonnaGiveYouUp #WheneverYouNeedSomebody #OfficialMusicVideo",
      "channel": "Rick Astley",
      "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
      "channelUrl": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
      "channelSubscriberCount": 4540000,
      "viewCount": 1816253015,
      "likeCount": 19394097,
      "commentCount": 2400000,
      "uploadDate": "2009-10-25T00:00:00Z",
      "duration": 213,
      "durationString": "3:33",
      "thumbnails": [
        {
          "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/3.jpg",
          "width": null,
          "height": null
        }
      ],
      "categories": [
        "Music"
      ],
      "tags": [
        "rick astley"
      ],
      "ageLimit": 0,
      "isLive": false,
      "wasLive": false,
      "hasTranscripts": true,
      "transcriptLanguages": [
        "fr"
      ]
    }
  ],
  "usage": {
    "credits": 0.01
  },
  "created_at": "2026-09-16T07:45:41.114Z"
}
```

[Jobs and results](../jobs.md) · [Errors](../errors.md) · [Source index](index.md)

# Executable examples

Run commands from the repository root after installation/build. Source examples perform
one paid query, except the offline and account examples. Download reads a private file
named by `FLASHDATA_STORAGE_FILE`. No example creates an account or purchases Credits.

| Example | Purpose |
| --- | --- |
| offline | Simulated Google result; no key or network |
| account | Free access, balance, pricing and limits reads |
| async_query | Background submission, ID persistence, explicit wait, result retrieval |
| batch | Mixed-source batch, preserving per-item results |
| pagination | At most two paid Google pages, stopping on empty results |
| bulk | Create, upload and start a metadata collection; prints ID without waiting |
| async_client | Python's native async client (Python repository only) |

- `google_search.mjs`: [guide](../docs/sources/google_search.md).
- `google_images.mjs`: [guide](../docs/sources/google_images.md).
- `google_news.mjs`: [guide](../docs/sources/google_news.md).
- `google_shopping.mjs`: [guide](../docs/sources/google_shopping.md).
- `google_videos.mjs`: [guide](../docs/sources/google_videos.md).
- `google_places.mjs`: [guide](../docs/sources/google_places.md).
- `youtube_search.mjs`: [guide](../docs/sources/youtube_search.md).
- `youtube_search_extended.mjs`: [guide](../docs/sources/youtube_search_extended.md).
- `youtube_metadata.mjs`: [guide](../docs/sources/youtube_metadata.md).
- `youtube_transcript.mjs`: [guide](../docs/sources/youtube_transcript.md).
- `youtube_captions.mjs`: [guide](../docs/sources/youtube_captions.md).
- `youtube_trainability.mjs`: [guide](../docs/sources/youtube_trainability.md).
- `youtube_channel.mjs`: [guide](../docs/sources/youtube_channel.md).
- `youtube_suggestions.mjs`: [guide](../docs/sources/youtube_suggestions.md).
- `youtube_download.mjs`: [guide](../docs/sources/youtube_download.md).

The tests execute all source examples against fake transports. Local fixture data is
illustrative; it does not prove upstream availability. To run source examples live,
provide your own key and run the chosen script explicitly.

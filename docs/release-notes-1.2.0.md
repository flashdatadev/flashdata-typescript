# FlashData TypeScript SDK 1.2.0

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Transcript and captions now accept one language code or a list of 1–10 distinct
codes. Omit language to prefer `en-orig`, then `en`, returning one track.

- Explicit single-language requests keep their existing response shape.
- Lists, including one-element lists, return successful `tracks` and per-language
  `errors`. If no languages succeed, `tracks` is empty and the errors remain available.
- The selected automatic or uploader caption source applies to every language.
- Realtime, asynchronous, batch and bulk requests support the new language options.
  Bulk exports remain JSONL. Other API contracts and response-format defaults are unchanged.

Use `language: ["en", "es"]`; exported subtitle result types describe tracks and errors.

See the [subtitle examples](sources/youtube_transcript.md) and
[API documentation](https://flashdata.dev/docs/sources/youtube_transcript).

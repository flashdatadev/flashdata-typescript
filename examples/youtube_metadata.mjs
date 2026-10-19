/** YouTube metadata. See docs/sources/youtube_metadata.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'YouTube metadata',
    argv,
    {
      'include-formats': { type: 'boolean', default: false },
      'include-chapters': { type: 'boolean', default: false },
    },
    '[video_id]',
  );
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.youtube.metadata({
    video_id: positionals[0] ?? 'dQw4w9WgXcQ',
    include_formats: values['include-formats'],
    include_chapters: values['include-chapters'],
  });
  for (const video of response.results) {
    console.log(video.title ?? '', '|', video.channel ?? '', '| seconds:', video.duration);
    console.log('Caption languages:', (video.transcriptLanguages ?? []).join(', '));
  }
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

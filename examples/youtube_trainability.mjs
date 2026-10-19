/** YouTube license labels. See docs/sources/youtube_trainability.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command('YouTube license labels', argv, {}, '[video_id]');
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.youtube.licenseCheck({ video_id: positionals[0] ?? 'dQw4w9WgXcQ' });
  for (const video of response.results)
    console.log(video.videoId, 'Detected license labels:', (video.permitted ?? []).join(', '));
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

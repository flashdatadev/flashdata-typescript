/** YouTube channels. See docs/sources/youtube_channel.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'YouTube channels',
    argv,
    { 'video-limit': { type: 'string', default: '5' } },
    '[handle]',
  );
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.youtube.channel({
    handle: positionals[0] ?? '@freecodecamp',
    video_limit: integerOption(values['video-limit'], '--video-limit', 1, 100),
  });
  for (const channel of response.results) {
    console.log(channel.name ?? '', '| subscribers:', channel.subscriberCount);
    for (const video of channel.videos ?? []) console.log(video.title ?? '', video.videoId ?? '');
  }
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

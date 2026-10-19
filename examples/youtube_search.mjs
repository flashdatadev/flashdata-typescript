/** YouTube search. See docs/sources/youtube_search.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'YouTube search',
    argv,
    { 'max-results': { type: 'string', default: '5' }, short: { type: 'boolean', default: false } },
    '[query]',
  );
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.youtube.search({
    query: positionals[0] ?? 'python tutorial',
    max_results: integerOption(values['max-results'], '--max-results', 1, 20),
    filters: { type: 'video', ...(values.short ? { duration: '<4' } : {}) },
  });
  for (const payload of response.results)
    for (const video of payload.results ?? []) {
      console.log(
        video.title ?? '',
        '|',
        video.channel ?? '',
        video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : '',
      );
    }
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

/** YouTube suggestions. See docs/sources/youtube_suggestions.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'YouTube suggestions',
    argv,
    { language: { type: 'string', default: 'en' }, region: { type: 'string', default: 'US' } },
    '[query]',
  );
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.youtube.suggestions({
    query: positionals[0] ?? 'python',
    language: values.language,
    region: values.region,
  });
  for (const suggestions of response.results)
    for (const suggestion of suggestions) console.log(suggestion);
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

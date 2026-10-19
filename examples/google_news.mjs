/** Google news. See docs/sources/google_news.md. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, reportUsage, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Google news',
    argv,
    {
      num: { type: 'string', default: '5' },
      page: { type: 'string', default: '1' },
      gl: { type: 'string', default: 'us' },
      hl: { type: 'string', default: 'en' },
    },
    '[query]',
  );
  if (!args) return;
  const { values, positionals } = args;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.google.news({
    query: positionals[0] ?? 'renewable energy',
    num: integerOption(values.num, '--num', 1, 100),
    page: integerOption(values.page, '--page', 1, 100),
    gl: values.gl,
    hl: values.hl,
  });
  for (const payload of response.results)
    for (const hit of payload.news ?? []) {
      console.log(
        hit.title ?? '',
        '|',
        hit.source ?? '',
        '|',
        hit.date ?? '',
        '\n',
        hit.link ?? '',
      );
    }
  reportUsage(response);
  await saveJSON(response, values.output);
}

if (isMain(import.meta.url)) await run(main);

/** Export deduplicated Google results to CSV with an explicit page budget. */
import { mkdir, open } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, run } from './_support.mjs';
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export async function main(argv = process.argv.slice(2)) {
  const args = command('Search results to CSV', argv, {
    'max-pages': { type: 'string', default: '2' },
    num: { type: 'string', default: '5' },
  });
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const path = args.values.output ?? 'artifacts/search.csv';
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, 'w');
  const seen = new Set();
  let page = 0;
  let credits = 0;
  try {
    await file.writeFile('page,position,title,link,snippet\n');
    for await (const response of client.google.pages(
      'google_search',
      args.positionals[0] ?? 'coffee',
      {
        maxPages: integerOption(args.values['max-pages'], '--max-pages', 1, 100),
        params: { num: integerOption(args.values.num, '--num', 1, 100) },
      },
    )) {
      page++;
      credits += response.usage.credits;
      for (const payload of response.results)
        for (const hit of payload.organic ?? []) {
          if (hit.link && !seen.has(hit.link)) {
            seen.add(hit.link);
            await file.writeFile(
              [page, hit.position, hit.title, hit.link, hit.snippet].map(csv).join(',') + '\n',
            );
          }
        }
    }
  } finally {
    await file.close();
  }
  console.log(`Saved ${seen.size} unique links to ${path}; credits: ${credits}`);
}
if (isMain(import.meta.url)) await run(main);

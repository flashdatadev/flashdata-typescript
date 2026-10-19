/** A credential-free search demo with an injected HTTP response. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  if (!command('Offline SDK demonstration', argv, {}, '')) return;
  const client = new FlashData({
    apiKey: 'offline-demo-key',
    fetch: async () =>
      Response.json({
        source: 'google_search',
        status: 'done',
        results: [{ organic: [{ title: 'FlashData docs', link: 'https://flashdata.dev/docs' }] }],
        usage: { credits: 0 },
      }),
  });
  const response = await client.google.search({ query: 'FlashData SDK', num: 1 });
  for (const hit of response.results[0].organic) console.log(hit.title, hit.link);
}
if (isMain(import.meta.url)) await run(main);

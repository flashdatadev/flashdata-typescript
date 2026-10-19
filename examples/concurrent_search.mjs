/** Search a list with bounded concurrency, preserving individual failures. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, run, saveJSON } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Bounded concurrent searches',
    argv,
    { concurrency: { type: 'string', default: '2' } },
    '[queries...]',
    true,
  );
  if (!args) return;
  const queries = args.positionals.length ? args.positionals : ['coffee', 'tea'];
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const results = new Array(queries.length);
  let next = 0;
  async function worker() {
    while (next < queries.length) {
      const index = next++;
      const query = queries[index];
      try {
        results[index] = { query, response: await client.google.search({ query, num: 3 }) };
      } catch (error) {
        results[index] = {
          query,
          error: {
            name: error.name,
            message: error.message,
            statusCode: error.statusCode,
            code: error.code,
            requestId: error.requestId,
            retryAfter: error.retryAfter,
          },
        };
      }
    }
  }
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          queries.length,
          integerOption(args.values.concurrency, '--concurrency', 1, 50),
        ),
      },
      worker,
    ),
  );
  for (const result of results) {
    console.log(result.query);
    if (result.error) console.error(result.error.message);
    else
      for (const payload of result.response.results)
        for (const hit of payload.organic ?? []) console.log(' ', hit.title ?? '', hit.link ?? '');
  }
  await saveJSON(results, args.values.output);
  if (results.some((result) => result.error))
    throw new Error(
      'Some searches failed; inspect individual results before deciding what to submit again.',
    );
}
if (isMain(import.meta.url)) await run(main);

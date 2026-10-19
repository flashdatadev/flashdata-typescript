/** Compile and run with npm run examples:typescript -- coffee. */
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FlashData, type AsyncQuery, type GoogleSearchParams } from '@flashdata-dev/sdk';

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      background: { type: 'boolean', default: false },
    },
  });
  if (args.values.help) {
    console.log('Typed search example: [query] [--background]');
    return;
  }
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const params: GoogleSearchParams = { num: 3, gl: 'us', autocorrect: false };
  const response = await client.google.search({
    query: args.positionals[0] ?? 'coffee',
    ...params,
  });
  for (const payload of response.results)
    for (const hit of payload.organic ?? []) console.log(hit.title ?? '', hit.link ?? '');
  if (args.values.background) {
    const request: AsyncQuery = {
      source: 'youtube_metadata',
      video_id: 'dQw4w9WgXcQ',
      params: { include_formats: false },
    };
    const receipt = await client.queries.submit(request);
    console.log('Save this job ID:', receipt.id);
    await client.jobs.wait(receipt.id, { timeoutMs: 300000, pollIntervalMs: 3000 });
    console.log((await client.jobs.result(receipt.id)).status);
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

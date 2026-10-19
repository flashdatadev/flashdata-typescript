/** Submit a background search or resume an existing ID, then export results. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, integerOption, isMain, run, saveJSON } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command('Background search with recovery', argv, {
    'job-id': { type: 'string' },
    'wait-timeout-ms': { type: 'string', default: '300000' },
  });
  if (!args) return;
  const timeoutMs = integerOption(
    args.values['wait-timeout-ms'],
    '--wait-timeout-ms',
    1,
    2147483647,
  );
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  let id = args.values['job-id'];
  if (!id) {
    const receipt = await client.google.search(
      { query: args.positionals[0] ?? 'coffee', num: 3 },
      { mode: 'async' },
    );
    id = receipt.id;
    console.log('Save this job ID:', id);
    await saveJSON(receipt, args.values.output);
  }
  await client.jobs.wait(id, {
    timeoutMs,
    pollIntervalMs: 3000,
  });
  const response = await client.jobs.result(id);
  console.log('Completed:', id);
  for (const payload of response.results)
    for (const hit of payload.organic ?? []) console.log(hit.title ?? '', hit.link ?? '');
  await saveJSON(response, args.values.output);
}
if (isMain(import.meta.url)) await run(main);

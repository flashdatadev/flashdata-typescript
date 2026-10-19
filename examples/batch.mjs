/** Submit a mixed batch, persist receipts, and optionally wait for every result. */
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run, saveJSON } from './_support.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Mixed background batch',
    argv,
    {
      query: { type: 'string', default: 'coffee' },
      'video-id': { type: 'string', default: 'dQw4w9WgXcQ' },
      wait: { type: 'boolean', default: false },
    },
    '',
  );
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const batch = await client.queries.batch([
    { source: 'google_search', query: args.values.query, params: { num: 3 } },
    {
      source: 'youtube_metadata',
      video_id: args.values['video-id'],
      params: { include_formats: false },
    },
  ]);
  await saveJSON(batch, args.values.output);
  for (const item of batch.queries) console.log('Save this job ID:', item.source, item.id);
  if (args.values.wait) {
    const results = [];
    for (const item of batch.queries) {
      await client.jobs.wait(item.id, { timeoutMs: 300000, pollIntervalMs: 3000 });
      results.push(await client.jobs.result(item.id));
    }
    await saveJSON({ submission: batch, results }, args.values.output);
    console.log(`Completed ${results.length} jobs`);
  }
}
if (isMain(import.meta.url)) await run(main);

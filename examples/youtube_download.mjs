/** Submit one cloud media download and optionally wait for delivery. */
import { readFile } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run, saveJSON } from './_support.mjs';

export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Download one video to your cloud storage',
    argv,
    { 'storage-file': { type: 'string' }, wait: { type: 'boolean', default: false } },
    '[video_id]',
  );
  if (!args) return;
  const path = args.values['storage-file'] ?? process.env.FLASHDATA_STORAGE_FILE;
  if (!path) throw new Error('Set --storage-file or FLASHDATA_STORAGE_FILE; see docs/storage.md.');
  const storage = JSON.parse(await readFile(path, 'utf8'));
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const receipt = await client.youtube.download({
    video_id: args.positionals[0] ?? 'dQw4w9WgXcQ',
    storage,
    video_quality: '<=720',
    output_format: 'mp4',
  });
  console.log('Save this job ID:', receipt.id);
  await saveJSON(receipt, args.values.output);
  if (args.values.wait) {
    await client.jobs.wait(receipt.id, { timeoutMs: 600000, pollIntervalMs: 5000 });
    const result = await client.jobs.result(receipt.id);
    await saveJSON(result, args.values.output);
    console.log('Delivery completed. Inspect the result for destination object details.');
  }
}
if (isMain(import.meta.url)) await run(main);

/** Enrich a video ID file with metadata; resume existing IDs without resubmitting. */

import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run } from './_support.mjs';
import { bulkTask } from './_bulk.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Bulk metadata export',
    argv,
    { 'bulk-id': { type: 'string' }, 'wait-timeout-ms': { type: 'string', default: '3600000' } },
    '[video-ids.txt]',
  );
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  await bulkTask(client, args, async () => ({
    source: 'youtube_metadata',
    options: { include_formats: false },
  }));
}
if (isMain(import.meta.url)) await run(main);

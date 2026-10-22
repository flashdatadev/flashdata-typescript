/** Download a video ID file into cloud storage; resume existing IDs without resubmitting. */
import { readFile } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';
import { command, isMain, run } from './_support.mjs';
import { bulkTask } from './_bulk.mjs';
export async function main(argv = process.argv.slice(2)) {
  const args = command(
    'Bulk media download',
    argv,
    {
      'bulk-id': { type: 'string' },
      'wait-timeout-ms': { type: 'string', default: '3600000' },
      'storage-file': { type: 'string' },
      audio: { type: 'boolean', default: false },
    },
    '[video-ids.txt]',
  );
  if (!args) return;
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  await bulkTask(client, args, async () => ({
    source: 'youtube_download',
    options: {
      ...(args.values.audio
        ? { download_type: 'audio', output_format: 'mp3' }
        : { download_type: 'audio_video', video_quality: '<=720', output_format: 'mp4' }),
      storage: JSON.parse(
        await readFile(
          args.values['storage-file'] ??
            process.env.FLASHDATA_STORAGE_FILE ??
            'private-storage.json',
          'utf8',
        ),
      ),
    },
  }));
}
if (isMain(import.meta.url)) await run(main);

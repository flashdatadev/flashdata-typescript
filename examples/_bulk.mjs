/** Shared bulk lifecycle; save only the job record, never the signed upload descriptor. */
import { dirname } from 'node:path';
import { mkdir, open, stat } from 'node:fs/promises';
import { integerOption, saveJSON } from './_support.mjs';

export async function bulkTask(client, args, request) {
  const timeoutMs = integerOption(
    args.values['wait-timeout-ms'],
    '--wait-timeout-ms',
    1,
    2147483647,
  );
  const output = args.values.output ?? 'artifacts/dataset.ndjson';
  let id = args.values['bulk-id'];
  if (!id) {
    const path = args.positionals[0];
    if (!path) throw new Error('Provide an ID file or --bulk-id.');
    const file = await stat(path);
    if (!file.isFile() || file.size === 0 || file.size > 2147483648)
      throw new Error('Input must be a regular file of 1 byte to 2 GiB.');
    const receipt = await client.bulk.create(await request());
    id = receipt.job.id;
    console.log('Save this bulk ID:', id);
    await saveJSON(receipt.job, output + '.job.json');
    await client.bulk.uploadFile(receipt, path);
    await client.bulk.start(id);
  }
  const completed = await client.bulk.wait(id, {
    timeoutMs,
    pollIntervalMs: 3000,
  });
  await saveJSON(completed, output + '.job.json');
  await mkdir(dirname(output), { recursive: true });
  const file = await open(output, 'w');
  let count = 0;
  try {
    for await (const row of client.bulk.rows(id)) {
      await file.writeFile(JSON.stringify(row) + '\n', 'utf8');
      count++;
    }
  } finally {
    await file.close();
  }
  console.log(`Saved ${count} rows to ${output}; counts: ${JSON.stringify(completed.counts)}`);
  if (completed.counts.failed || completed.counts.invalid)
    throw new Error(
      'Bulk completed with failed or invalid items; inspect counts and exported rows.',
    );
}

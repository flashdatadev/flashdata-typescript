/** Shared bulk lifecycle; save only the job record, never the signed upload descriptor. */
import { dirname, join } from 'node:path';
import { mkdir, open, stat, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { integerOption } from './_support.mjs';

async function checkpoint(path, job) {
  const temporary = join(dirname(path), `.flashdata-job-${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(JSON.stringify(job, null, 2) + '\n', 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function bulkTask(client, args, request) {
  const timeoutMs = integerOption(
    args.values['wait-timeout-ms'],
    '--wait-timeout-ms',
    1,
    2147483647,
  );
  const output = args.values.output ?? 'artifacts/dataset.ndjson';
  const record = output + '.job.json';
  let id = args.values['bulk-id'];
  let payload;
  if (!id) {
    const path = args.positionals[0];
    if (!path) throw new Error('Provide an ID file or --bulk-id.');
    const file = await stat(path);
    if (!file.isFile() || file.size === 0 || file.size > 2147483648)
      throw new Error('Input must be a regular file of 1 byte to 2 GiB.');
    payload = await request();
  }
  await mkdir(dirname(output), { recursive: true });
  const file = await open(output, 'wx', 0o600);
  let count = 0;
  let failedRows = 0;
  let completed;
  try {
    // Reserve before any API call. Never replace an existing recovery record,
    // including an empty one left by an uncertain submission.
    const reservation = await open(record, 'wx', 0o600);
    await reservation.close();
    if (!id) {
      const receipt = await client.bulk.create(payload);
      id = receipt.job.id;
      console.log('Save this bulk ID:', id);
      await checkpoint(record, receipt.job);
      await client.bulk.uploadFile(receipt, args.positionals[0]);
      await client.bulk.start(id);
    } else {
      await checkpoint(record, { id });
    }
    completed = await client.bulk.wait(id, { timeoutMs, pollIntervalMs: 3000 });
    await checkpoint(record, completed);
    for await (const row of client.bulk.rows(id)) {
      await file.writeFile(JSON.stringify(row) + '\n', 'utf8');
      count++;
      if (row.status !== 'completed') failedRows++;
    }
    await file.sync();
  } finally {
    await file.close();
  }
  console.log(`Saved ${count} rows to ${output}; counts: ${JSON.stringify(completed.counts)}`);
  if (failedRows || completed.counts.failed || completed.counts.invalid)
    throw new Error(
      'Bulk completed with failed or invalid items; inspect counts and exported rows.',
    );
}

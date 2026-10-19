/** Explicit paid integration suite. Default test runs skip these requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FlashData, APIError } from '@flashdata-dev/sdk';

const enabled =
  process.env.FLASHDATA_RUN_LIVE === '1' && Boolean(process.env.FLASHDATA_LIVE_API_KEY);
const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/source-examples.json', import.meta.url), 'utf8'),
);
const dataSources = Object.keys(fixtures).filter((source) => source !== 'youtube_download');
const client = new FlashData({
  apiKey: process.env.FLASHDATA_LIVE_API_KEY ?? '',
  timeoutMs: 180000,
});

for (const source of dataSources) {
  test(`live realtime ${source}`, { skip: !enabled }, async () => {
    const response = await client.queries.realtime(fixtures[source].request);
    assert.equal(response.source, source);
    assert.equal(response.status, 'done');
    assert(response.results.length > 0);
    assert.equal(typeof response.usage.credits, 'number');
  });
}
test('live account and public contracts', { skip: !enabled }, async () => {
  assert.deepEqual(
    (await client.account.access()).sources.toSorted(),
    Object.keys(fixtures).toSorted(),
  );
  assert.equal(typeof (await client.account.balance()).availableCredits, 'number');
  assert(
    (await client.account.pricing({ source: 'youtube_metadata', request_count: 2 })).prices.length,
  );
  assert((await client.account.limits()).limits.batchSize > 0);
  assert.equal(typeof (await client.account.usage()).totals, 'object');
  const publicClient = new FlashData({ apiKey: '' });
  assert.deepEqual(
    (await publicClient.public.sources()).data.map((s) => s.id).toSorted(),
    Object.keys(fixtures).toSorted(),
  );
  assert.equal((await publicClient.public.plans()).currency, 'USD');
  assert((await publicClient.public.health()).status);
  assert((await publicClient.public.status()).status);
});
test('live background query and all data sources in a batch', { skip: !enabled }, async () => {
  const receipt = await client.google.search({ query: 'coffee', num: 3 }, { mode: 'async' });
  assert.equal(
    (await client.jobs.wait(receipt.id, { timeoutMs: 300000, pollIntervalMs: 3000 })).status,
    'completed',
  );
  assert.equal((await client.jobs.result(receipt.id)).source, 'google_search');
  const batch = await client.queries.batch(dataSources.map((source) => fixtures[source].request));
  assert.equal(batch.queries.length, dataSources.length);
  for (const item of batch.queries) {
    assert(item.id);
    assert.equal(
      (await client.jobs.wait(item.id, { timeoutMs: 300000, pollIntervalMs: 3000 })).status,
      'completed',
    );
    const result = await client.jobs.result(item.id);
    assert.equal(result.source, item.source);
    assert(result.results.length > 0);
  }
});
test(
  'live bulk upload, result rows, listing, draft update and cancel',
  { skip: !enabled },
  async () => {
    const draft = await client.bulk.create({ source: 'youtube_metadata' });
    await client.bulk.update(draft.job.id, { options: { include_formats: false } });
    assert.equal((await client.bulk.cancel(draft.job.id)).status, 'cancelled');
    const receipt = await client.bulk.create({
      source: 'youtube_metadata',
      options: { include_formats: false },
    });
    const directory = await mkdtemp(join(tmpdir(), 'flashdata-live-'));
    try {
      const path = join(directory, 'ids.txt');
      await writeFile(path, 'dQw4w9WgXcQ\ninvalid\n');
      await client.bulk.uploadFile(receipt, path);
      await client.bulk.start(receipt.job.id);
      const completed = await client.bulk.wait(receipt.job.id, {
        timeoutMs: 360000,
        pollIntervalMs: 3000,
      });
      assert.equal(completed.counts.completed, 1);
      assert.equal(completed.counts.invalid, 1);
      const manifest = await client.bulk.manifest(receipt.job.id);
      assert(manifest.parts.length);
      const rows = [];
      for await (const row of client.bulk.rows(receipt.job.id)) rows.push(row);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].video_id, 'dQw4w9WgXcQ');
      assert.equal(rows[0].status, 'completed');
      const jobs = [];
      for await (const job of client.bulk.iterJobs({ maxPages: 2, limit: 1 })) jobs.push(job);
      assert(jobs.length > 0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
test('live management errors include request IDs', { skip: !enabled }, async () => {
  await assert.rejects(
    client.jobs.get('job_sdk_review_nonexistent'),
    (error) => error instanceof APIError && error.statusCode === 404 && Boolean(error.requestId),
  );
});

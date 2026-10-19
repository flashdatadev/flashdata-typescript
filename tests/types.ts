import { FlashData, type Source, type RealtimeQuery } from '../src/index.js';
const client = new FlashData({ apiKey: 'test' });
const source: Source = 'google_search';
const query: RealtimeQuery = { source, query: 'coffee', params: { autocorrect: false } };
void query;
void client.youtube.transcript({ video_id: 'dQw4w9WgXcQ', auto: false });
// @ts-expect-error max_results is a number
void client.youtube.search({ query: 'coffee', max_results: '10' });
// @ts-expect-error typo in source
const bad: Source = 'google_seach';
// @ts-expect-error download is not a realtime source
const download: RealtimeQuery = { source: 'youtube_download', video_id: 'dQw4w9WgXcQ' };
void bad;
void download;

async function typeCoverage() {
  const realtime = await client.google.search({ query: 'coffee' });
  const status: string = realtime.status;
  const credits: number | undefined = realtime.usage.credits;
  const createdAt: string = realtime.created_at;
  void [status, credits, createdAt];
  const receipt = await client.google.search({ query: 'coffee' }, { mode: 'async' });
  await client.jobs.wait(receipt.id);
  const batch = await client.queries.batch([
    { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ' },
  ]);
  for (const item of batch.queries) await client.jobs.wait(item.id);
  const storage = {
    storage_type: 's3' as const,
    storage_url: 'bucket',
    region: 'us-east-1',
    access_key: 'test',
    secret_key: 'test',
  };
  await client.bulk.create({ source: 'youtube_download', options: { storage } });
  await client.bulk.create({
    source: 'youtube_metadata',
    options: { include_formats: false, result_storage: storage },
  });
  // @ts-expect-error downloads require a storage destination
  void client.youtube.download({ video_id: 'dQw4w9WgXcQ' });
  // @ts-expect-error downloads are background only
  void client.youtube.download({ video_id: 'dQw4w9WgXcQ', storage }, { mode: 'realtime' });
  // @ts-expect-error bulk downloads require options.storage
  void client.bulk.create({ source: 'youtube_download' });
  // @ts-expect-error metadata options do not include auto
  void client.bulk.create({ source: 'youtube_metadata', options: { auto: true } });
  // @ts-expect-error nested filter literals are constrained
  void client.youtube.search({ query: 'coffee', filters: { sort_by: 'popularity' } });
}
void typeCoverage;

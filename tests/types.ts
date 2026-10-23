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
  const jobResult = await client.jobs.result(receipt.id);
  const completedAt: string = jobResult.completed_at;
  const possibleCredits: number | undefined = jobResult.usage?.credits;
  // @ts-expect-error background results have no guaranteed created_at
  const created: string = jobResult.created_at;
  void [completedAt, possibleCredits, created];
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
  await client.bulk.create({ source: 'youtube_metadata', options: { result_storage: null } });
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

// Response formats preserve precise types and reject incompatible mode options.
import type {
  MarkdownQueryResult,
  ResponseAccept,
  ContentRepresentation,
  ResponseOptions,
  ContentOptions,
  SourceRequestOptions,
  SourceQueryResponse,
  JobResult,
  ConsoleJob,
  AsyncSubmission,
  BatchResponse,
  DataQueryResponse,
} from '../src/index.js';
function expectType<T>(value: T): void {
  void value;
}
async function formatTypes(
  accept: ResponseAccept,
  respondWith: ContentRepresentation | undefined,
  mode: 'realtime' | 'async',
) {
  expectType<SourceQueryResponse<'google_search'>>(await client.google.search({ query: 'openai' }));
  expectType<MarkdownQueryResult>(
    await client.google.search({ query: 'openai' }, { respondWith: 'markdown' }),
  );
  expectType<string>(await client.google.search({ query: 'openai' }, { accept: 'text/plain' }));
  expectType<string>(
    await client.google.search(
      { query: 'openai' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.search(
      { query: 'openai' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.search({ query: 'openai' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.google.search({ query: 'openai' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_search'> | MarkdownQueryResult | string>(
    await client.google.search({ query: 'openai' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_search'> | AsyncSubmission | string>(
    await client.google.search({ query: 'openai' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'google_shopping'>>(
    await client.google.shopping({ query: 'mechanical keyboard' }),
  );
  expectType<MarkdownQueryResult>(
    await client.google.shopping({ query: 'mechanical keyboard' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.google.shopping({ query: 'mechanical keyboard' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.google.shopping(
      { query: 'mechanical keyboard' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.shopping(
      { query: 'mechanical keyboard' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.shopping(
      { query: 'mechanical keyboard' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.google.shopping({ query: 'mechanical keyboard' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_shopping'> | MarkdownQueryResult | string>(
    await client.google.shopping({ query: 'mechanical keyboard' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_shopping'> | AsyncSubmission | string>(
    await client.google.shopping({ query: 'mechanical keyboard' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'google_images'>>(
    await client.google.images({ query: 'tokyo skyline' }),
  );
  expectType<MarkdownQueryResult>(
    await client.google.images({ query: 'tokyo skyline' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.google.images({ query: 'tokyo skyline' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.google.images(
      { query: 'tokyo skyline' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.images(
      { query: 'tokyo skyline' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.images({ query: 'tokyo skyline' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.google.images({ query: 'tokyo skyline' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_images'> | MarkdownQueryResult | string>(
    await client.google.images({ query: 'tokyo skyline' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_images'> | AsyncSubmission | string>(
    await client.google.images({ query: 'tokyo skyline' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_search'>>(
    await client.youtube.search({ query: 'python' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.search({ query: 'python' }, { respondWith: 'markdown' }),
  );
  expectType<string>(await client.youtube.search({ query: 'python' }, { accept: 'text/plain' }));
  expectType<string>(
    await client.youtube.search(
      { query: 'python' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.search(
      { query: 'python' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.search({ query: 'python' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.search({ query: 'python' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_search'> | MarkdownQueryResult | string>(
    await client.youtube.search({ query: 'python' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_search'> | AsyncSubmission | string>(
    await client.youtube.search({ query: 'python' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'google_videos'>>(
    await client.google.videos({ query: 'me at the zoo' }),
  );
  expectType<MarkdownQueryResult>(
    await client.google.videos({ query: 'me at the zoo' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.google.videos({ query: 'me at the zoo' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.google.videos(
      { query: 'me at the zoo' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.videos(
      { query: 'me at the zoo' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.videos({ query: 'me at the zoo' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.google.videos({ query: 'me at the zoo' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_videos'> | MarkdownQueryResult | string>(
    await client.google.videos({ query: 'me at the zoo' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_videos'> | AsyncSubmission | string>(
    await client.google.videos({ query: 'me at the zoo' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'google_places'>>(
    await client.google.places({ query: 'coffee in san francisco' }),
  );
  expectType<MarkdownQueryResult>(
    await client.google.places({ query: 'coffee in san francisco' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.google.places({ query: 'coffee in san francisco' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.google.places(
      { query: 'coffee in san francisco' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.places(
      { query: 'coffee in san francisco' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.places(
      { query: 'coffee in san francisco' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.google.places({ query: 'coffee in san francisco' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_places'> | MarkdownQueryResult | string>(
    await client.google.places({ query: 'coffee in san francisco' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_places'> | AsyncSubmission | string>(
    await client.google.places({ query: 'coffee in san francisco' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_search_extended'>>(
    await client.youtube.searchExtended({ query: 'python' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.searchExtended({ query: 'python' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.searchExtended({ query: 'python' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.searchExtended(
      { query: 'python' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.searchExtended(
      { query: 'python' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.searchExtended(
      { query: 'python' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.searchExtended({ query: 'python' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_search_extended'> | MarkdownQueryResult | string>(
    await client.youtube.searchExtended({ query: 'python' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_search_extended'> | AsyncSubmission | string>(
    await client.youtube.searchExtended({ query: 'python' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_suggestions'>>(
    await client.youtube.suggestions({ query: 'python' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.suggestions({ query: 'python' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.suggestions({ query: 'python' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.suggestions(
      { query: 'python' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.suggestions(
      { query: 'python' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.suggestions({ query: 'python' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.suggestions({ query: 'python' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_suggestions'> | MarkdownQueryResult | string>(
    await client.youtube.suggestions({ query: 'python' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_suggestions'> | AsyncSubmission | string>(
    await client.youtube.suggestions({ query: 'python' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_channel'>>(
    await client.youtube.channel({ handle: '@jawed' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.channel({ handle: '@jawed' }, { respondWith: 'markdown' }),
  );
  expectType<string>(await client.youtube.channel({ handle: '@jawed' }, { accept: 'text/plain' }));
  expectType<string>(
    await client.youtube.channel(
      { handle: '@jawed' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.channel(
      { handle: '@jawed' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.channel({ handle: '@jawed' }, { mode: 'async', accept: 'text/plain' }),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.channel({ handle: '@jawed' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_channel'> | MarkdownQueryResult | string>(
    await client.youtube.channel({ handle: '@jawed' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_channel'> | AsyncSubmission | string>(
    await client.youtube.channel({ handle: '@jawed' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_metadata'>>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.metadata(
      { video_id: 'dQw4w9WgXcQ' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.metadata(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.metadata(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_metadata'> | MarkdownQueryResult | string>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_metadata'> | AsyncSubmission | string>(
    await client.youtube.metadata({ video_id: 'dQw4w9WgXcQ' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_transcript'>>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.transcript(
      { video_id: 'dQw4w9WgXcQ' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.transcript(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.transcript(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_transcript'> | MarkdownQueryResult | string>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_transcript'> | AsyncSubmission | string>(
    await client.youtube.transcript({ video_id: 'dQw4w9WgXcQ' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_captions'>>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.captions(
      { video_id: 'dQw4w9WgXcQ' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.captions(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.captions(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_captions'> | MarkdownQueryResult | string>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_captions'> | AsyncSubmission | string>(
    await client.youtube.captions({ video_id: 'dQw4w9WgXcQ' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'youtube_trainability'>>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }),
  );
  expectType<MarkdownQueryResult>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.youtube.licenseCheck(
      { video_id: 'dQw4w9WgXcQ' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.youtube.licenseCheck(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.youtube.licenseCheck(
      { video_id: 'dQw4w9WgXcQ' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'youtube_trainability'> | MarkdownQueryResult | string>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'youtube_trainability'> | AsyncSubmission | string>(
    await client.youtube.licenseCheck({ video_id: 'dQw4w9WgXcQ' }, { accept, mode }),
  );

  expectType<SourceQueryResponse<'google_news'>>(
    await client.google.news({ query: 'renewable energy' }),
  );
  expectType<MarkdownQueryResult>(
    await client.google.news({ query: 'renewable energy' }, { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.google.news({ query: 'renewable energy' }, { accept: 'text/plain' }),
  );
  expectType<string>(
    await client.google.news(
      { query: 'renewable energy' },
      { accept: 'text/plain', respondWith: 'markdown' },
    ),
  );
  expectType<AsyncSubmission>(
    await client.google.news(
      { query: 'renewable energy' },
      { mode: 'async', callback_url: 'https://callback.example/done' },
    ),
  );
  expectType<string>(
    await client.google.news(
      { query: 'renewable energy' },
      { mode: 'async', accept: 'text/plain' },
    ),
  );
  expectType<AsyncSubmission | string>(
    await client.google.news({ query: 'renewable energy' }, { mode: 'async', accept }),
  );
  expectType<SourceQueryResponse<'google_news'> | MarkdownQueryResult | string>(
    await client.google.news({ query: 'renewable energy' }, { accept, respondWith }),
  );
  expectType<SourceQueryResponse<'google_news'> | AsyncSubmission | string>(
    await client.google.news({ query: 'renewable energy' }, { accept, mode }),
  );

  expectType<AsyncSubmission>(
    await client.youtube.download({
      video_id: 'dQw4w9WgXcQ',
      storage: { storage_type: 's3', storage_url: 'bucket' },
    }),
  );
  expectType<string>(
    await client.youtube.download(
      { video_id: 'dQw4w9WgXcQ', storage: { storage_type: 's3', storage_url: 'bucket' } },
      { accept: 'text/plain' },
    ),
  );

  expectType<DataQueryResponse>(
    await client.queries.realtime({ source: 'google_search', query: 'coffee' }),
  );
  expectType<string>(
    await client.queries.realtime(
      { source: 'google_search', query: 'coffee' },
      { accept: 'text/plain' },
    ),
  );
  expectType<MarkdownQueryResult>(
    await client.queries.realtime(
      { source: 'google_search', query: 'coffee' },
      { respondWith: 'markdown' },
    ),
  );
  expectType<string>(
    await client.queries.submit(
      { source: 'google_search', query: 'coffee' },
      { accept: 'text/plain' },
    ),
  );
  expectType<BatchResponse | string>(
    await client.queries.batch([{ source: 'google_search', query: 'coffee' }], { accept }),
  );
  expectType<ConsoleJob>(await client.jobs.get('job_example'));
  expectType<string>(await client.jobs.get('job_example', { accept: 'text/plain' }));
  expectType<JobResult>(await client.jobs.result('job_example'));
  expectType<MarkdownQueryResult>(
    await client.jobs.result('job_example', { respondWith: 'markdown' }),
  );
  expectType<string>(
    await client.jobs.result('job_example', { accept: 'text/plain', respondWith: 'markdown' }),
  );
}
void formatTypes;

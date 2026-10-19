import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import type { FlashData, RequestOptions } from './client.js';
import type * as T from './types.js';
import {
  bulkInput,
  identifier,
  integer,
  positive,
  sources,
  validateQuery,
  jobRecord,
  record,
} from './common.js';
import {
  JobFailedError,
  JobPausedError,
  PollingTimeoutError,
  ProtocolError,
  RequestAbortedError,
  RequestTimeoutError,
  ResponseTooLargeError,
  ValidationError,
} from './errors.js';

export interface PollOptions extends RequestOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}
export interface SourceRequestOptions extends RequestOptions {
  mode?: 'realtime' | 'async';
  callback_url?: string | null;
}
class Resource {
  constructor(protected readonly client: FlashData) {}
  protected async poll<T extends { status: string } & Record<string, unknown>>(
    id: string,
    bulk: boolean,
    options: PollOptions,
  ): Promise<T> {
    identifier(id, bulk);
    const deadline =
      performance.now() + positive(options.timeoutMs ?? (bulk ? 3600000 : 300000), 'timeoutMs');
    const interval = positive(options.pollIntervalMs ?? (bulk ? 5000 : 2000), 'pollIntervalMs');
    while (true) {
      if (options.signal?.aborted)
        throw new RequestAbortedError(
          'Polling was cancelled locally; accepted work continues.',
          id,
        );
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new PollingTimeoutError(id);
      let job: T;
      try {
        job = jobRecord<T>(
          await this.client._request('GET', (bulk ? '/bulk-jobs/' : '/jobs/') + id, {
            ...options,
            timeoutMs: Math.max(1, Math.floor(Math.min(remaining, this.client.timeoutMs))),
          }),
        );
      } catch (error) {
        if (error instanceof RequestAbortedError)
          throw new RequestAbortedError(
            'Polling was cancelled locally; accepted work continues.',
            id,
          );
        if (error instanceof RequestTimeoutError && performance.now() >= deadline - 1)
          throw new PollingTimeoutError(id);
        throw error;
      }
      if (performance.now() >= deadline) throw new PollingTimeoutError(id);
      if (job.status === 'completed') return job;
      if (bulk && job.status === 'paused') throw new JobPausedError(job);
      if (job.status === 'failed' || (bulk && job.status === 'cancelled'))
        throw new JobFailedError(job);
      if (
        !(bulk ? ['awaiting_upload', 'running', 'finalizing'] : ['pending', 'processing']).includes(
          job.status,
        )
      )
        throw new ProtocolError('Unexpected job status.');
      try {
        await sleep(Math.min(interval, Math.max(0, deadline - performance.now())), undefined, {
          signal: options.signal,
        });
      } catch (error) {
        if (options.signal?.aborted)
          throw new RequestAbortedError(
            'Polling was cancelled locally; accepted work continues.',
            id,
          );
        throw error;
      }
    }
  }
}
export class Queries extends Resource {
  realtime(query: T.RealtimeQuery, options: RequestOptions = {}): Promise<T.DataQueryResponse> {
    return this.client._request('POST', '/v1/queries/realtime', {
      ...options,
      data: true,
      body: validateQuery(query),
    });
  }
  submit(query: T.AsyncQuery, options: RequestOptions = {}): Promise<T.AsyncSubmission> {
    return this.client._request('POST', '/v1/queries', {
      ...options,
      data: true,
      body: validateQuery(query, true),
    });
  }
  batch(queries: T.AsyncQuery[], options: RequestOptions = {}): Promise<T.BatchResponse> {
    if (!Array.isArray(queries) || !queries.length)
      throw new ValidationError('Provide a non-empty query array; plan batch limits apply.');
    return this.client._request('POST', '/v1/queries/batch', {
      ...options,
      data: true,
      body: { queries: queries.map((q) => validateQuery(q, true)) },
    });
  }
}
export class Account extends Resource {
  access(options: RequestOptions = {}): Promise<T.ApiAccess> {
    return this.client._request('GET', '/api-access', options);
  }
  balance(options: RequestOptions = {}): Promise<T.ApiAccessBalance> {
    return this.client._request('GET', '/api-access/balance', options);
  }
  limits(options: RequestOptions = {}): Promise<T.ApiAccessLimits> {
    return this.client._request('GET', '/api-access/limits', options);
  }
  pricing(
    params: { source?: T.Source; request_count?: number } = {},
    options: RequestOptions = {},
  ): Promise<T.ApiAccessPricing> {
    integer(params.request_count ?? 1, 'request_count', 1, 100000);
    if (params.source && !sources.includes(params.source))
      throw new ValidationError('Unknown source.');
    return this.client._request('GET', '/api-access/pricing', { ...options, params });
  }
  usage(
    params: { source?: T.Source; from?: string; to?: string } = {},
    options: RequestOptions = {},
  ): Promise<T.ApiKeyUsage> {
    if (params.source && !sources.includes(params.source))
      throw new ValidationError('Unknown source.');
    return this.client._request('GET', '/usage', { ...options, params });
  }
}
export class Public extends Resource {
  sources(options: RequestOptions = {}): Promise<{ data: T.DataSource[] }> {
    return this.client._request('GET', '/catalog/sources', { ...options, public: true });
  }
  plans(options: RequestOptions = {}): Promise<T.PlanCatalog> {
    return this.client._request('GET', '/plans', { ...options, public: true });
  }
  status(options: RequestOptions = {}): Promise<T.PublicStatus> {
    return this.client._request('GET', '/status', { ...options, public: true });
  }
  health(options: RequestOptions = {}): Promise<T.Health> {
    return this.client._request('GET', '/health', { ...options, public: true });
  }
}
export class Jobs extends Resource {
  async get(id: string, options: RequestOptions = {}): Promise<T.ConsoleJob> {
    return jobRecord<T.ConsoleJob>(
      await this.client._request<{ job: T.ConsoleJob }>('GET', '/jobs/' + identifier(id), options),
    );
  }
  result(id: string, options: RequestOptions = {}): Promise<T.JobResult> {
    return this.client._result('/jobs/' + identifier(id) + '/results', false, options);
  }
  wait(id: string, options: PollOptions = {}): Promise<T.ConsoleJob> {
    return this.poll<T.ConsoleJob>(id, false, options);
  }
}
export class Bulk extends Resource {
  create(request: T.CreateBulkJobRequest, options: RequestOptions = {}): Promise<T.BulkJobCreated> {
    return this.client._request('POST', '/bulk-jobs', { ...options, body: bulkInput(request) });
  }
  async get(id: string, options: RequestOptions = {}): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>(
        'GET',
        '/bulk-jobs/' + identifier(id, true),
        options,
      ),
    );
  }
  list(
    params: { cursor?: string; limit?: number } = {},
    options: RequestOptions = {},
  ): Promise<T.BulkJobPage> {
    integer(params.limit ?? 20, 'limit', 1, 50);
    return this.client._request('GET', '/bulk-jobs', { ...options, params });
  }
  async update(
    id: string,
    request: T.UpdateBulkJobRequest,
    options: RequestOptions = {},
  ): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>('PATCH', '/bulk-jobs/' + identifier(id, true), {
        ...options,
        body: bulkInput(request, true),
      }),
    );
  }
  uploadFile(created: T.BulkJobCreated, path: string, options: RequestOptions = {}): Promise<void> {
    return this.client._upload(created, path, options);
  }
  manifest(id: string, options: RequestOptions = {}): Promise<BulkManifest> {
    return this.client._result('/bulk-jobs/' + identifier(id, true) + '/results', false, options);
  }
  part(id: string, partNumber: number, options: RequestOptions = {}): Promise<Uint8Array> {
    integer(partNumber, 'partNumber', 0, Number.MAX_SAFE_INTEGER);
    return this.client._result(
      '/bulk-jobs/' + identifier(id, true) + '/results/' + partNumber,
      true,
      options,
    );
  }
  async *iterRows(
    id: string,
    partNumber: number,
    options: RequestOptions = {},
  ): AsyncGenerator<Record<string, unknown>> {
    const bytes = await this.part(id, partNumber, options);
    const input = Readable.from([bytes]);
    const stream = bytes[0] === 0x1f && bytes[1] === 0x8b ? input.pipe(createGunzip()) : input;
    let pending = '';
    let total = 0;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const checkAborted = () => {
      if (options.signal?.aborted)
        throw new RequestAbortedError('Bulk result iteration was cancelled locally.', id);
    };
    try {
      for await (const chunk of stream) {
        checkAborted();
        total += chunk.byteLength;
        if (total > this.client.maxResponseBytes)
          throw new ResponseTooLargeError('Decompressed part exceeds maxResponseBytes.');
        pending += decoder.decode(chunk, { stream: true });
        let end: number;
        while ((end = pending.indexOf('\n')) >= 0) {
          checkAborted();
          const line = pending.slice(0, end);
          pending = pending.slice(end + 1);
          if (Buffer.byteLength(line) > this.client.maxLineBytes)
            throw new ResponseTooLargeError('NDJSON row exceeds maxLineBytes.');
          if (line.trim()) yield parseRow(line);
        }
        if (Buffer.byteLength(pending) > this.client.maxLineBytes)
          throw new ResponseTooLargeError('NDJSON row exceeds maxLineBytes.');
      }
      pending += decoder.decode();
      checkAborted();
      if (pending.trim()) yield parseRow(pending);
    } catch (error) {
      if (error instanceof ProtocolError || error instanceof RequestAbortedError) throw error;
      throw new ProtocolError('Invalid, truncated, or non-UTF-8 bulk result part.');
    } finally {
      stream.destroy();
      input.destroy();
    }
  }
  wait(id: string, options: PollOptions = {}): Promise<T.BulkJob> {
    return this.poll<T.BulkJob>(id, true, options);
  }
  async start(id: string, options: RequestOptions = {}): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>(
        'POST',
        '/bulk-jobs/' + identifier(id, true) + '/start',
        options,
      ),
    );
  }
  async pause(id: string, options: RequestOptions = {}): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>(
        'POST',
        '/bulk-jobs/' + identifier(id, true) + '/pause',
        options,
      ),
    );
  }
  async resume(id: string, options: RequestOptions = {}): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>(
        'POST',
        '/bulk-jobs/' + identifier(id, true) + '/resume',
        options,
      ),
    );
  }
  async cancel(id: string, options: RequestOptions = {}): Promise<T.BulkJob> {
    return jobRecord<T.BulkJob>(
      await this.client._request<T.BulkJobResponse>(
        'DELETE',
        '/bulk-jobs/' + identifier(id, true) + '',
        options,
      ),
    );
  }
  /** Yield all result rows in manifest order, buffering one bounded part at a time. */
  async *rows(id: string, options: RequestOptions = {}): AsyncGenerator<T.BulkResultRow> {
    const manifest = await this.manifest(id, options);
    if (!Array.isArray(manifest.parts))
      throw new ProtocolError('Bulk manifest is missing its parts list.');
    const seen = new Set<number>();
    for (const part of manifest.parts) {
      if (
        !record(part) ||
        !Number.isSafeInteger(part.number) ||
        part.number < 0 ||
        seen.has(part.number)
      )
        throw new ProtocolError('Invalid or duplicate bulk part number.');
      seen.add(part.number);
      for await (const row of this.iterRows(id, part.number, options))
        yield row as unknown as T.BulkResultRow;
    }
  }
  /** Iterate a bounded number of free bulk cursor pages. */
  async *iterJobs(
    params: { maxPages: number; limit?: number; cursor?: string },
    options: RequestOptions = {},
  ): AsyncGenerator<T.BulkJob> {
    integer(params.maxPages, 'maxPages', 1, 1000);
    let cursor = params.cursor;
    const seen = new Set<string>(cursor ? [cursor] : []);
    for (let index = 0; index < params.maxPages; index++) {
      const page = await this.list({ limit: params.limit, cursor }, options);
      if (!Array.isArray(page.data) || !record(page.pagination))
        throw new ProtocolError('Invalid bulk listing response.');
      for (const job of page.data) {
        if (!record(job)) throw new ProtocolError('Expected a bulk job object.');
        yield job;
      }
      if (!page.pagination.hasMore) return;
      cursor = page.pagination.nextCursor ?? undefined;
      if (typeof cursor !== 'string' || !cursor || seen.has(cursor))
        throw new ProtocolError('Bulk listing returned an invalid or repeated cursor.');
      seen.add(cursor);
    }
  }
}
export interface BulkManifest {
  id: string;
  source: T.Source;
  status: 'completed';
  counts: Record<string, number>;
  parts: Array<{
    number: number;
    first_index: number;
    last_index: number;
    item_count: number;
    href: string;
    method: 'GET';
  }>;
  completed_at: string;
  expires_at: string;
  [key: string]: unknown;
}
function parseRow(line: string): Record<string, unknown> {
  try {
    const row = JSON.parse(line);
    if (row && typeof row === 'object' && !Array.isArray(row)) return row;
  } catch {}
  throw new ProtocolError('Invalid NDJSON object row.');
}

export class Google extends Resource {
  search(
    input: { query: string } & T.GoogleSearchParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_search'>>;
  search(
    input: { query: string } & T.GoogleSearchParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_search */
  search(
    input: { query: string } & T.GoogleSearchParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_search',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  images(
    input: { query: string } & T.GoogleImagesParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_images'>>;
  images(
    input: { query: string } & T.GoogleImagesParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_images */
  images(
    input: { query: string } & T.GoogleImagesParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_images',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  news(
    input: { query: string } & T.GoogleNewsParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_news'>>;
  news(
    input: { query: string } & T.GoogleNewsParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_news */
  news(
    input: { query: string } & T.GoogleNewsParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_news',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  shopping(
    input: { query: string } & T.GoogleShoppingParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_shopping'>>;
  shopping(
    input: { query: string } & T.GoogleShoppingParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_shopping */
  shopping(
    input: { query: string } & T.GoogleShoppingParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_shopping',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  videos(
    input: { query: string } & T.GoogleVideosParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_videos'>>;
  videos(
    input: { query: string } & T.GoogleVideosParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_videos */
  videos(
    input: { query: string } & T.GoogleVideosParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_videos',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  places(
    input: { query: string } & T.GooglePlacesParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'google_places'>>;
  places(
    input: { query: string } & T.GooglePlacesParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/google_places */
  places(
    input: { query: string } & T.GooglePlacesParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'google_places',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  async *pages(
    source: Extract<T.Source, `google_${string}`>,
    query: string,
    options: RequestOptions & {
      maxPages: number;
      startPage?: number;
      params?: Record<string, unknown>;
    },
  ): AsyncGenerator<T.DataQueryResponse> {
    const keys: Record<string, string> = {
      google_search: 'organic',
      google_images: 'images',
      google_news: 'news',
      google_shopping: 'shopping',
      google_videos: 'videos',
      google_places: 'places',
    };
    if (!Object.hasOwn(keys, source) || (options.params && 'page' in options.params))
      throw new ValidationError('Choose a Google source and use startPage for pagination.');
    const start = integer(options.startPage ?? 1, 'startPage', 1, 100);
    integer(options.maxPages, 'maxPages', 1, 100);
    if (start + options.maxPages > 101)
      throw new ValidationError('Requested pagination exceeds page 100.');
    for (let page = start; page < start + options.maxPages; page++) {
      const response = await this.client.queries.realtime(
        { source, query, params: { ...options.params, page } } as T.RealtimeQuery,
        options,
      );
      yield response;
      if (
        !response.results?.some(
          (item) =>
            item &&
            typeof item === 'object' &&
            Boolean((item as Record<string, unknown>)[keys[source]]) &&
            Array.isArray((item as Record<string, unknown>)[keys[source]]) &&
            ((item as Record<string, unknown>)[keys[source]] as unknown[]).length > 0,
        )
      )
        break;
    }
  }
}

export class YouTube extends Resource {
  search(
    input: { query: string } & T.YoutubeSearchParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_search'>>;
  search(
    input: { query: string } & T.YoutubeSearchParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_search */
  search(
    input: { query: string } & T.YoutubeSearchParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_search',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  searchExtended(
    input: { query: string } & T.YoutubeSearchExtendedParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_search_extended'>>;
  searchExtended(
    input: { query: string } & T.YoutubeSearchExtendedParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_search_extended */
  searchExtended(
    input: { query: string } & T.YoutubeSearchExtendedParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_search_extended',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  metadata(
    input: { video_id: string } & T.YoutubeMetadataParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_metadata'>>;
  metadata(
    input: { video_id: string } & T.YoutubeMetadataParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_metadata */
  metadata(
    input: { video_id: string } & T.YoutubeMetadataParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_metadata',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  transcript(
    input: { video_id: string } & T.YoutubeTranscriptParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_transcript'>>;
  transcript(
    input: { video_id: string } & T.YoutubeTranscriptParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_transcript */
  transcript(
    input: { video_id: string } & T.YoutubeTranscriptParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_transcript',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  captions(
    input: { video_id: string } & T.YoutubeCaptionsParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_captions'>>;
  captions(
    input: { video_id: string } & T.YoutubeCaptionsParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_captions */
  captions(
    input: { video_id: string } & T.YoutubeCaptionsParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_captions',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  licenseCheck(
    input: { video_id: string } & T.YoutubeTrainabilityParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_trainability'>>;
  licenseCheck(
    input: { video_id: string } & T.YoutubeTrainabilityParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_trainability */
  licenseCheck(
    input: { video_id: string } & T.YoutubeTrainabilityParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_trainability',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  channel(
    input: { handle: string } & T.YoutubeChannelParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_channel'>>;
  channel(
    input: { handle: string } & T.YoutubeChannelParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_channel */
  channel(
    input: { handle: string } & T.YoutubeChannelParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { handle, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_channel',
      handle,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  suggestions(
    input: { query: string } & T.YoutubeSuggestionsParams,
    options?: SourceRequestOptions & { mode?: 'realtime' },
  ): Promise<T.SourceQueryResponse<'youtube_suggestions'>>;
  suggestions(
    input: { query: string } & T.YoutubeSuggestionsParams,
    options: SourceRequestOptions & { mode: 'async' },
  ): Promise<T.AsyncSubmission>;
  /** https://flashdata.dev/docs/sources/youtube_suggestions */
  suggestions(
    input: { query: string } & T.YoutubeSuggestionsParams,
    options: SourceRequestOptions = {},
  ): Promise<T.DataQueryResponse | T.AsyncSubmission> {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    const payload = {
      source: 'youtube_suggestions',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return mode === 'async'
      ? this.client.queries.submit(payload as T.AsyncQuery, options)
      : this.client.queries.realtime(payload as T.RealtimeQuery, options);
  }
  /** Submit media delivery to customer cloud storage. Downloads always run in the background. */
  download(
    input: { video_id: string } & T.YoutubeDownloadParams,
    options: Omit<SourceRequestOptions, 'mode'> & { mode?: 'async' } = {},
  ): Promise<T.AsyncSubmission> {
    const { video_id, ...params } = input;
    if (options.mode !== undefined && options.mode !== 'async')
      throw new ValidationError('Downloads support mode=async only.');
    return this.client.queries.submit(
      {
        source: 'youtube_download',
        video_id,
        params,
        ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
      },
      options,
    );
  }
}

import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { setTimeout as sleep } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import type {
  FlashData,
  RequestOptions,
  ResponseOptions,
  ContentOptions,
  RequestOptionsInput,
} from './client.js';
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
  responseFormat,
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
export type SourceRequestOptions =
  | (ContentOptions & { mode?: 'realtime'; callback_url?: never })
  | (ResponseOptions & { mode: 'async'; callback_url?: string | null });
export type DownloadRequestOptions = ResponseOptions & {
  mode?: 'async';
  callback_url?: string | null;
};
export type SourceResult<
  JSON,
  Accept extends T.ResponseAccept | undefined,
  Representation extends T.ContentRepresentation | undefined,
  Mode extends 'realtime' | 'async' | undefined,
> = Mode extends 'async'
  ? T.ResponseResult<T.AsyncSubmission, Accept>
  : T.ContentResult<JSON, Accept, Representation>;

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
      const pollingDeadlineLimitsRequest = remaining <= this.client.timeoutMs;
      let job: T;
      try {
        job = jobRecord<T>(
          await this.client._request('GET', (bulk ? '/bulk-jobs/' : '/jobs/') + id, {
            ...options,
            timeoutMs: Math.max(1, Math.ceil(Math.min(remaining, this.client.timeoutMs))),
          }),
        );
      } catch (error) {
        if (error instanceof RequestAbortedError)
          throw new RequestAbortedError(
            'Polling was cancelled locally; accepted work continues.',
            id,
          );
        // Timers can fire early; use the budget that limited the status request.
        if (
          error instanceof RequestTimeoutError &&
          (pollingDeadlineLimitsRequest || performance.now() >= deadline)
        )
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
  realtime<const O extends ContentOptions = {}>(
    query: T.RealtimeQuery,
    options: RequestOptionsInput<O, ContentOptions> = {} as RequestOptionsInput<O, ContentOptions>,
  ): Promise<T.ContentResult<T.DataQueryResponse, O['accept'], O['respondWith']>> {
    return this.client._request('POST', '/v1/queries/realtime', {
      ...options,
      data: true,
      responseFormat: responseFormat(options),
      body: validateQuery(query),
    });
  }
  submit<const O extends ResponseOptions = {}>(
    query: T.AsyncQuery,
    options: RequestOptionsInput<O, ResponseOptions> = {} as RequestOptionsInput<
      O,
      ResponseOptions
    >,
  ): Promise<T.ResponseResult<T.AsyncSubmission, O['accept']>> {
    return this.client._request('POST', '/v1/queries', {
      ...options,
      data: true,
      responseFormat: responseFormat(options, false),
      body: validateQuery(query, true),
    });
  }
  batch<const O extends ResponseOptions = {}>(
    queries: T.AsyncQuery[],
    options: RequestOptionsInput<O, ResponseOptions> = {} as RequestOptionsInput<
      O,
      ResponseOptions
    >,
  ): Promise<T.ResponseResult<T.BatchResponse, O['accept']>> {
    if (!Array.isArray(queries) || !queries.length)
      throw new ValidationError('Provide a non-empty query array; plan batch limits apply.');
    return this.client._request('POST', '/v1/queries/batch', {
      ...options,
      data: true,
      body: { queries: queries.map((q) => validateQuery(q, true)) },
      responseFormat: responseFormat(options, false),
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
  async get<const O extends ResponseOptions = {}>(
    id: string,
    options: RequestOptionsInput<O, ResponseOptions> = {} as RequestOptionsInput<
      O,
      ResponseOptions
    >,
  ): Promise<T.ResponseResult<T.ConsoleJob, O['accept']>> {
    const value = await this.client._request('GET', '/jobs/' + identifier(id), {
      ...options,
      responseFormat: responseFormat(options, false),
    });
    return (typeof value === 'string' ? value : jobRecord<T.ConsoleJob>(value)) as T.ResponseResult<
      T.ConsoleJob,
      O['accept']
    >;
  }
  result<const O extends ContentOptions = {}>(
    id: string,
    options: RequestOptionsInput<O, ContentOptions> = {} as RequestOptionsInput<O, ContentOptions>,
  ): Promise<T.ContentResult<T.JobResult, O['accept'], O['respondWith']>> {
    return this.client._result('/jobs/' + identifier(id) + '/results', false, options, options);
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
  /** https://flashdata.dev/docs/sources/google_search */
  search<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GoogleSearchParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_search'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_search',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<T.SourceQueryResponse<'google_search'>, O['accept'], O['respondWith'], O['mode']>
    >;
  }
  /** https://flashdata.dev/docs/sources/google_images */
  images<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GoogleImagesParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_images'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_images',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<T.SourceQueryResponse<'google_images'>, O['accept'], O['respondWith'], O['mode']>
    >;
  }
  /** https://flashdata.dev/docs/sources/google_news */
  news<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GoogleNewsParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_news'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_news',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<T.SourceQueryResponse<'google_news'>, O['accept'], O['respondWith'], O['mode']>
    >;
  }
  /** https://flashdata.dev/docs/sources/google_shopping */
  shopping<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GoogleShoppingParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_shopping'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_shopping',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'google_shopping'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/google_videos */
  videos<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GoogleVideosParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_videos'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_videos',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<T.SourceQueryResponse<'google_videos'>, O['accept'], O['respondWith'], O['mode']>
    >;
  }
  /** https://flashdata.dev/docs/sources/google_places */
  places<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.GooglePlacesParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'google_places'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'google_places',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<T.SourceQueryResponse<'google_places'>, O['accept'], O['respondWith'], O['mode']>
    >;
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
        { signal: options.signal, timeoutMs: options.timeoutMs },
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
  /** https://flashdata.dev/docs/sources/youtube_search */
  search<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.YoutubeSearchParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'youtube_search'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_search',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_search'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_search_extended */
  searchExtended<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.YoutubeSearchExtendedParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_search_extended'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_search_extended',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_search_extended'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_metadata */
  metadata<const O extends SourceRequestOptions = {}>(
    input: { video_id: string } & T.YoutubeMetadataParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_metadata'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_metadata',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_metadata'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_transcript */
  transcript<const O extends SourceRequestOptions = {}>(
    input: { video_id: string } & T.YoutubeTranscriptParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_transcript'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_transcript',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_transcript'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_captions */
  captions<const O extends SourceRequestOptions = {}>(
    input: { video_id: string } & T.YoutubeCaptionsParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_captions'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_captions',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_captions'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_trainability */
  licenseCheck<const O extends SourceRequestOptions = {}>(
    input: { video_id: string } & T.YoutubeTrainabilityParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_trainability'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { video_id, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_trainability',
      video_id,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_trainability'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_channel */
  channel<const O extends SourceRequestOptions = {}>(
    input: { handle: string } & T.YoutubeChannelParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<T.SourceQueryResponse<'youtube_channel'>, O['accept'], O['respondWith'], O['mode']>
  > {
    const { handle, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_channel',
      handle,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_channel'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** https://flashdata.dev/docs/sources/youtube_suggestions */
  suggestions<const O extends SourceRequestOptions = {}>(
    input: { query: string } & T.YoutubeSuggestionsParams,
    options: RequestOptionsInput<O, SourceRequestOptions> = {} as RequestOptionsInput<
      O,
      SourceRequestOptions
    >,
  ): Promise<
    SourceResult<
      T.SourceQueryResponse<'youtube_suggestions'>,
      O['accept'],
      O['respondWith'],
      O['mode']
    >
  > {
    const { query, ...params } = input;
    const mode = options.mode ?? 'realtime';
    if (!['realtime', 'async'].includes(mode))
      throw new ValidationError('mode must be realtime or async.');
    if (mode === 'realtime' && options.callback_url !== undefined)
      throw new ValidationError('Callbacks apply only to background queries.');
    responseFormat(options, mode === 'realtime');
    const payload = {
      source: 'youtube_suggestions',
      query,
      ...(Object.keys(params).length ? { params } : {}),
      ...(options.callback_url !== undefined ? { callback_url: options.callback_url } : {}),
    };
    return (
      mode === 'async'
        ? this.client.queries.submit(payload as T.AsyncQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
          })
        : this.client.queries.realtime(payload as T.RealtimeQuery, {
            signal: options.signal,
            timeoutMs: options.timeoutMs,
            accept: options.accept,
            respondWith: options.respondWith,
          })
    ) as Promise<
      SourceResult<
        T.SourceQueryResponse<'youtube_suggestions'>,
        O['accept'],
        O['respondWith'],
        O['mode']
      >
    >;
  }
  /** Submit media delivery to customer cloud storage. Downloads always run in the background. */
  download<const O extends DownloadRequestOptions = {}>(
    input: { video_id: string } & T.YoutubeDownloadParams,
    options: RequestOptionsInput<O, DownloadRequestOptions> = {} as RequestOptionsInput<
      O,
      DownloadRequestOptions
    >,
  ): Promise<T.ResponseResult<T.AsyncSubmission, O['accept']>> {
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
      { signal: options.signal, timeoutMs: options.timeoutMs, accept: options.accept },
    ) as Promise<T.ResponseResult<T.AsyncSubmission, O['accept']>>;
  }
}

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { inspect } from 'node:util';
import { Account, Bulk, Google, Jobs, Public, Queries, YouTube } from './resources.js';
import { apiError, decodeJSON, integer, origin, positive, secretValues, signedURL } from './common.js';
import { ConnectionError, FlashDataError, ProtocolError, RequestTimeoutError, ResponseTooLargeError, SubmissionUnknownError, ValidationError } from './errors.js';
import type { BulkJobCreated } from './types.js';

export interface FlashDataOptions {
  apiKey?: string;
  dataURL?: string;
  managementURL?: string;
  /** Network deadline in milliseconds, including reading the body. Default: 120000. */
  timeoutMs?: number;
  /** Maximum bytes per response and decompressed result part. Default: 64 MiB. */
  maxResponseBytes?: number;
  /** HTTP injection for testing or a configured fetch implementation. */
  fetch?: typeof globalThis.fetch;
  storageFetch?: typeof globalThis.fetch;
}
export interface RequestOptions { signal?: AbortSignal; timeoutMs?: number }
export interface InternalRequest extends RequestOptions {
  body?: unknown; params?: Record<string, string | number | undefined>;
  data?: boolean; public?: boolean; redirect?: boolean;
}

/** FlashData's server-side client. No requests are automatically retried. */
export class FlashData {
  #key: string;
  #fetch: typeof globalThis.fetch;
  #storageFetch: typeof globalThis.fetch;
  readonly dataURL: string;
  readonly managementURL: string;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly queries: Queries;
  readonly account: Account;
  readonly jobs: Jobs;
  readonly bulk: Bulk;
  readonly google: Google;
  readonly youtube: YouTube;
  readonly public: Public;

  constructor(options: FlashDataOptions = {}) {
    if (typeof window !== 'undefined') throw new ValidationError('Use FlashData on your server to protect the API key.');
    const key = options.apiKey ?? process.env.FLASHDATA_API_KEY;
    if (typeof key !== 'string' || !key.trim() || /[\r\n]/.test(key)) throw new ValidationError('Set FLASHDATA_API_KEY or pass apiKey.');
    this.#key = key.trim();
    this.dataURL = origin(options.dataURL ?? 'https://data.flashdata.dev');
    this.managementURL = origin(options.managementURL ?? 'https://api.flashdata.dev');
    this.timeoutMs = integer(positive(options.timeoutMs ?? 120000, 'timeoutMs'), 'timeoutMs', 1, 2147483647);
    this.maxResponseBytes = integer(options.maxResponseBytes ?? 64 * 1024 * 1024, 'maxResponseBytes', 1, Number.MAX_SAFE_INTEGER);
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#storageFetch = options.storageFetch ?? options.fetch ?? globalThis.fetch;
    this.queries = new Queries(this); this.account = new Account(this); this.jobs = new Jobs(this);
    this.bulk = new Bulk(this); this.google = new Google(this); this.youtube = new YouTube(this); this.public = new Public(this);
  }
  toJSON(): Record<string, string> { return {client: 'FlashData'}; }
  [inspect.custom](): string { return 'FlashData {}'; }
  #signal(options: RequestOptions): AbortSignal {
    const deadline = AbortSignal.timeout(integer(options.timeoutMs ?? this.timeoutMs, 'timeoutMs', 1, 2147483647));
    return options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  }
  async #read(response: Response): Promise<Uint8Array> {
    if (!response.body) return new Uint8Array();
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.maxResponseBytes) { await reader.cancel(); throw new ResponseTooLargeError('Response exceeds maxResponseBytes.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }
  async _request<T = Record<string, any>>(method: string, path: string, options: InternalRequest = {}): Promise<T> {
    const signal = this.#signal(options);
    const url = new URL((options.data ? this.dataURL : this.managementURL + '/v2') + path);
    for (const [k, v] of Object.entries(options.params ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
    const headers: Record<string, string> = {'Accept': 'application/json', 'User-Agent': 'flashdata-typescript/0.1.0'};
    if (!options.public) headers['X-API-Key'] = this.#key;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      const response = await this.#fetch(url, {method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body),
        redirect: 'manual', credentials: 'omit', signal});
      if (options.redirect && response.status === 302) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new ProtocolError('Signed result redirect is missing its location.');
        return location as T;
      }
      const bytes = await this.#read(response);
      if (!response.ok) throw apiError(response, bytes, [this.#key, ...secretValues(options.body)]);
      return decodeJSON(bytes) as T;
    } catch (error) {
      if (error instanceof FlashDataError) throw error;
      if (method !== 'GET') throw new SubmissionUnknownError('Submission response was lost. Check Jobs before submitting again.');
      if (signal.aborted) throw new RequestTimeoutError(options.signal?.aborted ? 'Read request was cancelled.' : 'Read request timed out.');
      throw new ConnectionError('Network request failed.');
    }
  }
  async _result(path: string, binary: boolean, options: RequestOptions = {}): Promise<any> {
    const location = await this._request<any>('GET', path, {...options, redirect: true});
    if (typeof location !== 'string') {
      if (binary) throw new ProtocolError('Expected a signed result redirect.');
      return location;
    }
    const access = await this.account.access(options);
    const url = signedURL(location, access.result_origin);
    const signal = this.#signal(options);
    try {
      const response = await this.#storageFetch(url, {method: 'GET', redirect: 'manual', credentials: 'omit', signal,
        headers: {'Accept': 'application/json'}});
      const bytes = await this.#read(response);
      if (!response.ok) throw apiError(response, bytes, [this.#key, url]);
      return binary ? bytes : decodeJSON(bytes);
    } catch (error) {
      if (error instanceof FlashDataError) throw error;
      if (signal.aborted) throw new RequestTimeoutError('Signed result read timed out or was cancelled.');
      throw new ConnectionError('Signed result read failed.');
    }
  }
  async _upload(created: BulkJobCreated, path: string, options: RequestOptions = {}): Promise<void> {
    const upload = created.upload;
    if (upload?.method !== 'PUT' || upload.contentType !== 'text/plain; charset=utf-8') throw new ProtocolError('Invalid bulk upload descriptor.');
    const {size} = await stat(path);
    if (!size || size > 2147483648) throw new ValidationError('Bulk input must contain 1 byte to 2 GiB of UTF-8 video IDs.');
    const access = await this.account.access(options);
    const url = signedURL(upload.href, access.result_origin);
    const stream = createReadStream(path, {highWaterMark: 65536});
    try {
      const init: RequestInit & {duplex: 'half'} = {method: 'PUT', body: stream as unknown as BodyInit, duplex: 'half',
        redirect: 'manual', credentials: 'omit', signal: this.#signal(options),
        headers: {'Content-Type': upload.contentType, 'Content-Length': String(size)}};
      const response = await this.#storageFetch(url, init);
      const bytes = await this.#read(response);
      if (!response.ok) throw apiError(response, bytes, [this.#key, url]);
    } catch (error) {
      if (error instanceof FlashDataError) throw error;
      throw new ConnectionError('Bulk upload failed. Keep the bulk ID; upload and start separately.');
    } finally { stream.destroy(); }
  }
}

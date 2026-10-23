import Ajv2020 from 'ajv/dist/2020.js';
import { BlockList, isIP } from 'node:net';
import schemas from './schemas.json';
import { APIError, ProtocolError, ValidationError } from './errors.js';
import type { ResponseAccept, ContentRepresentation } from './types.js';

/** @internal */
export class ResultRedirect {
  constructor(readonly location: string) {}
}

/** @internal */
export function responseFormat(
  options: { accept?: unknown; respondWith?: unknown },
  content = true,
): { accept: ResponseAccept; respondWith?: ContentRepresentation } {
  const accept = options.accept === undefined ? 'application/json' : options.accept;
  if (accept !== 'application/json' && accept !== 'text/plain')
    throw new ValidationError('accept must be application/json or text/plain.');
  if (options.respondWith !== undefined && (!content || options.respondWith !== 'markdown'))
    throw new ValidationError(
      'respondWith supports markdown on realtime queries and completed results only.',
    );
  return { accept, respondWith: options.respondWith as ContentRepresentation | undefined };
}

/** @internal */
export function decodeResponse(bytes: Uint8Array, accept: ResponseAccept): unknown {
  if (accept !== 'text/plain') return decodeJSON(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new ProtocolError('The response was not valid UTF-8 text.');
  }
}

export const sources = Object.freeze(Object.keys(schemas));
export const bulkSources = [
  'youtube_metadata',
  'youtube_transcript',
  'youtube_captions',
  'youtube_trainability',
  'youtube_download',
];
const secretKeys = new Set([
  'api_key',
  'access_key',
  'secret_key',
  'private_key',
  'sas_token',
  'authorization',
  'x-api-key',
]);
const ajv = new Ajv2020({ strict: false, allErrors: false, allowUnionTypes: true });
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
const privateAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  privateAddresses.addSubnet(network, prefix, 'ipv4');
for (const [source, original] of Object.entries(schemas)) {
  for (const asyncMode of [false, true]) {
    const schema = structuredClone(original) as any;
    schema.additionalProperties = false;
    if (asyncMode) schema.properties.callback_url = { type: ['string', 'null'], maxLength: 2048 };
    validators.set(`${source}:${asyncMode}`, ajv.compile(schema));
  }
}

export function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function positive(n: number, name: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0)
    throw new ValidationError(`${name} must be a finite positive number.`);
  return n;
}
export function integer(n: number, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new ValidationError(`${name} must be an integer from ${min} to ${max}.`);
  return n;
}
export function origin(input: string): string {
  let url: URL;
  try {
    if (typeof input !== 'string') throw new Error();
    url = new URL(input);
  } catch {
    throw new ValidationError('Invalid API origin.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new ValidationError(
      'API URLs must be origins without credentials, paths, queries or fragments.',
    );
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new ValidationError('HTTP is supported only for loopback development.');
  return url.origin;
}
export function signedURL(input: string, advertised: string | null | undefined): string {
  if (typeof input !== 'string' || typeof advertised !== 'string')
    throw new ProtocolError('The API has not advertised a signed-storage origin.');
  try {
    const url = new URL(input);
    if (url.username || url.password || url.hash || origin(url.origin) !== origin(advertised))
      throw new Error();
  } catch {
    throw new ProtocolError('Signed URL does not match the authenticated storage origin.');
  }
  return input;
}
export function identifier(id: string, bulk = false): string {
  if (
    typeof id !== 'string' ||
    !(bulk ? /^bulk_[A-Za-z0-9_-]{8,}$/ : /^job_[A-Za-z0-9_-]+$/).test(id)
  )
    throw new ValidationError(bulk ? 'Invalid bulk ID.' : 'Invalid job ID.');
  return id;
}
export function encodeJSON(value: unknown): string {
  try {
    const result = JSON.stringify(value, (_key, entry) => {
      if (
        ['function', 'symbol', 'bigint'].includes(typeof entry) ||
        (typeof entry === 'number' && !Number.isFinite(entry))
      )
        throw new Error();
      if (entry instanceof Map || entry instanceof Set || ArrayBuffer.isView(entry))
        throw new Error();
      return entry;
    });
    if (result === undefined) throw new Error();
    return result;
  } catch {
    throw new ValidationError('Request values must be valid JSON.');
  }
}
export function validateCallback(value: unknown): void {
  if (value === null || value === undefined || value === '') return;
  try {
    if (typeof value !== 'string' || value.length > 2048) throw new Error();
    const url = new URL(value);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    // DNS validation remains authoritative on the service; reject private IP literals locally.
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      url.port ||
      !host.includes('.') ||
      (isIP(host) === 4 && privateAddresses.check(host, 'ipv4'))
    )
      throw new Error();
  } catch {
    throw new ValidationError('callback_url must be a public HTTPS URL on port 443.');
  }
}
export function validateQuery(input: unknown, asyncMode = false): Record<string, unknown> {
  if (!record(input)) throw new ValidationError('Expected a query object.');
  const value = JSON.parse(encodeJSON(input)) as Record<string, unknown>;
  if (typeof value.source !== 'string') throw new ValidationError('Choose a supported source.');
  const validator = validators.get(`${value.source}:${asyncMode}`);
  if (!validator) throw new ValidationError('Unknown source.');
  if (!asyncMode && value.source === 'youtube_download')
    throw new ValidationError('Downloads support background submission and batch only.');
  if (!validator(value)) {
    const error = validator.errors?.[0];
    const detail =
      error?.keyword === 'minimum'
        ? `must be at least ${error.params.limit}`
        : error?.keyword === 'maximum'
          ? `must be at most ${error.params.limit}`
          : error?.keyword === 'required'
            ? `missing required field ${error.params.missingProperty}`
            : `violates ${error?.keyword}`;
    throw new ValidationError(`Invalid query${error?.instancePath ?? ''}: ${detail}.`);
  }
  for (const field of ['query', 'handle', 'video_id'])
    if (typeof value[field] === 'string' && !(value[field] as string).trim())
      throw new ValidationError(`${field} must not be blank.`);
  validateCallback(value.callback_url);
  return value;
}
const storageValidator = ajv.compile(schemas.youtube_download.properties.params.properties.storage);
export function bulkInput(input: unknown, partial = false): Record<string, unknown> {
  if (!record(input)) throw new ValidationError('Expected a bulk request object.');
  const value = JSON.parse(encodeJSON(input)) as Record<string, any>;
  const allowed = partial ? ['options', 'callback_url'] : ['source', 'options', 'callback_url'];
  if (!Object.keys(value).length || Object.keys(value).some((k) => !allowed.includes(k)))
    throw new ValidationError('Invalid bulk request fields.');
  if (!partial && !bulkSources.includes(value.source))
    throw new ValidationError('Unsupported bulk source.');
  if ('options' in value && !record(value.options))
    throw new ValidationError('Bulk options must be an object.');
  validateCallback(value.callback_url);
  if (!partial) {
    const options = { ...value.options };
    if ('result_storage' in options) {
      const destination = options.result_storage;
      delete options.result_storage;
      if (
        value.source === 'youtube_download' ||
        (destination != null && !storageValidator(destination))
      )
        throw new ValidationError('Invalid options.result_storage configuration.');
    }
    validateQuery({ source: value.source, video_id: 'dQw4w9WgXcQ', params: options }, true);
  }
  return value;
}
export function secretValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(secretValues);
  if (record(value))
    return Object.entries(value).flatMap(([k, v]) =>
      secretKeys.has(k.toLowerCase()) && typeof v === 'string' ? [v] : secretValues(v),
    );
  return [];
}
export function redact(value: unknown, values: string[]): unknown {
  if (Array.isArray(value)) return value.map((v) => redact(v, values));
  if (record(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        secretKeys.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, values),
      ]),
    );
  if (typeof value === 'string')
    for (const secret of values)
      if (secret) value = (value as string).split(secret).join('[REDACTED]');
  return value;
}
export function apiError(response: Response, raw: Uint8Array, values: string[]): APIError {
  let data: any;
  try {
    data = redact(JSON.parse(new TextDecoder().decode(raw)), values);
  } catch {
    data = undefined;
  }
  const message = data?.detail || data?.message || data?.title;
  return new APIError(
    response.status,
    typeof message === 'string' ? message : `HTTP ${response.status}.`,
    data?.code,
    response.headers.get('x-request-id') ?? data?.requestId,
    response.headers.get('retry-after') ??
      (data?.retry_after != null ? String(data.retry_after) : undefined),
    data,
  );
}
export function decodeJSON(bytes: Uint8Array): Record<string, any> {
  try {
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (record(data)) return data;
  } catch {
    /* normalized below */
  }
  throw new ProtocolError('Expected a valid JSON object response.');
}
export function jobRecord<T>(value: unknown): T {
  if (!record(value) || !record(value.job))
    throw new ProtocolError('Expected a job response containing a job object.');
  return value.job as T;
}

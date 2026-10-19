import Ajv2020 from 'ajv/dist/2020.js';
import schemas from './schemas.json';
import { APIError, ProtocolError, ValidationError } from './errors.js';

export const sources = Object.freeze(Object.keys(schemas));
export const bulkSources = ['youtube_metadata', 'youtube_transcript', 'youtube_captions', 'youtube_trainability', 'youtube_download'];
const secrets = new Set(['api_key', 'access_key', 'secret_key', 'private_key', 'sas_token', 'authorization', 'x-api-key']);
const ajv = new Ajv2020({strict: false, allErrors: false, allowUnionTypes: true});
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
for (const [source, original] of Object.entries(schemas)) {
  for (const asyncMode of [false, true]) {
    const schema: any = structuredClone(original);
    schema.additionalProperties = false;
    if (asyncMode) schema.properties.callback_url = {type: ['string', 'null'], maxLength: 2048};
    validators.set(`${source}:${asyncMode}`, ajv.compile(schema));
  }
}
export function positive(n: number, name: string): number {
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`${name} must be a finite positive number.`);
  return n;
}
export function integer(n: number, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new ValidationError(`${name} must be an integer from ${min} to ${max}.`);
  return n;
}
export function origin(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new ValidationError('Invalid API origin.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new ValidationError('API URLs must be origins without credentials, paths, queries or fragments.');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new ValidationError('HTTP is supported only for loopback development.');
  return url.origin;
}
export function signedURL(input: string, advertised: string | null | undefined): string {
  if (typeof input !== 'string' || typeof advertised !== 'string') throw new ProtocolError('The API has not advertised a signed-storage origin.');
  try {
    const url = new URL(input);
    if (url.username || url.password || url.hash || origin(url.origin) !== origin(advertised)) throw new Error();
  } catch { throw new ProtocolError('Signed URL does not match the authenticated storage origin.'); }
  return input;
}
export function identifier(id: string, bulk = false): string {
  if (typeof id !== 'string' || !(bulk ? /^bulk_[A-Za-z0-9_-]{8,}$/ : /^job_[A-Za-z0-9_-]+$/).test(id))
    throw new ValidationError(bulk ? 'Invalid bulk ID.' : 'Invalid job ID.');
  return id;
}
export function validateQuery(input: unknown, asyncMode = false): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('Expected a query object.');
  const value = structuredClone(input) as Record<string, unknown>;
  const validator = validators.get(`${value.source}:${asyncMode}`);
  if (!validator) throw new ValidationError('Unknown source.');
  if (!asyncMode && value.source === 'youtube_download') throw new ValidationError('Downloads support background submission and batch only.');
  if (!validator(value)) throw new ValidationError(`Invalid query${validator.errors?.[0]?.instancePath ?? ''}: violates ${validator.errors?.[0]?.keyword}.`);
  if (value.callback_url) {
    let url: URL;
    try { url = new URL(value.callback_url as string); } catch { throw new ValidationError('Invalid callback_url.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port)
      throw new ValidationError('callback_url must be a public HTTPS URL on port 443.');
  }
  return value;
}
export function bulkInput(input: unknown, partial = false): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('Expected a bulk request object.');
  const value = structuredClone(input) as Record<string, any>;
  const allowed = partial ? ['options', 'callback_url'] : ['source', 'options', 'callback_url'];
  if (!Object.keys(value).length || Object.keys(value).some(k => !allowed.includes(k))) throw new ValidationError('Invalid bulk request fields.');
  if (!partial && !bulkSources.includes(value.source)) throw new ValidationError('Unsupported bulk source.');
  if ('options' in value && (!value.options || typeof value.options !== 'object' || Array.isArray(value.options))) throw new ValidationError('Bulk options must be an object.');
  if ('callback_url' in value && value.callback_url !== null && typeof value.callback_url !== 'string') throw new ValidationError('Invalid callback_url.');
  if (!partial && value.source === 'youtube_download' && !value.options?.storage) throw new ValidationError('Bulk downloads require options.storage.');
  return value;
}
export function secretValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(secretValues);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => secrets.has(k.toLowerCase()) && typeof v === 'string' ? [v] : secretValues(v));
  return [];
}
export function redact(value: unknown, values: string[]): unknown {
  if (Array.isArray(value)) return value.map(v => redact(v, values));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, secrets.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, values)]));
  if (typeof value === 'string') for (const secret of values) if (secret) value = (value as string).split(secret).join('[REDACTED]');
  return value;
}
export function apiError(response: Response, raw: Uint8Array, values: string[]): APIError {
  let data: any;
  try { data = redact(JSON.parse(new TextDecoder().decode(raw)), values); } catch { data = undefined; }
  const message = data?.detail || data?.message || data?.title;
  return new APIError(response.status, typeof message === 'string' ? message : `HTTP ${response.status}.`, data?.code,
    response.headers.get('x-request-id') ?? undefined, response.headers.get('retry-after') ?? undefined, data);
}
export function decodeJSON(bytes: Uint8Array): Record<string, any> {
  try { const data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch { /* normalized below */ }
  throw new ProtocolError('Expected a valid JSON object response.');
}

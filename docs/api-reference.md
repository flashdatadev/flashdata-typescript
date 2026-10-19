# API coverage

Both Data and Management APIs use the same customer's API key. The Data origin is
`https://data.flashdata.dev`; Management routes below use `https://api.flashdata.dev/v2`.
Only `/v1/queries*` routes use the Data origin. The checked-in [OpenAPI snapshot](../openapi.json)
contains the wire schemas and all supported operations.

| Operation | Purpose |
| --- | --- |
| GET `/health` | Service health |
| GET `/status` | Read the public component status summary |
| GET `/catalog/sources` | List public source capabilities without account-specific pricing |
| GET `/plans` | List public USD plans and prices |
| GET `/api-access` | Read the calling API key's authorized sources and result origin |
| GET `/api-access/balance` | Read the live account balance using an API key |
| GET `/api-access/pricing` | Read actual account prices for sources authorized by the API key |
| GET `/api-access/limits` | Read account plan limits and current pending jobs using an API key |
| GET `/usage` | Read account usage for sources authorized by the API key |
| GET `/jobs/{jobId}` | Read one Data API job |
| GET `/bulk-jobs` | List bulk YouTube jobs |
| POST `/bulk-jobs` | Create a bulk YouTube job and obtain a direct R2 upload URL |
| GET `/bulk-jobs/{bulkId}` | Read bulk job progress and aggregate counts |
| PATCH `/bulk-jobs/{bulkId}` | Change parameters for IDs that have not yet been admitted |
| DELETE `/bulk-jobs/{bulkId}` | Stop admitting new items for a bulk job |
| POST `/bulk-jobs/{bulkId}/start` | Start scanning an uploaded YouTube ID file |
| POST `/bulk-jobs/{bulkId}/pause` | Pause bulk admission and coordinator finalization |
| POST `/bulk-jobs/{bulkId}/resume` | Resume a manually or automatically paused bulk job |
| GET `/bulk-jobs/{bulkId}/results` | Download the completed bulk manifest |
| GET `/bulk-jobs/{bulkId}/results/{partNumber}` | Download one gzip-compressed NDJSON bulk result part |
| GET `/jobs/{jobId}/results` | Download a completed async result |
| POST `/v1/queries/realtime` | Retrieve results in the same HTTP response |
| POST `/v1/queries` | Submit a background query and follow its job links |
| POST `/v1/queries/batch` | Submit multiple background queries; each is billed separately |

## Resource map

| SDK resource | Operations |
| --- | --- |
| queries | realtime, submit, batch |
| google | six source helpers and bounded pages iterator |
| youtube | search, extended search, metadata, transcript, captions, license check, channel, suggestions, download |
| account | access, balance, pricing, limits, usage |
| jobs | get, result, wait |
| bulk | create, upload file, start, get, list, update, pause, resume, cancel, wait, manifest, part, row iteration |
| public | sources, plans, status, health |

Python uses snake_case method names; TypeScript uses camelCase. JSON keys always use
the API's original spelling. Standard jobs can be retrieved by ID but the API-key
contract has no standard-job list/cancel route. Bulk listing and cancellation are supported.

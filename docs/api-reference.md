# API reference and endpoint coverage

The generated TypeDoc site documents the exported `FlashData` client, resources, request
options, wire types and errors. Use `npm run docs:build`, then open `docs/_build/index.html`.
This page maps the public API surface to resource methods. JSON keys retain wire names;
SDK methods and request configuration use camelCase.

| Resource  | Methods                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queries` | `realtime`, `submit`, `batch`                                                                                                                     |
| `google`  | `search`, `images`, `news`, `shopping`, `videos`, `places`, `pages`                                                                               |
| `youtube` | `search`, `searchExtended`, `metadata`, `transcript`, `captions`, `licenseCheck`, `channel`, `suggestions`, `download`                            |
| `account` | `access`, `balance`, `pricing`, `limits`, `usage`                                                                                                 |
| `jobs`    | `get`, `wait`, `result`                                                                                                                           |
| `bulk`    | `create`, `get`, `list`, `iterJobs`, `update`, `uploadFile`, `start`, `pause`, `resume`, `cancel`, `wait`, `manifest`, `part`, `iterRows`, `rows` |
| `public`  | `sources`, `plans`, `health`, `status`                                                                                                            |

Data calls use `https://data.flashdata.dev`: POST `/v1/queries/realtime`, `/v1/queries`,
and `/v1/queries/batch`. Management calls use `https://api.flashdata.dev/v2`: public
`/health`, `/status`, `/catalog/sources`, `/plans`; authenticated `/api-access`, its
`/balance`, `/pricing`, `/limits` subroutes, and `/usage`; standard job reads at
`/jobs/{id}` and `/jobs/{id}/results`; bulk collection/create at `/bulk-jobs`, get/update/
cancel at `/bulk-jobs/{id}`, start/pause/resume action subroutes, and results/part reads.

The API-key contract has no standard-job list/cancel route. Bulk listing and cancellation
are supported. The repository's `openapi.json` and `source-contract.json` capture all 15
sources and developer endpoints; browser-session/admin APIs are outside this SDK.
Source field guides describe upstream response fields, including missing/null values.

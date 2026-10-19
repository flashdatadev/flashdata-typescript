# TypeScript, ESM and CommonJS

All request/response types and errors are exported from `@flashdata-dev/sdk`. Use
TypeScript 5.9 with `moduleResolution: "NodeNext"` for Node applications, or the matching
bundler resolution in an application using a bundler. Use `.mts`/`type: "module"` for ESM
and `.cts`/`.cjs` for CommonJS. The package provides runtime and declaration entry points
for both module systems.

```typescript
import {
  FlashData,
  type AsyncQuery,
  type GoogleSearchParams,
  type StorageConfig,
} from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const params: GoogleSearchParams = { num: 3, gl: 'us', autocorrect: false };
const response = await client.google.search({ query: 'coffee', ...params });
for (const payload of response.results)
  for (const hit of payload.organic ?? []) console.log(hit.title);

const query: AsyncQuery = { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ' };
const receipt = await client.queries.submit(query);
await client.jobs.wait(receipt.id, { timeoutMs: 300000 });
```

`mode: 'async'` infers `AsyncSubmission`, whose ID is required. Realtime source helpers
infer their source payload. `StorageConfig` describes destination fields; `CreateBulkJobRequest`
requires download storage and offers source-specific data options. Server-side conditional
storage/media rules remain authoritative. Response fields can be optional/null because
upstream availability varies. Use narrowing and `?? []` when traversing optional lists.

The runnable typed example is checked during `npm run typecheck`. Run it with
`npm run examples:typescript -- coffee`; add `--background` for typed submission and polling.
It compiles before execution, so it does not depend on experimental Node type stripping.

## CommonJS

```javascript
const { FlashData } = require('@flashdata-dev/sdk');

async function main() {
  const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
  const response = await client.google.search({ query: 'coffee', num: 3 });
  for (const payload of response.results)
    for (const hit of payload.organic ?? []) console.log(hit.title, hit.link);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
```

Run `node examples/commonjs.cjs coffee` for a runnable CommonJS CLI. Package verification
installs the archive into an independent application and checks runtime imports plus
strict ESM/CommonJS TypeScript consumers.

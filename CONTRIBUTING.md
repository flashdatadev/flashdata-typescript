# Contributing

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Use Node.js 22+ and a branch for changes. Keep keys, storage credentials, signed URLs
and private results out of source, commits, logs and public issues.

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run docs:build
npm run verify:package
npm pack --dry-run
```

The normal suite uses injected fetch and a loopback HTTP server. It executes documentation
code and runnable CLI examples with source-shaped fixtures, checks import/help safety,
and validates negative TypeScript consumers. HTTP test servers need local socket access.

## Opt-in live checks

Set both `FLASHDATA_RUN_LIVE=1` and `FLASHDATA_LIVE_API_KEY`, then run `npm run test:live`.
These tests consume credits: 14 realtime queries, a background query, a mixed 14-item
batch, and a small metadata bulk job. They also check account/public endpoints, result
reads, listing, draft controls and errors. They require access to all sources and sufficient
plan limits. They never cancel other tasks. Automatic CI does not receive production keys.

Successful customer cloud delivery requires separate storage credentials and is not
asserted by these live checks. Download requests, example flows and storage transport
are covered offline. The optional manual live workflow requires an explicit paid-call input.

Change schemas, types, guides, examples and contracts together. Preserve omitted fields
and explicit `false`; keep retries out of the default client. Errors must preserve IDs,
normalize protocol failures and avoid exposing credentials. See [architecture](docs/architecture.md)
and [release preparation](docs/release.md).

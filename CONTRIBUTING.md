# Contributing

Use a branch for changes and keep API examples runnable from a source checkout. Never
commit API keys, storage credentials, signed result URLs or customer data.

## Local setup

```sh
npm ci
npm run typecheck
npm test
npm run examples:offline
npm pack --dry-run
```

Tests use Node's built-in test runner, injected fetch responses and loopback servers.
The package targets Node 22+ and emits both ESM and CommonJS bundles.

The normal suite never submits paid production requests. Set `FLASHDATA_LIVE_API_KEY`
only when deliberately enabling the optional free account-access smoke check.

When changing contracts, update runtime validation, exported types, source guides,
examples and fixtures together. Preserve omitted values and explicit false. Test all
affected source modes, unknown submission outcomes and API/storage credential separation.
Keep HTTP retries out of the default client. Read [architecture](docs/architecture.md)
and [API coverage](docs/api-reference.md) before adding new resources.

CI configuration is included for Linux/Windows and supported runtime versions. It has
not executed on GitHub while the repository remains local. [Release preparation](docs/release.md).

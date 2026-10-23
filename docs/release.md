# Releases and packages

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

The official package is `@flashdata-dev/sdk` for Node.js 22+. Version 1.1.0 adds JSON,
plain-text and Markdown response options. Read the [release notes](release-notes-1.1.0.md)
and [format examples](response-formats.md). Existing calls keep their original
JSON response defaults.

The [GitHub release](https://github.com/flashdatadev/flashdata-typescript/releases/tag/v1.1.0)
provides packages from the tagged source. Published registry versions are listed on
[npm](https://www.npmjs.com/package/@flashdata-dev/sdk). GitHub npm archives can also be installed directly with npm.

## Maintainer checks

Run these before publishing a new immutable version:

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run docs:build
npm run verify:package
```

The verifier checks package contents, independent ESM/CommonJS consumers, strict TypeScript declarations and the installed offline example.
GitHub CI checks supported platforms and runtimes, submits no paid queries, and does
not publish packages. Publish verified distributions using the official registry
account, and keep released files unchanged.

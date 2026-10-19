# Release preparation

This project stays local until the official FlashData GitHub and npm accounts are ready.
The planned package name is `@flashdata-dev/sdk`; verify ownership before publishing.

1. Set repository and issue metadata to the actual official URLs once they exist.
2. Review contracts, license, contact details, changelog and validation evidence.
3. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run format:check`, and `npm run docs:build`.
4. Run `npm run verify:package` to build an archive in `artifacts/`, check its contents,
   install it in an independent application, and verify ESM/CommonJS imports, strict
   NodeNext types and the installed offline example.
5. Inspect `npm pack --dry-run --json`, then build the final local archive with `npm pack`.
6. Run the configured CI matrix after an official repository exists, and deliberately
   publish the reviewed package through the official account.

The archive includes built runtime/types, source maps, Markdown guides, examples and API
snapshots. Local exports, generated HTML, credentials and test caches must be excluded.
Source files accompany source maps so published diagnostics remain inspectable. Build
configuration/tooling is development-only. No workflow publishes packages or a hosted site.

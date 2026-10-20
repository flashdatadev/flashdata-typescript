# Release preparation

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

## Final local release check — 2026-10-20

The 1.0.0 release candidate passes the local release checks below. English `README.md`
remains the default, with a visible 简体中文 link to the complete Chinese README.

| Check                        | Result                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Supported runtimes exercised | Windows: exact minimum Node 22.0.0 and Node 24.19.0                                             |
| Offline tests                | 200 passed on each runtime; 19 live checks deliberately skipped                                 |
| Documentation examples       | All 38 JavaScript/TypeScript blocks execute, including five Chinese README examples             |
| Example CLIs                 | All 27 checked for import safety, help, outputs and applicable recovery flows                   |
| Formatting and typing        | Prettier and strict TypeScript pass                                                             |
| Generated documentation      | TypeDoc builds with warnings treated as errors on both runtimes                                 |
| Clean dependency install     | `npm ci` passes; npm reported zero advisories                                                   |
| Packages                     | Independent ESM/CommonJS runtime and strict `.mts`/`.cts` consumers pass on both runtimes       |
| Consumer isolation           | Compiler and Node typings installed inside the consumer; no checkout type roots or DOM library  |
| Package contents             | Both READMEs, declarations, source maps, guides and examples included; metadata version checked |
| Documentation navigation     | Exact-case relative links pass; 18 distinct official URLs return HTTP 200                       |
| API parity                   | Both SDKs agree on 24 operations, 15 sources and 46 resource methods                            |
| Credential checks            | Package contents and Git history have no FlashData-key-shaped matches                           |

This check replaced the consumer's borrowed typings with its own compiler and Node types,
and documented that setup in English and Chinese. The Python counterpart now rejects API
key control characters before transport creation, gates all live tests explicitly, and
checks runtime/distribution version agreement and both packaged README contents.

No paid requests were repeated for this release check; earlier integration evidence is
recorded in [validation](validation.md). Successful customer cloud writes, external
webhook delivery, live pause/resume transitions and the Linux/hosted CI matrix remain
unverified. No repository, package or documentation site was published. Official owner
URLs and package-name ownership must be set before release.

## Before publication

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

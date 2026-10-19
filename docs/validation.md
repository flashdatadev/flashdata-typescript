# Local validation — 2026-10-19

Validated on Windows with Node.js 24.19.0 and TypeScript 5.9:

- 89 offline tests pass; one optional live account test is skipped without an explicit key.
- All 15 sources, background/batch submission, pagination, job reads and bulk controls.
- Native fetch integration against two loopback origins, including streamed file upload.
- All source examples execute in separate Node processes using fake HTTP.
- Documentation JavaScript parses and relative links resolve; source/example type checks pass.
- The npm archive installs in a separate application; ESM and CommonJS imports work.
- Strict NodeNext consumers resolve the installed declarations from both .mts and .cts files.
- The free live source catalog matches the 15-source snapshot. No paid production queries were run.

GitHub CI is configured for Linux/Windows on Node 22 and 24. Those matrix runs require
publishing the repository and have not run on GitHub. Package-registry and GitHub
publication remain pending the official FlashData accounts.

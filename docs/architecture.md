# Architecture and reference study

The starting reference was [serpapi/serpapi-python](https://github.com/serpapi/serpapi-python),
examined on 2026-10-19. Its repository separates HTTP transport, a small client,
result helpers and exceptions; includes README quickstart, detailed user guides,
engine-specific examples, API reference, contributor instructions, history, package
metadata, tests and separate build/docs/release workflows. Its guides cover client
configuration, output formats, pagination, async/archive reads, timeouts/errors,
account discovery, threading and migration.

This repository applies that structure to FlashData's actual API. FlashData returns
JSON, uses API-key headers, separates Data and Management origins, and supports bulk
ID files plus signed object-storage results. Each source has its own guide and example.
Source contracts and wire types are checked in with an API-key-only OpenAPI snapshot.
All implementation code is original FlashData SDK code.

## Layout

- `src/`: public client, source/resource methods, HTTP handling, validation, types and errors.
- `docs/`: setup, user guides, reference and one page per source.
- `examples/`: runnable source examples, workflows and a free offline demonstration.
- `tests/`: fake transports, local HTTP checks, source fixtures and opt-in live account read.
- `openapi.json`: supported developer endpoints; excludes browser/admin operations.
- `source-contract.json`: source parameters/modes snapshot for review and future updates.
- `.github/workflows/`: offline CI and build artifacts; publication remains manual.

Generated wire types preserve server field names. Source response hints are optional
provider fields, not a promise that each upstream result contains every example field.
When the product contract changes, update snapshots, runtime schemas, types, source
guides and contract tests together. Do not silently insert billing defaults or retries.

# FlashData TypeScript & JavaScript SDK

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Build Node.js applications with Google search and YouTube data using typed requests,
ordinary response objects, background jobs, and bulk ID files. Start with
[installation](getting-started.md) or choose a [source guide](sources/index.md).

| Guide                                   | What you will build                                     |
| --------------------------------------- | ------------------------------------------------------- |
| [Getting started](getting-started.md)   | A working query with explicit API-key configuration     |
| [Source guides](sources/index.md)       | Useful recipes for every Google and YouTube source      |
| [Client configuration](client.md)       | Timeouts, cancellation, fetch injection and limits      |
| [Jobs and batch](jobs.md)               | Persistent background work and mixed submissions        |
| [Pagination](pagination.md)             | Bounded Google searches and CSV export                  |
| [Bulk jobs](bulk.md)                    | Metadata datasets and cloud media downloads             |
| [Cloud storage](storage.md)             | Destination formats, credentials and media options      |
| [Account discovery](account.md)         | Current access, pricing, limits and usage               |
| [Errors and recovery](errors.md)        | Failed requests, lost receipts and polling deadlines    |
| [TypeScript and modules](typescript.md) | Typed inputs and ESM/CommonJS consumers                 |
| [Examples](../examples/README.md)       | Runnable CLI catalogue with exports and resume commands |
| [API reference](api-reference.md)       | Resource mapping and endpoint coverage                  |

The generated TypeDoc site includes these guides and the exported client, resource,
request/response types, and exception reference. Build it with `npm run docs:build`.

See the [Python and TypeScript comparison](sdk-parity.md) for shared API coverage,
bulk recovery guarantees and intentional language differences.

# FlashData TypeScript and JavaScript SDK v1.1.0

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Choose JSON, plain text or Markdown responses in ESM and CommonJS applications.
Existing calls keep their JSON objects and defaults.

- Pass `{ accept: 'text/plain' }` in request options for a string with the original fields.
- Pass `{ respondWith: 'markdown' }` on realtime queries or `jobs.result()` for Markdown.
  JSON responses put it in `content`; text responses include metadata and Markdown.
- Background submissions, batches and job status also support `accept`.
- Return types follow literal or variable format choices. Unsupported mode, callback
  and format combinations are rejected before requests.
- Keep cancellation, response-size limits, structured errors and storage credential
  separation. Reading another result format does not repeat the query.

Requires Node.js 22+. Install or upgrade:

```sh
npm install @flashdata-dev/sdk@^1.1.0
```

The [GitHub release](https://github.com/flashdatadev/flashdata-typescript/releases/tag/v1.1.0)
also provides the npm package archive. See [response formats](response-formats.md)
for runnable examples.

## 简体中文

1.1.0 在第二个参数中新增独立的 `accept` 与 `respondWith` 选项，支持 ESM 和 CommonJS。
默认仍返回 JSON；纯文本返回字符串，Markdown 可位于 JSON 的 `content` 字段或纯文本响应中。
TypeScript 返回类型随格式选择变化。后台提交和状态支持 `accept`，Markdown 用于内容读取。
需要 Node.js 22+。

# FlashData TypeScript 与 JavaScript SDK

[English](https://github.com/flashdatadev/flashdata-typescript/blob/main/README.md) | [简体中文](https://github.com/flashdatadev/flashdata-typescript/blob/main/README.zh-CN.md)

[FlashData](https://flashdata.dev) · [API 文档](https://flashdata.dev/docs)

为 Node.js 应用、搜索监控、研究数据管道和检索流程提供 Google 搜索结果与 YouTube 数据。

获取网页、新闻、购物、图片、视频和本地搜索结果；发现 YouTube 视频，读取元数据和已有字幕轨道；
运行后台任务与混合批次，或通过视频 ID 文件批量处理数据。
SDK 提供请求与响应类型、参数校验、结构化错误、限制页数的分页、取消操作及 ESM/CommonJS 支持。
需要 Node.js 22 或更高版本。

## FlashData 是什么？

[FlashData](https://flashdata.dev) 提供 Google 搜索数据、YouTube 数据和云端媒体交付 API，
面向开发者与数据团队，适用于搜索监控、研究、数据分析、内容发现以及 AI 应用的检索流程。

你可以获取多种 Google 搜索结果，发现 YouTube 视频，读取视频元数据、已有字幕、频道数据和许可标签。
根据工作量选择实时请求、后台任务、混合批次或视频 ID 文件批量处理。
媒体下载会将音频或视频直接交付到你自己的云存储。
详情见 [API 文档](https://flashdata.dev/docs)和[价格说明](https://flashdata.dev/pricing)。

## 按使用场景选择工作流

| 想要构建的功能                     | 从这里开始                                   |
| ---------------------------------- | -------------------------------------------- |
| 为 AI 助手提供网页上下文和来源链接 | [Google 搜索](#搜索-google)                  |
| 行业研究或新闻监控                 | [新闻搜索](#跟踪行业新闻)                    |
| 按主题发现视频或学习资源           | [YouTube 搜索](#按主题查找-youtube-视频)     |
| 视频分析和内容目录补全             | [视频元数据](#获取视频元数据)                |
| 为视频摘要、搜索或检索获取文本     | [已有字幕文本](#为-ai-工作流获取字幕文本)    |
| 根据一组视频 ID 构建数据集         | [批量元数据导出](#构建-youtube-元数据数据集) |
| 将音频或视频交付到自己的云存储桶   | [批量媒体下载](#批量下载-youtube-视频)       |
| 继续中断的批量任务                 | [恢复任务](#恢复已启动的批量任务)            |

以下示例负责获取数据；摘要、检索索引、调度和 AI 模型调用由应用实现。

## 安装

```sh
npm install @flashdata-dev/sdk
```

以上命令需在 FlashData 正式发布到 npm 后使用。发布前的本地测试请参阅[从源码安装](#从源码安装)。
请在服务端运行 SDK。

TypeScript 应用还需将编译器和 Node.js 类型定义安装为开发依赖。SDK 自身的 API 类型已随包提供：

```sh
npm install --save-dev typescript@~5.9.3 @types/node@^22
```

## 配置 API 密钥

从你的 [FlashData 账户](https://flashdata.dev)获取 API 密钥，并通过 `apiKey` 显式传入。
示例使用 `process.env.FLASHDATA_API_KEY` 读取环境变量，也可以使用密钥管理服务提供的值。
SDK 不会自动加载 `.env` 文件，如需使用，请先由应用加载配置。

```sh
# macOS / Linux
export FLASHDATA_API_KEY="YOUR_API_KEY"
```

```powershell
$env:FLASHDATA_API_KEY = "YOUR_API_KEY"
```

下面的代码块都是独立示例。完成安装并设置 API 密钥后，将任一代码块保存为 `quickstart.mjs`，然后运行：

```sh
node quickstart.mjs
```

使用 `.mjs` 可直接在 Node.js 中运行 ESM 示例。TypeScript 项目的配置及编译方式见
[TypeScript 指南](docs/typescript.md)。

## 搜索 Google

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.search({
  query: 'coffee roasters',
  gl: 'us',
  hl: 'en',
  num: 5,
});
for (const payload of response.results) {
  for (const hit of payload.organic ?? []) {
    console.log(hit.title, hit.link);
  }
}
```

响应是普通对象。外层 `results` 数组包含各数据源的结果对象；
Google 网页搜索条目位于其中的 `organic` 列表中。
本次请求消耗的积分（Credits）位于 `response.usage.credits`。其他数据源使用各自的字段路径。

## 选择响应格式

默认返回 JSON 对象。在第二个参数中设置 `accept: 'text/plain'` 返回字符串，
或设置 `respondWith: 'markdown'` 选择 Markdown 内容。

| `accept`                     | `respondWith` | 返回值                             |
| ---------------------------- | ------------- | ---------------------------------- |
| `'application/json'`（默认） | 省略          | 包含原始 `results` 的对象          |
| `'text/plain'`               | 省略          | 原始字段的文本形式                 |
| `'application/json'`（默认） | `'markdown'`  | Markdown 位于 `content` 字段的对象 |
| `'text/plain'`               | `'markdown'`  | 元数据及 Markdown 内容             |

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.search(
  { query: 'vector databases' },
  { respondWith: 'markdown' },
);
console.log(response.content);
const text = await client.youtube.transcript(
  { video_id: 'dQw4w9WgXcQ', language: 'en', auto: false },
  { accept: 'text/plain', respondWith: 'markdown' },
);
console.log(text);
```

后台提交、批量提交及 `jobs.get()` 也支持 `accept`。
后台任务的 Markdown 内容请通过 `jobs.result(id, { respondWith: 'markdown' })` 获取。
更换已完成结果的格式不会重新查询或消耗查询积分。
详见[响应格式指南](docs/response-formats.md)。

## 跟踪行业新闻

收集行业新闻的标题、发布来源和文章链接，供研究工具或监控脚本使用。

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.google.news({
  query: 'battery recycling',
  gl: 'us',
  hl: 'en',
  num: 5,
});
for (const payload of response.results) {
  for (const article of payload.news ?? []) {
    console.log(article.title, article.source, article.link);
  }
}
```

## 按主题查找 YouTube 视频

发现相关视频，并获取可用于后续元数据或字幕请求的视频 ID。

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.search({ query: 'python tutorial', max_results: 5 });
for (const payload of response.results) {
  for (const video of payload.results ?? []) {
    console.log(video.videoId, video.title, video.channel);
  }
}
```

## 获取视频元数据

补全视频目录中的标题、频道、时长和播放量。请将示例 ID 替换为你要处理的视频 ID。

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.metadata({
  video_id: 'dQw4w9WgXcQ',
  include_formats: false,
});
for (const video of response.results) {
  console.log(video.title, video.channel);
  console.log('Seconds:', video.duration, 'Views:', video.viewCount);
}
```

## 为 AI 工作流获取字幕文本

读取已有的英文自动字幕文本，供应用生成摘要或建立检索索引。
API 返回文本；摘要生成或向量化由你的应用完成。

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.transcript({
  video_id: 'dQw4w9WgXcQ',
  language: 'en',
  auto: true,
});
for (const track of response.results) {
  console.log(track.fullText ?? '');
}
```

字幕取决于视频已有的语言轨道；不会自动转写或翻译缺失的字幕。
如需人工上传的字幕，可使用下面的 `captions` 示例。

## 读取 YouTube 字幕轨道

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const response = await client.youtube.captions({
  video_id: 'dQw4w9WgXcQ',
  language: 'en',
  auto: false,
});
for (const track of response.results) {
  console.log(track.languageCode, track.isAutoGenerated);
  for (const segment of (track.segments ?? []).slice(0, 3)) {
    console.log(segment.start, segment.end, segment.text);
  }
}
```

`captions` 默认选择上传的字幕轨道（`auto: false`），`transcript` 默认选择自动生成的轨道（`auto: true`）。
请指定视频实际拥有的语言和轨道。轨道不存在时，API 会返回错误；服务不会生成或翻译字幕。

## 后台任务与混合批次

```javascript
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const receipt = await client.youtube.metadata(
  { video_id: 'dQw4w9WgXcQ', include_formats: false },
  { mode: 'async' },
);
console.log('Save this job ID:', receipt.id);
await client.jobs.wait(receipt.id, { timeoutMs: 300000, pollIntervalMs: 3000 });
const result = await client.jobs.result(receipt.id);
console.log(result);
```

等待前请保存任务 ID。`wait()` 返回已完成的任务记录，`result()` 获取 JSON 结果。
轮询超时或进程重启后，可继续读取同一任务，无需重新提交。
不同查询可通过 `queries.batch()` 提交，详见[后台任务与批次](docs/jobs.md)。

## 构建 YouTube 元数据数据集

创建 `video-ids.txt`，每行填写一个 YouTube 视频 ID：

```text
dQw4w9WgXcQ
jNQXAC9IVRw
```

以下示例完成创建任务 → 上传 ID → 启动 → 等待 → 导出 NDJSON（每行一个 JSON 对象）。
每行包含一个输入条目的处理状态和数据。

```javascript
import { open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const output = await open('videos.ndjson', 'wx', 0o600);
try {
  const record = await open('videos.ndjson.job.json', 'wx', 0o600);
  try {
    const receipt = await client.bulk.create({
      source: 'youtube_metadata',
      options: { include_formats: false },
    });
    const bulkId = receipt.job.id;
    console.log('Save this bulk ID:', bulkId);
    await record.writeFile(JSON.stringify({ id: bulkId }) + '\n', 'utf8');
    await record.sync();
    await client.bulk.uploadFile(receipt, 'video-ids.txt');
    await client.bulk.start(bulkId);
    const completed = await client.bulk.wait(bulkId, {
      timeoutMs: 3600000,
      pollIntervalMs: 5000,
    });

    for await (const row of client.bulk.rows(bulkId)) {
      await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
    }
    console.log('Saved videos.ndjson; counts:', completed.counts);
    if (completed.counts.failed || completed.counts.invalid) {
      throw new Error('Some items failed; inspect the saved rows before retrying');
    }
  } finally {
    await record.close();
  }
} finally {
  await output.close();
}
```

内联程序会在上传前将已受理的任务 ID 保存到 `videos.ndjson.job.json`。进程重启或超时后，使用下方的
[恢复流程](#恢复已启动的批量任务)，不要重新运行创建代码。示例导出使用独占创建模式，拒绝覆盖已有文件。

如需开箱即用的脚本，在仓库根目录运行以下命令。它会在上传前自动将任务记录保存到
`OUTPUT.job.json`，并保留逐项失败的导出结果：

```sh
node examples/bulk.mjs video-ids.txt --output artifacts/videos.ndjson
node examples/bulk.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/videos-recovered.ndjson
```

创建与恢复命令是两种不同的运行方式；仅在需要恢复时运行第二条命令，并替换任务 ID。
其他批量来源包括 `youtube_transcript`、`youtube_captions` 和 `youtube_trainability`；
每个任务共用一套选项。参数说明见[批量指南](docs/bulk.md)。

## 批量下载 YouTube 视频

创建 `video-ids.txt`，每行一个 11 位视频 ID：

```text
dQw4w9WgXcQ
jNQXAC9IVRw
```

创建私有配置文件 `private-storage.json`，填写目标云存储信息。下面以 S3 为例：

```json
{
  "storage_type": "s3",
  "storage_url": "your-media-bucket",
  "region": "us-east-1",
  "object_prefix": "youtube",
  "access_key": "YOUR_ACCESS_KEY",
  "secret_key": "YOUR_SECRET_KEY"
}
```

请用真实凭证替换占位符，并将配置文件保存在版本控制之外。
然后创建任务、上传 ID 文件、启动处理并读取每个视频的状态：

```javascript
import { readFile, open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const storage = JSON.parse(await readFile('private-storage.json', 'utf8'));
const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const output = await open('downloads.ndjson', 'wx', 0o600);
try {
  const record = await open('downloads.ndjson.job.json', 'wx', 0o600);
  try {
    const receipt = await client.bulk.create({
      source: 'youtube_download',
      options: {
        download_type: 'audio_video',
        video_quality: '<=720',
        output_format: 'mp4',
        storage,
      },
    });
    const bulkId = receipt.job.id;
    console.log('Save this bulk ID:', bulkId);
    await record.writeFile(JSON.stringify({ id: bulkId }) + '\n', 'utf8');
    await record.sync();
    await client.bulk.uploadFile(receipt, 'video-ids.txt');
    await client.bulk.start(bulkId);
    const completed = await client.bulk.wait(bulkId, { timeoutMs: 3600000, pollIntervalMs: 5000 });
    console.log('Counts:', completed.counts);
    for await (const row of client.bulk.rows(bulkId)) {
      await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
      console.log(row.video_id, row.status);
    }
    if (completed.counts.failed || completed.counts.invalid) {
      throw new Error('Some items failed; inspect downloads.ndjson before retrying');
    }
  } finally {
    await record.close();
  }
} finally {
  await output.close();
}
```

以上程序会在上传前将已受理的 ID 保存到 `downloads.ndjson.job.json`，
将交付回执保存到 `downloads.ndjson`，并拒绝覆盖已有文件。
逐项失败时会先保存回执，再报告错误。

媒体交付到你配置的存储桶。`bulk.rows()` 读取包含视频状态和 `results` 数据源输出的 JSON 结果记录，
不会把媒体文件下载到本机。请检查最终计数和每行状态：任务整体完成时，仍可能存在失败条目。
下载按照实际交付的字节数计费，云存储服务商可能另外收费。

可用保存的 ID 调用 `bulk.get()`、`bulk.wait()` 和 `bulk.rows()` 继续读取任务。
可运行示例会保存任务 ID、导出 NDJSON，并支持恢复读取，不会创建新任务：

```sh
node examples/bulk_download.mjs video-ids.txt --storage-file private-storage.json --output artifacts/downloads.ndjson
node examples/bulk_download.mjs --bulk-id bulk_YOUR_SAVED_ID --output artifacts/downloads-recovered.ndjson
```

第二条命令仅用于恢复已启动的任务，请替换保存的任务 ID，并使用新输出路径保留之前的导出结果。

尚处于 `awaiting_upload` 的草稿仍需上传文件并调用 `start`；暂停的任务需解决暂停原因后调用 `resume`。
详见[批量控制与恢复](docs/bulk.md)、[下载选项](docs/sources/youtube_download.md)和[支持的存储服务商](docs/storage.md)。

### 改为交付 MP3 音频

相同 ID 文件和存储配置也可用于音频任务。将上述内联请求的下载选项改为
`download_type="audio"` 和 `output_format="mp3"`，并移除 `video_quality`；或者在仓库根目录运行：

```sh
node examples/bulk_download.mjs video-ids.txt --audio --storage-file private-storage.json --output artifacts/audio.ndjson
```

## 恢复已启动的批量任务

将 `bulk_YOUR_SAVED_ID` 替换为元数据或下载任务先前打印并保存的 ID。
此流程只等待和读取已有任务，不创建任务、不重新上传 ID，也不会重新提交下载。

```javascript
import { open } from 'node:fs/promises';
import { FlashData } from '@flashdata-dev/sdk';

const bulkId = 'bulk_YOUR_SAVED_ID';
const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY });
const completed = await client.bulk.wait(bulkId, {
  timeoutMs: 3600000,
  pollIntervalMs: 5000,
});
const output = await open('recovered.ndjson', 'wx');
try {
  for await (const row of client.bulk.rows(bulkId)) {
    await output.writeFile(JSON.stringify(row) + '\n', 'utf8');
  }
} finally {
  await output.close();
}
console.log('Saved recovered.ndjson; counts:', completed.counts);
if (completed.counts.failed || completed.counts.invalid) {
  throw new Error('Some items failed; inspect the saved rows before retrying');
}
```

等待超时只会停止本地轮询，已受理的服务端任务仍会继续。`awaiting_upload` 状态仍需
原始上传描述和显式 `start`；已暂停任务需先修复原因，再调用 `resume`。示例任务记录不含签名上传描述，
不能仅凭 ID 恢复上传前中断的进程。不要将存储凭据或签名 URL 写到普通任务记录中。

请及时导出结果，内部结果在完成后保留 24 小时。详情见[批量控制与恢复](docs/bulk.md)。

## 处理错误与取消操作

```javascript
import { APIError, FlashData, SubmissionUnknownError } from '@flashdata-dev/sdk';

const client = new FlashData({ apiKey: process.env.FLASHDATA_API_KEY, timeoutMs: 120000 });
try {
  const response = await client.google.search({ query: 'coffee' }, { timeoutMs: 60000 });
  console.log(response.usage.credits);
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.statusCode, error.code, error.requestId, error.retryAfter);
  } else if (error instanceof SubmissionUnknownError) {
    // 服务端可能已接受本次付费请求；再次提交前请先核实状态。
    throw error;
  } else {
    throw error;
  }
}
```

每个请求只发送一次。SDK 不会自动重试付费查询或修改操作。
所有请求均支持 `AbortSignal`；取消只会停止本地操作，已被服务端接受的任务仍会继续执行。
超时和轮询间隔以毫秒为单位。详见[错误与恢复](docs/errors.md)和[客户端配置](docs/client.md)。

## 支持的 API

| 资源    | 方法                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google  | `search`、`images`、`news`、`shopping`、`videos`、`places`，以及限制页数的 `pages`                                                                |
| YouTube | `search`、`searchExtended`、`metadata`、`transcript`、`captions`、`licenseCheck`、`channel`、`suggestions`、`download`                            |
| Queries | `realtime`、`submit`、`batch`，接收具有类型定义的 API 请求对象                                                                                    |
| Jobs    | `get`、`wait`、`result`                                                                                                                           |
| Bulk    | `create`、`uploadFile`、`start`、`get`、`list`、`iterJobs`、`update`、`pause`、`resume`、`cancel`、`wait`、`manifest`、`part`、`iterRows`、`rows` |
| Account | `access`、`balance`、`pricing`、`limits`、`usage`                                                                                                 |
| Public  | `sources`、`plans`、`health`、`status`，无需密钥                                                                                                  |

全部 15 个数据源支持后台提交和混合批次，其中 14 个数据源也支持实时请求。
批量任务支持元数据、转录、字幕、许可标签和下载。许可标签不代表获得了媒体复用或模型训练授权。

## 指南与可运行示例

以下详细指南目前以英文提供：

- [快速入门](docs/getting-started.md)和[数据源指南](docs/sources/index.md)。
- [示例目录](examples/README.md)：命令行输入、易读输出和 JSON/CSV/NDJSON 导出。
- [分页](docs/pagination.md)、[后台任务](docs/jobs.md)、[批量数据集](docs/bulk.md)。
- [TypeScript、ESM 与 CommonJS](docs/typescript.md)、[API 参考](docs/api-reference.md)。

```sh
node examples/google_search.mjs "coffee roasters" --output artifacts/search.json
node examples/search_to_csv.mjs coffee --max-pages 2 --output artifacts/search.csv
node examples/concurrent_search.mjs coffee tea --concurrency 2
npm run examples:typescript -- coffee
```

真实 API 示例会消耗积分。`node examples/offline.mjs` 使用模拟请求，无需账户或网络。
所有脚本支持 `--help`，导入模块时不会发起请求。
[SDK 对照说明](docs/sdk-parity.md)列出了 Python、TypeScript/JavaScript、Go 和 CLI 的 API 覆盖、语言差异、工作流行为和验证范围。

批量脚本会在任何 API 调用之前拒绝覆盖已有导出或 `OUTPUT.job.json` 记录。
超时或中断后，请使用已保存的 ID 和新输出路径恢复；不要重新执行创建。
保留的空记录表示需先核实提交结果，再决定是否创建新任务。

## 从源码安装

在本仓库的源码目录中执行：

```sh
npm ci
npm run build
```

如需在另一个应用中使用，可创建并安装本地安装包：

```sh
# 在本仓库中执行
npm pack
# 在你的应用中执行
npm install /absolute/path/to/flashdata-dev-sdk-1.0.0.tgz
```

## 开发

```sh
npm ci
npm run typecheck
npm test
npm run format:check
npm run docs:build
npm run verify:package
npm pack
```

默认测试使用注入的 fetch 响应和本地 HTTP 服务。真实 API 测试需要显式启用，详见[贡献指南](CONTRIBUTING.md)。
项目采用 MIT 许可证。敏感安全问题请按照[安全政策](SECURITY.md)私下报告。

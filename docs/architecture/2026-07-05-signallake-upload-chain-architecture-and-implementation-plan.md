# SignalLake 上报链路整体架构与技术实现方案

日期：2026-07-05

## GoalFrame

objective: 给 SignalLake 项目输出一份可评审、可拆任务、可落地的整体架构方案和技术实现方案，覆盖客户端埋点 SDK、云端接收/中转服务、本地接收端对接契约。

successCriteria:

- 清楚说明项目边界：负责 SDK + 云端中转 + 本地接收端契约，不负责本地接收端实现和后续分析平台。
- 清楚说明端到端数据流、定义流、投递流、失败重试流。
- 给出工程模块、技术选型、API 契约、数据模型、可靠性、安全性、可观测性和测试策略。
- 能作为后续 PRD、架构评审、开发任务拆分的依据。

constraints:

- 不把本项目扩展成本地数据平台或 BI/Agent 产品。
- 不采集用户内容、文件路径、文件名、剪贴板内容、token、password、secret。
- 客户端 SDK 包体必须足够小；任何能力都要评估包体、冷启动、内存和低端/TV 端影响。
- 架构必须支持多产品、多端、多租户/多部署目标。
- 第一阶段优先跑通闭环，后续再扩展平台能力和吞吐能力。

receiver: user / SignalLake SDK project team

## 1. 一句话方案

SignalLake 项目做的是“数据上报链路”：

```text
客户端埋点 SDK
  -> 云端接收/中转服务
  -> 本地接收端对接契约
```

本项目保证事件能从客户端稳定、合规、可追踪地送到本地接收端边界；本地接收端如何落库、解析、计算、分析，不属于本项目实现范围。

## 2. 项目边界

### 2.1 本项目负责

客户端 SDK：

- 多端埋点 SDK。
- 事件采集、事件整形、事件校验。
- 隐私过滤和 forbidden 字段拦截。
- 本地缓存、离线队列、批量上传。
- 上传重试、退避、限流、flush。
- 多端适配：Web/Tauri、Rust desktop、Android、iOS、Android TV。
- SDK fixture、mock、contract test。

协议和字典：

- 事件信封 schema。
- batch 上传 schema。
- Event Catalog / manifest schema。
- privacy rules。
- relay delivery schema。
- 错误码和重试语义。

云端接收/中转服务：

- SDK 上报入口。
- source/app/tenant 鉴权。
- schema / manifest 轻校验。
- eventId / batchId 去重。
- relay queue 暂存。
- 按产品、租户、本地接收端路由。
- 本地接收端拉取 API。
- ACK / NACK / retry / dead-letter 语义。
- 投递状态、健康检查、审计日志、基础可观测性。

本地接收端对接契约：

- 拉取 batch 的 API。
- cursor / checkpoint 语义。
- ACK / NACK 协议。
- 错误码。
- 幂等要求。
- 验收样例。

### 2.2 本项目不负责

- 本地接收端实现。
- 本地 raw_events 落库。
- 本地解析、计算、分析。
- 数据仓库。
- 指标计算平台。
- Dashboard。
- Agent 问数。
- Cast-SDK / PicPeek 产品功能本身。
- 客户专属业务指标口径和分析语义。

如果需要涉及这些内容，本项目只提供接口契约、样例和联调 mock。

## 3. 总体架构

```text
Product App
  -> SignalLake Client SDK
     -> Event Builder
     -> Manifest Validator
     -> Privacy Filter
     -> Durable Queue
     -> Batch Uploader
  -> Cloud Relay Service
     -> Ingestion API
     -> Auth / Tenant / App Registry
     -> Schema Light Validator
     -> Idempotency / Dedupe
     -> Durable Relay Queue
     -> Delivery API
     -> Delivery State / Audit / Observability
  -> Local Receiver Contract
     -> Pull batch
     -> ACK / NACK
     -> Cursor / checkpoint
     -> Local system owns storage and analytics
```

## 4. 三条核心流

### 4.1 定义流

定义先于数据。

```text
SignalLake schemas
  + SDK common enum dictionary
  + product event manifest
  + privacy rules
  -> versioned catalog package
  -> cloud registry
  -> SDK build/runtime uses manifest version
  -> cloud relay uses active manifest version for light validation
  -> local receiver can fetch same catalog package if needed
```

关键要求：

- 每个事件必须有 `schemaVersion` 和 `manifestVersion`。
- SDK 不允许发未定义事件。
- 云端只做轻校验，不做完整业务解析。
- Event Catalog 可以被本地系统消费，但本地系统实现不在本项目内。

### 4.2 运行时上报流

```text
1. 用户触发产品行为。
2. SDK/adapter 创建事件草稿。
3. SDK 补齐 app、device、session、identity、platform、version。
4. SDK 按 manifest 校验 eventName、properties、enum。
5. SDK 执行隐私过滤和 forbidden 字段拦截。
6. SDK 写入本地持久队列。
7. SDK 按 batch 上传到云端。
8. 云端鉴权、轻校验、去重、暂存、路由。
9. 云端等待本地接收端拉取。
```

### 4.3 本地接收端投递流

```text
1. 本地接收端使用 receiver credential 请求云端 delivery API。
2. 云端返回该 receiver 可消费的 batch。
3. 本地接收端处理 batch。
4. 本地接收端返回 ACK。
5. 云端推进 cursor / checkpoint。
6. 如果失败，本地接收端 NACK 或超时未 ACK。
7. 云端按 retry policy 重投。
8. 超过阈值进入 dead-letter。
```

推荐采用本地接收端主动拉取，而不是云端主动推送。原因：

- 本地系统可能在内网。
- 不要求客户开放入站端口。
- 私有化部署更容易。
- 本地系统能控制拉取频率和暂停。

## 5. 核心技术选型

### 5.1 第一阶段技术栈

第一阶段优先工程效率和闭环验证。

| 模块 | 建议技术 | 原因 |
| --- | --- | --- |
| schema / contract | JSON Schema + OpenAPI | 跨语言、易校验、易生成文档 |
| JS/Tauri SDK | TypeScript | PicPeek/Tauri 验证快，也能覆盖 Web |
| SDK core model | TypeScript first，后续 Rust/Kotlin/Swift 对齐 | 先跑通协议，避免过早多端分叉 |
| Cloud Relay MVP | Node.js + TypeScript + Fastify | 快速实现 API、schema 校验、测试 |
| Relay queue MVP | SQLite file queue 或 Postgres | MVP 可本地跑，生产可换 Postgres/Redis/Kafka |
| Contract tests | Node test runner / Vitest | 轻量、易集成 |
| API docs | OpenAPI | 便于本地接收端团队对接 |

### 5.2 生产演进技术栈

当吞吐、可靠性要求提高后：

| 模块 | 生产建议 |
| --- | --- |
| Cloud Relay API | TypeScript/Fastify 或 Go |
| Durable queue | Postgres outbox / Redis Streams / Kafka |
| Idempotency store | Postgres / Redis |
| Observability | OpenTelemetry + Prometheus metrics + structured logs |
| Deployment | Docker + health checks + migration scripts |
| Security | HMAC source signature + token rotation + TLS |

第一阶段不要直接上 Kafka，除非已经明确吞吐和运维能力。先用更轻的 durable queue 把语义做正确。

## 6. 仓库结构建议

```text
schemas/
  event-envelope.v1.json
  event-batch.v1.json
  event-catalog.v1.json
  relay-delivery.v1.json
  privacy-rules.v1.json

contracts/
  openapi/
    upload-api.v1.yaml
    relay-delivery-api.v1.yaml
  errors/
    error-codes.md
  retry-policy.md

fixtures/
  events/
    valid-screen-viewed.json
    valid-command-invoked.json
    invalid-forbidden-file-path.json
  batches/
    valid-upload-batch.json
    valid-delivery-batch.json
  manifests/
    picpeek.sample-manifest.yaml
    cast-sdk.sample-manifest.yaml

sdk/
  js/
    core/
    tauri/
    web/
  rust/
    README.md
  android/
    README.md
  ios/
    README.md

relay/
  service/
    src/
    tests/
  migrations/
  README.md

tools/
  manifest-lint/
  schema-check/
  fixture-check/

docs/
  architecture/
  requirements/
  integration/
  privacy/
```

## 7. SDK 设计

### 7.1 SDK 分层

```text
SDK Public API
  -> Event Builder
  -> Manifest Resolver
  -> Privacy Filter
  -> Validator
  -> Durable Queue
  -> Batch Scheduler
  -> Transport
```

### 7.2 SDK Public API

最小 API：

```text
init(config)
identify(userId, traits)
resetIdentity()
screen(screenId, properties)
track(eventName, properties)
command(commandId, properties)
error(errorCode, context)
flush()
setConsent(consentState)
shutdown()
```

### 7.3 SDK 配置

```json
{
  "productId": "picpeek",
  "appId": "picpeek.desktop",
  "environment": "production",
  "appVersion": "1.2.6",
  "schemaVersion": "event-envelope.v1",
  "manifestVersion": "picpeek.analytics.2026-07-05",
  "endpoint": "https://relay.signallake.example/v1/events/batch",
  "sourceKey": "source_xxx",
  "autocapture": {
    "lifecycle": true,
    "screen": true,
    "commands": true,
    "rawInteractions": false
  },
  "queue": {
    "maxEvents": 10000,
    "maxBytes": 10485760,
    "flushIntervalMs": 10000,
    "batchSize": 100
  }
}
```

### 7.4 SDK 本地队列要求

必须支持：

- 持久化。
- 先进先出。
- 最大事件数和最大字节数。
- 超限丢弃策略。
- batch 合并。
- flush on foreground/background。
- 失败重试。
- eventId 幂等。
- health event：上传成功、失败、丢弃、队列积压。

### 7.5 SDK 隐私过滤

默认拦截：

- `filePath`
- `folderPath`
- `fileName`
- `imageContent`
- `videoContent`
- `documentContent`
- `clipboardContent`
- `token`
- `password`
- `secret`
- 未声明的 `personal` / `sensitive` 字段

SDK 侧就要拦，不能只依赖云端。

### 7.6 SDK 包体控制

SDK 包体是核心约束。SignalLake SDK 必须优先做到“小、稳、可插拔”。

包体原则：

- Core SDK 只包含事件模型、基础校验、隐私过滤、本地队列、batch 构造、上传传输。
- 自动采集、平台 hook、诊断日志、压缩、加密增强、调试面板、mock transport 必须尽量独立模块化。
- 默认安装不携带大 Event Catalog、样例数据、完整调试 UI、重型 polyfill 或非必要运行时。
- 禁止为了开发便利引入重型依赖；确需引入时必须说明替代方案和包体收益。
- 非 core 能力必须优先设计为可选模块，不能默认进入主包。
- 新增依赖必须做包体评估，能用平台原生能力就不引入第三方库。
- Android TV、低版本 Android、iOS、Tauri 桌面都要分别评估包体、冷启动、内存占用。

建议拆包：

```text
@signallake/sdk-core
@signallake/sdk-web
@signallake/sdk-tauri
@signallake/sdk-debug
@signallake/sdk-compression
```

其中 `sdk-debug`、`sdk-compression` 等默认不进入 core。压缩能力可以在云端要求、平台支持和包体收益明确后再启用。

## 8. 云端 Relay 设计

### 8.1 云端模块

```text
Ingestion API
  -> Auth
  -> Source/App Registry
  -> Schema Light Validator
  -> Privacy Guard
  -> Idempotency
  -> Relay Queue
  -> Delivery API
  -> Delivery State
  -> Audit Log
  -> Observability
```

### 8.2 云端不做的事

- 不做完整业务解析。
- 不做本地 raw_events 落库。
- 不做指标计算。
- 不做分析查询。
- 不做 Dashboard / Agent。

### 8.3 云端接收 API

```text
POST /v1/events/batch
Authorization: Bearer <sourceKey>
Content-Type: application/json
```

请求体：

```json
{
  "batchId": "batch_01HY...",
  "schemaVersion": "event-batch.v1",
  "manifestVersion": "picpeek.analytics.2026-07-05",
  "sentAt": "2026-07-05T02:00:00.000Z",
  "source": {
    "productId": "picpeek",
    "appId": "picpeek.desktop",
    "environment": "production",
    "sdkName": "signallake-js",
    "sdkVersion": "0.1.0"
  },
  "events": []
}
```

响应：

```json
{
  "batchId": "batch_01HY...",
  "accepted": 100,
  "rejected": 0,
  "duplicate": 0,
  "relayStatus": "queued",
  "retryAfterMs": null,
  "errors": []
}
```

### 8.4 本地接收端拉取 API

```text
GET /v1/relay/batches?receiverId=xxx&cursor=yyy&limit=10
Authorization: Bearer <receiverToken>
```

响应：

```json
{
  "receiverId": "receiver_picpeek_local_001",
  "cursor": "cursor_001",
  "nextCursor": "cursor_002",
  "batches": [
    {
      "deliveryId": "delivery_01HY...",
      "batchId": "batch_01HY...",
      "productId": "picpeek",
      "appId": "picpeek.desktop",
      "manifestVersion": "picpeek.analytics.2026-07-05",
      "receivedAt": "2026-07-05T02:00:05.000Z",
      "events": []
    }
  ]
}
```

ACK：

```text
POST /v1/relay/deliveries/{deliveryId}/ack
```

```json
{
  "receiverId": "receiver_picpeek_local_001",
  "processedAt": "2026-07-05T02:00:10.000Z",
  "eventCount": 100
}
```

NACK：

```text
POST /v1/relay/deliveries/{deliveryId}/nack
```

```json
{
  "receiverId": "receiver_picpeek_local_001",
  "reason": "temporary_storage_unavailable",
  "retryAfterMs": 60000
}
```

## 9. 可靠性设计

### 9.1 投递语义

采用 `at-least-once` 投递。

原因：

- 分布式链路里强 exactly-once 成本高。
- 客户端、云端、本地接收端都有重试。
- 用 `eventId`、`batchId`、`deliveryId` 做幂等更现实。

要求：

- SDK 生成全局唯一 `eventId`。
- SDK batch 有唯一 `batchId`。
- 云端 delivery 有唯一 `deliveryId`。
- 云端对重复 `eventId` 和 `batchId` 做去重或标记。
- 本地接收端契约要求按 `eventId` 幂等处理。

### 9.2 客户端可靠性

- 网络失败不丢事件，先进本地队列。
- 队列满时按策略丢弃低优先级或旧事件，并产生 health event。
- 使用指数退避和 jitter。
- flush 时不能阻塞主线程。
- App 退出/后台前尽力 flush。

### 9.3 云端可靠性

- 接收成功前必须写入 durable queue。
- queue 写入失败要返回可重试错误。
- ACK 前 batch 不可删除。
- ACK 后进入可清理状态。
- NACK 或超时进入重试。
- 超过重试阈值进入 dead-letter。
- 支持按 receiver 重放指定时间段或 batch。

### 9.4 背压和限流

- sourceKey 级别限流。
- tenant/product 级别限流。
- receiver backlog 超阈值时降速或暂停接收。
- SDK 收到 `retryAfterMs` 必须退避。
- 云端返回明确错误码，不让 SDK 猜。

## 10. 安全和隐私设计

### 10.1 鉴权

客户端上传：

- `sourceKey` 第一阶段够用。
- 生产建议加入 HMAC signature。
- 支持 key rotation。

本地接收端拉取：

- `receiverToken`。
- receiver 绑定 tenant/product/app routing scope。
- token 可撤销和轮换。

### 10.2 数据保护

- 全链路 HTTPS。
- 云端日志不打印完整事件 body。
- forbidden 字段 SDK 拦截，云端二次检查。
- secret/content 字段直接拒收。
- personal/sensitive 字段必须 manifest 声明。

### 10.3 审计

记录：

- source 注册和 token 变更。
- batch 接收。
- delivery 拉取。
- ACK / NACK。
- dead-letter。
- schema 校验失败。
- forbidden 字段命中。

## 11. 可观测性设计

### 11.1 SDK 指标

- queue depth。
- queued event count。
- upload success count。
- upload failure count。
- dropped event count。
- retry count。
- last flush time。

### 11.2 云端指标

- ingest requests。
- accepted/rejected events。
- duplicate events。
- validation failures。
- queue depth by receiver。
- delivery pending count。
- ack latency。
- retry count。
- dead-letter count。
- p95/p99 API latency。

### 11.3 日志

结构化日志字段：

- requestId
- tenantId
- productId
- appId
- sourceId
- receiverId
- batchId
- deliveryId
- errorCode

不要记录用户内容和完整 properties。

## 12. 错误码设计

错误码分层：

```text
SDK_CONFIG_INVALID
SDK_MANIFEST_MISSING
SDK_FORBIDDEN_FIELD
SDK_QUEUE_FULL
SDK_UPLOAD_FAILED

RELAY_AUTH_FAILED
RELAY_RATE_LIMITED
RELAY_SCHEMA_INVALID
RELAY_MANIFEST_VERSION_INACTIVE
RELAY_BATCH_DUPLICATE
RELAY_QUEUE_UNAVAILABLE

DELIVERY_RECEIVER_AUTH_FAILED
DELIVERY_CURSOR_INVALID
DELIVERY_NOT_FOUND
DELIVERY_ACK_CONFLICT
DELIVERY_RETRY_EXHAUSTED
```

所有错误必须定义：

- 是否可重试。
- 对 SDK/receiver 的建议动作。
- 是否进入审计。
- 是否进入 dead-letter。

## 13. 测试策略

### 13.1 Contract Tests

- event envelope schema 校验。
- batch schema 校验。
- relay delivery schema 校验。
- OpenAPI request/response 校验。

### 13.2 SDK Tests

- event builder。
- manifest validation。
- forbidden fields。
- privacy levels。
- queue overflow。
- retry/backoff。
- batch uploader。

### 13.3 Relay Tests

- auth。
- schema light validation。
- duplicate batch。
- duplicate event。
- queue persist。
- receiver pull。
- ACK / NACK。
- retry。
- dead-letter。

### 13.4 End-to-End MVP Test

```text
SDK creates 3 events
  -> upload batch to relay
  -> relay stores batch
  -> receiver mock pulls batch
  -> receiver mock ACKs
  -> relay marks delivery acked
```

验收必须能打印：

- accepted event count。
- queued batch count。
- delivered batch count。
- acked delivery count。

## 14. 开发分期

### Phase 0: 契约先行

目标：锁定数据结构和边界。

交付：

- schemas。
- fixtures。
- OpenAPI。
- error codes。
- retry policy。
- sample manifests。

验收：

- schema check 通过。
- fixture check 通过。
- 文档能支撑团队评审。

### Phase 1: JS SDK + Relay Mock 闭环

目标：本地跑通第一条完整链路。

交付：

- JS/Tauri SDK core。
- in-memory/file queue。
- batch uploader。
- Relay service MVP。
- receiver mock pull/ack。
- E2E test。

验收：

- SDK 能生成合法事件。
- forbidden 字段被拦截。
- relay 能接收 batch。
- receiver mock 能拉取并 ACK。

### Phase 2: Relay 持久化和投递状态

目标：把 relay 从 mock 变成可试运行服务。

交付：

- durable queue。
- idempotency store。
- delivery state。
- retry/dead-letter。
- basic metrics。
- migration scripts。

验收：

- relay 重启不丢未 ACK batch。
- 重复上传不重复投递。
- NACK/timeout 能重试。
- dead-letter 可查询。

### Phase 3: 多端 SDK 扩展

目标：扩到 Cast-SDK / PicPeek 需要的平台。

交付：

- Rust desktop adapter。
- Android Kotlin SDK skeleton。
- iOS Swift SDK skeleton。
- Android TV queue policy。
- platform lifecycle adapters。

验收：

- 每端都有同一 schema fixture。
- 每端都能通过 contract tests。

### Phase 4: 生产加固

目标：可灰度上线。

交付：

- token rotation。
- HMAC signature。
- OpenTelemetry。
- rate limit。
- operational runbook。
- deployment manifests。
- data retention policy。

验收：

- 压测。
- 故障注入。
- 安全检查。
- 可观测性检查。

## 15. 工程化要求

### 15.1 代码质量

- Contract-first：先改 schema/OpenAPI，再改实现。
- 所有 schema 有 fixture。
- 所有 API 有 request/response fixture。
- 所有错误码有文档和测试。
- 不允许未定义事件绕过校验。
- 客户端 SDK 新增依赖或默认能力时必须记录包体影响和可选拆分方案。

### 15.2 版本管理

- schemaVersion 独立版本。
- manifestVersion 独立版本。
- SDK version 独立版本。
- relay API version 独立版本。

兼容原则：

- 新增 optional 字段兼容。
- 删除字段必须走 deprecation。
- enum 新增需要 catalog 发布。
- enum 改含义禁止。

### 15.3 CI 检查

建议脚本：

```text
schema-check
fixture-check
manifest-lint
openapi-check
unit-test
e2e-test
forbidden-field-test
```

### 15.4 文档要求

每个模块必须有：

- README。
- 边界说明。
- API/配置说明。
- 错误码说明。
- 测试方式。

## 16. MVP 推荐任务拆分

第一批任务：

1. 创建 schemas 和 fixtures。
2. 创建 SDK 上传 API OpenAPI。
3. 创建 relay delivery API OpenAPI。
4. 创建错误码和重试策略文档。
5. 实现 schema/fixture checker。
6. 实现 JS SDK event builder + privacy filter。
7. 实现 SDK 本地内存队列和 batch builder。
8. 实现 relay MVP：upload、queue、pull、ack。
9. 实现 E2E test。
10. 补团队评审文档和 CompletionClaim。

## 17. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 项目跑成本地数据平台 | 项目规则明确不做本地接收端和分析平台 |
| 自动埋点采集过多隐私数据 | SDK 默认 forbidden 字段拦截，云端二次检查 |
| 多端实现分叉 | schema/fixtures/contract tests 统一 |
| relay 丢数据 | durable queue + ACK 前不删除 + retry/dead-letter |
| 重复投递 | eventId/batchId/deliveryId 幂等 |
| 本地接收端对接不清 | OpenAPI + fixtures + receiver mock |
| 一开始做太重 | Phase 0/1 先跑通 MVP |

## CompletionClaim

objectiveMet: true

evidenceRefs:

- `/Users/meimei/Documents/SignalLake-SDK/docs/architecture/2026-07-05-signallake-upload-chain-architecture-and-implementation-plan.md`
- `/Users/meimei/Documents/SignalLake-SDK/AGENTS.md`
- `/Users/meimei/Documents/SignalLake-SDK/CLAUDE.md`

testsOrChecks:

- 方案明确项目边界：SDK + 云端接收/中转 + 本地接收端契约。
- 方案明确不实现本地接收端、本地落库、本地解析计算分析。
- 方案覆盖数据流、定义流、投递流、API、可靠性、安全性、可观测性、测试和分期。

risks:

- 具体云端部署环境尚未确定。
- 第一阶段队列技术选型需在实现前确认。
- 多端 SDK 的实现顺序需要结合首个接入产品确认。

receiver: user / SignalLake SDK project team

systemIssueRefs: []

skillGapRefs: []

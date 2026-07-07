# SignalLake SDK Initial Product Brief

## Name

- Product: SignalLake SDK
- Chinese: 信湖数据 SDK
- Project id: signallake-sdk

## Product Family Context

SignalLake can be the broader product family name.

This project is only the SDK project inside that family.

## One-Line Positioning

SignalLake SDK 是面向私有化、本地部署和企业数据闭环场景的数据埋点 SDK，负责把产品、设备、用户行为和业务信号以标准事件方式采集、缓存、治理并安全上报。

## Why SDK-Only

The SDK is the first product project because it is the data entry point. It must define what events are collected, how data is shaped, how identity/session state is handled, how offline behavior works, and what privacy controls exist before Edge or Agent can reliably consume the data.

## Owned Scope

- client-side and server-side instrumentation interfaces
- event schema and event validation
- user identity, device identity, session identity
- automatic and manual event tracking
- offline cache, retry, batching, and upload
- privacy controls before data leaves the client or local runtime
- SDK integration documentation
- SDK compatibility and acceptance tests

## Out Of Scope

### SignalLake Edge

Edge owns local data storage, local compute, cleaning, aggregation, desensitization at data-foundation level, and sync runtime.

The SDK only sends events to Edge or another configured receiver.

### SignalLake Agent

Agent owns natural-language data query, metric explanation, anomaly analysis, insight generation, and report generation.

The SDK only provides analyzable event data; it does not answer business questions.

### SignalLake Console

Console owns management UI, visualization, dashboard, and rule configuration.

The SDK may expose config contracts for Console, but it does not implement Console.

## Initial Validation Goal

The first validation goal is to create a clean SDK-only project entrypoint, record product boundaries, and prove the project can use goal-completion.v1 from the first initialization task.


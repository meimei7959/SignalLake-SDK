# SignalLake SDK Data Instrumentation Architecture

Date: 2026-07-04

## GoalFrame

objective: Design the first architecture plan for SignalLake SDK as a reusable, multi-product, multi-platform data instrumentation SDK.

successCriteria:

- SDK lets client apps report structured behavior data after integration.
- SDK uses generic tracking rules instead of one-off product-specific event design.
- SDK supports future reuse across Cast-SDK, PicPeek, and later products.
- SDK supports TV, macOS, Windows, Android, iOS, and Tauri-style desktop apps.
- SDK boundary stays clear: collect, shape, validate, cache, and upload events; parsing, storage, compute, dashboards, and business analytics belong to downstream products.

constraints:

- Do not turn this SDK into a heavy data platform.
- Do not capture raw user content, filenames, image contents, clipboard text, or business-sensitive fields by default.
- Do not require every product team to hand-write every tracking event.
- Do not depend on a single UI framework or one product's runtime.

receiver: user / agent.signallake-sdk.product-manager

## Field Research Takeaways

Industry products converge on the same split:

- A small client SDK emits events.
- A stable event envelope carries identity, session, app, device, context, and custom properties.
- Standard calls usually include `identify`, `track`, `page`, and `screen`.
- Autocapture is useful for lifecycle, screen/page navigation, and safe UI interactions, but arbitrary raw UI/text capture creates privacy and semantic noise.
- Open semantic conventions help data remain understandable across languages and platforms.
- A common event envelope helps downstream parsing and routing.

References:

- RudderStack event spec: `track`, `identify`, `page`, `screen`
  - https://www.rudderstack.com/docs/event-spec/standard-events/track/
  - https://www.rudderstack.com/docs/event-spec/standard-events/identify/
  - https://www.rudderstack.com/docs/event-spec/standard-events/page/
  - https://www.rudderstack.com/docs/event-spec/standard-events/screen/
- PostHog autocapture: navigation, lifecycle, interaction autocapture
  - https://posthog.com/docs/product-analytics/autocapture
- OpenTelemetry semantic conventions: common attributes for events, logs, metrics, traces, resources, mobile, browser, app, session, device, user
  - https://opentelemetry.io/docs/specs/semconv/
- CloudEvents: common event envelope for event declaration and delivery
  - https://cloudevents.io/

## Recommended Product Shape

SignalLake SDK should be a "semantic instrumentation SDK", not a general big-data product.

It should own:

- event envelope
- event taxonomy
- identity/session contract
- app/device/runtime context
- privacy classification and redaction
- offline queue and retry
- upload protocol
- platform adapters
- product event manifest
- contract tests and validation tools

It should not own:

- event parsing service
- warehouse table design beyond contract examples
- stream processing
- BI/dashboard
- product-specific metric definitions
- customer-specific event taxonomy beyond examples

## Core Idea

Automatic tracking should not mean "capture every click and guess later".

Better rule:

1. Runtime SDK automatically captures stable platform facts.
2. Product code declares semantic UI/action IDs through lightweight annotations or manifest metadata.
3. Codex development workflow enforces that new screens, commands, and important user actions have tracking metadata.
4. SDK emits generic, normalized events from those semantic IDs.
5. Downstream parser can understand events without reading each product's code.

This gives automatic data with meaning.

## Data Lifecycle

```text
Client App
  -> SignalLake SDK
    -> collect event
    -> attach app/device/session/user/context
    -> validate against local schema
    -> privacy filter/redact
    -> persist offline queue
    -> batch upload
  -> SignalLake Receiver / Edge / Collector
    -> authenticate source
    -> validate schema version
    -> parse/enrich
    -> write raw event log
    -> write normalized event table
    -> sessionize / aggregate / compute
  -> Analysis / Dashboard / Agent
```

SDK repository owns only the first block and the upload contract into the second block.

## Universal Event Grammar

Use a simple grammar:

```text
actor did action on object in context with outcome
```

Required dimensions:

- actor: anonymous user, logged-in user, account, device, app instance
- action: viewed, opened, clicked, selected, searched, played, paused, compared, casted, exported, failed
- object: screen, button, menu item, file, image, device, receiver, session, playback, command
- context: product, platform, app version, screen/workspace, network, locale, route, feature flag
- outcome: success, failed, canceled, timeout, denied, unsupported

Recommended generic event kinds:

- `app.lifecycle`
- `session`
- `identity`
- `navigation`
- `interaction`
- `command`
- `content`
- `media`
- `cast`
- `file`
- `error`
- `performance`
- `network`
- `custom`

Recommended naming:

```text
<product_area>.<object>.<action>
```

Examples:

- `app.opened`
- `session.started`
- `screen.viewed`
- `workspace.changed`
- `command.invoked`
- `file.opened`
- `image.viewed`
- `compare.started`
- `device.discovered`
- `cast.started`
- `playback.failed`

## Event Envelope

Use a CloudEvents-inspired envelope, plus product analytics fields.

```json
{
  "specversion": "1.0",
  "id": "018fc5d2-7bb2-7b7e-8c66-7c8f8a5a31c7",
  "type": "screen.viewed",
  "source": "app://picpeek/macos",
  "time": "2026-07-04T09:30:00.000Z",
  "datacontenttype": "application/json",
  "dataschema": "signallake://schemas/event/v1",
  "subject": {
    "anonymousId": "anon_...",
    "userId": null,
    "accountId": null
  },
  "session": {
    "id": "sess_...",
    "index": 3,
    "startedAt": "2026-07-04T09:20:00.000Z"
  },
  "app": {
    "productId": "picpeek",
    "appId": "picpeek.desktop",
    "version": "1.2.6",
    "build": "100126",
    "environment": "production"
  },
  "device": {
    "platform": "macos",
    "osVersion": "15.x",
    "deviceClass": "desktop",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai",
    "networkType": "wifi"
  },
  "event": {
    "kind": "navigation",
    "action": "viewed",
    "objectType": "screen",
    "objectId": "browse",
    "screen": "browse",
    "outcome": "success"
  },
  "properties": {
    "entry": "app_launch"
  },
  "privacy": {
    "level": "internal",
    "consent": "analytics",
    "redactions": []
  },
  "trace": {
    "traceId": null,
    "spanId": null
  }
}
```

## Standard API Surface

Minimum API:

```text
init(config)
identify(userId, traits)
resetIdentity()
startSession()
endSession()
screen(name, properties)
page(name, properties)
track(eventName, properties)
command(commandId, properties)
error(error, context)
flush()
setConsent(consentState)
shutdown()
```

Product-level helper API:

```text
SignalLake.command("picpeek.browse.open_folder")
SignalLake.content("image.viewed", { format, widthBucket, heightBucket })
SignalLake.media("playback.started", { mediaType, sourceType })
SignalLake.cast("device.discovered", { receiverType, protocol })
```

## Autocapture Strategy

Autocapture should have levels.

Level 0: disabled.

Level 1: safe default.

- app opened/backgrounded/closed
- app installed/updated
- session started/ended
- crash/error
- screen/page/workspace viewed
- SDK upload health

Level 2: semantic UI actions.

- button/menu/shortcut/remote-control actions that have stable semantic IDs
- route transitions
- command bus events
- Tauri command invocations
- Android Activity/Fragment/Compose navigation
- iOS UIViewController/SwiftUI navigation

Level 3: domain adapters.

- Cast-SDK: discovery, connect, cast, playback, live session, receiver status
- PicPeek: browse, image view, folder compare, free compare, pin, export
- Future products: product-specific adapters compiled from manifest

Level 4: raw interaction capture.

- off by default
- only for controlled internal diagnostics
- must strip text/content
- must sample heavily
- must be disabled in privacy-sensitive builds unless explicitly allowed

## Codex Development Workflow

Because products are built with Codex, tracking should become part of implementation rules.

Every new user-facing screen, command, menu item, toolbar action, route, workflow, and important state transition should carry a tracking descriptor.

Example descriptor:

```yaml
id: picpeek.browse.open_folder
kind: command
objectType: folder
action: opened
screen: browse
privacyLevel: internal
properties:
  - name: entry
    type: enum
    values: [toolbar, menu, drag_drop, cli]
  - name: imageCountBucket
    type: enum
    values: [0, 1_10, 11_100, 101_1000, 1000_plus]
forbiddenProperties:
  - folderPath
  - fileName
  - imageContent
```

CI checks:

- event manifest schema valid
- event IDs stable and unique
- new UI commands have descriptors
- forbidden properties not emitted
- SDK emits valid event envelope fixtures
- sample events can be parsed by receiver contract tests

This is the main way to avoid hand-written tracking plans.

## Multi-Platform SDK Architecture

Recommended repository structure:

```text
schemas/
  event-envelope.v1.json
  event-manifest.v1.json
  privacy-classification.v1.json

sdk/
  core-contract/
    README.md
    fixtures/
  js/
    browser/
    tauri/
    react/
    svelte/
  rust/
    signallake-core/
    signallake-tauri/
    signallake-cli-fixtures/
  android/
    signallake-android/
    signallake-android-tv/
  ios/
    signallake-ios/
  desktop/
    windows-native/
    macos-native/

adapters/
  cast-sdk/
  picpeek/
  tauri-command/
  android-lifecycle/
  ios-lifecycle/
  web-navigation/

tools/
  manifest-lint/
  event-fixture-generator/
  codex-tracking-audit/
  receiver-contract-test/

docs/
  architecture/
  integration/
  privacy/
  event-taxonomy/
```

Implementation rule:

- Shared schema and fixtures are the source of truth.
- Each platform SDK is native enough to hook lifecycle and offline storage correctly.
- Rust core is useful for desktop/Tauri, CLI tools, fixtures, and shared validation, but mobile lifecycle hooks should still be native-first.
- JavaScript SDK covers web and Tauri frontend events.
- Tauri adapter bridges frontend events and Rust backend queue/upload.
- Android TV adapter must be low-memory and lifecycle-safe.

## Offline Queue And Upload

SDK must assume weak networks and TV/desktop app lifecycle interruptions.

Required behavior:

- local durable queue
- event size limit
- batch size limit
- retry with exponential backoff
- jitter
- dedupe by event `id`
- upload compression when available
- flush on foreground/background boundary
- drop policy when queue exceeds max size
- SDK health events for dropped/failed/uploaded counts

Upload contract:

```text
POST /v1/events/batch
Authorization: Bearer <writeKey or source token>
Content-Type: application/json
Content-Encoding: gzip optional

{
  "batchId": "...",
  "sentAt": "...",
  "source": {
    "productId": "picpeek",
    "appId": "picpeek.desktop",
    "sdkName": "signallake-rust",
    "sdkVersion": "0.1.0"
  },
  "events": []
}
```

Response:

```json
{
  "accepted": 20,
  "rejected": 0,
  "retryAfterMs": null,
  "errors": []
}
```

## Privacy Rules

Default deny for sensitive data.

Allowed by default:

- product ID
- app version/build
- platform
- OS version
- device class
- locale/timezone
- screen/workspace ID
- action ID
- object type
- coarse counts and buckets
- status/outcome/error code

Denied by default:

- file paths
- filenames
- image/video/audio contents
- clipboard content
- raw text from UI fields
- user email/name/phone
- precise location
- access tokens
- customer business data
- raw device serials

Use privacy classes:

- `public`
- `internal`
- `personal`
- `sensitive`
- `secret`
- `content`

SDK must block `secret` and `content` by default. `personal` requires consent and explicit field declaration.

## Cast-SDK Adapter

Cast-SDK is a strong reference for SDK architecture because it already separates reusable SDK core from platform backends.

Useful pattern:

- contract-first API
- platform backend adapters
- stable error codes
- diagnostics separated from public app UI
- Android receiver runtime owns state machine
- Tauri demo calls Rust facade
- mobile HTTP server contract
- media/cast lifecycle with explicit sessions

Recommended Cast-SDK events:

- `cast.discovery.started`
- `cast.device.discovered`
- `cast.device.selected`
- `cast.connection.started`
- `cast.connection.failed`
- `cast.session.started`
- `cast.session.stopped`
- `cast.media.cast_started`
- `cast.media.cast_succeeded`
- `cast.media.cast_failed`
- `cast.playback.played`
- `cast.playback.paused`
- `cast.playback.stopped`
- `cast.live.started`
- `cast.live.ready`
- `cast.live.failed`
- `cast.receiver.status_changed`

Do not send:

- raw media URL
- local file path
- receiver private token
- image/video content

Safe properties:

- protocol: `dlna`, `rtsp`, `http`
- mediaType: `image`, `video`, `live_camera`, `live_screen`
- receiverType: `own_receiver`, `third_party`, `unknown`
- outcome
- errorCode
- duration bucket
- network type
- device count bucket

## PicPeek Adapter

PicPeek is a strong reference for desktop/Tauri + Rust + Svelte and privacy-sensitive local-first behavior.

Recommended PicPeek events:

- `app.opened`
- `workspace.changed`
- `browse.folder_opened`
- `browse.image_viewed`
- `browse.search_used`
- `compare.folder_pair_opened`
- `compare.started`
- `compare.result_viewed`
- `free_compare.board_created`
- `pin.created`
- `fullscreen.opened`
- `thumbnail.cache_enabled`
- `thumbnail.generated`
- `error.displayed`

Do not send:

- image contents
- image file names
- folder paths
- clipboard image contents
- visual diff pixels

Safe properties:

- fileType
- imageCountBucket
- folderDepthBucket
- compareMode
- workspace
- cacheEnabled
- durationMsBucket
- platform
- source: `toolbar`, `menu`, `drag_drop`, `cli`, `shortcut`

## How Client Teams Integrate

Tauri app:

```ts
import { SignalLake } from "@signallake/sdk-tauri";

SignalLake.init({
  productId: "picpeek",
  appId: "picpeek.desktop",
  endpoint: "https://collector.example.com/v1/events/batch",
  manifest: eventManifest,
  autocapture: {
    lifecycle: true,
    navigation: true,
    commands: true,
    rawInteractions: false
  }
});

SignalLake.command("picpeek.browse.open_folder", {
  entry: "toolbar",
  imageCountBucket: "101_1000"
});
```

Android:

```kotlin
SignalLake.init(
  SignalLakeConfig(
    productId = "cast-sdk",
    appId = "cast.receiver.android",
    endpoint = "...",
    autocaptureLifecycle = true,
    autocaptureScreens = true
  )
)

SignalLake.screen("receiver_home")
SignalLake.track("cast.receiver.status_changed", mapOf("status" to "ready"))
```

iOS:

```swift
SignalLake.shared.setup(
  productId: "cast-sdk",
  appId: "cast.sender.ios",
  endpoint: "..."
)

SignalLake.shared.screen("device_list")
SignalLake.shared.track("cast.device.selected", properties: ["receiverType": "own_receiver"])
```

## Milestones

M0: Contract.

- event envelope schema
- event manifest schema
- privacy classes
- upload contract
- 20 sample fixtures
- Cast-SDK and PicPeek sample manifests

M1: Local SDK skeleton.

- JS/Tauri SDK
- Rust queue/uploader
- manifest validator
- contract tests
- local mock collector

M2: First product integration.

- PicPeek Tauri integration in dry-run/local-log mode
- no network by default
- verify lifecycle/navigation/command events
- verify privacy blocks file paths and filenames

M3: Cast-SDK integration.

- Rust/Tauri sender events
- Android receiver lifecycle/session events
- media/cast adapter events
- low-memory Android TV queue policy

M4: Mobile SDKs.

- Android native SDK
- iOS native SDK
- automatic lifecycle/screen capture
- offline queue
- upload retry

M5: Downstream receiver contract.

- collector mock
- schema validation
- raw event log format
- normalized table contract examples
- sessionization examples

## First Implementation Tasks

1. Create `schemas/event-envelope.v1.json`.
2. Create `schemas/event-manifest.v1.json`.
3. Create `docs/event-taxonomy/base-events.md`.
4. Create `sdk/rust/signallake-core` for event model, validation, queue, upload interfaces.
5. Create `sdk/js/tauri` for frontend command/screen helpers.
6. Create `tools/manifest-lint`.
7. Create sample manifests for Cast-SDK and PicPeek.
8. Create mock collector and contract tests.
9. Add Codex rule: new user-facing command/screen requires tracking descriptor.

## CompletionClaim

objectiveMet: true

evidenceRefs:

- `/Users/meimei/Documents/SignalLake-SDK/README.md`
- `/Users/meimei/Documents/SignalLake-SDK/docs/product/initial-product-brief.md`
- `/Users/meimei/Documents/SignalLake-SDK/docs/boundaries/product-boundary.md`
- `/Users/meimei/Documents/Cast-SDK/README.md`
- `/Users/meimei/Documents/Cast-SDK/docs/sender-sdk-api-contract.md`
- `/Users/meimei/Documents/Cast-SDK/docs/product-prd.md`
- `/Users/meimei/Documents/PicPeek/README.md`
- `/Users/meimei/Documents/PicPeek/docs/prd.md`

testsOrChecks:

- Confirmed SignalLake SDK currently has no implementation code and is ready for contract-first design.
- Reviewed Cast-SDK structure and SDK boundary patterns.
- Reviewed PicPeek structure and local-first privacy/product behavior.
- Reviewed current public docs for event specs, autocapture, semantic conventions, and event envelopes.

risks:

- Exact downstream collector/Edge API is not defined yet.
- Product analytics questions and dashboard layer are outside this SDK proposal.
- Fully automatic raw UI capture should remain off by default due to privacy and low semantic quality.
- Mobile lifecycle and background upload behavior need platform-specific validation.

receiver: user / agent.signallake-sdk.product-manager

systemIssueRefs:

- context-mode reported local installed version `v1.0.159` while `v1.0.169` is available.

skillGapRefs: []


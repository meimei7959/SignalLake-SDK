# Android Production Reporting Closure

## Scope

This document closes the Android receiver production reporting gaps owned by
SignalLake SDK:

- runtime 32-byte key injection
- relay local/debug configuration
- Android AAR build and API 19 verification

Cast-SDK remains responsible only for app-layer configuration, consent-gated
start, track, and flush. Cast-SDK must not implement SignalLake key, encryption,
relay, queue, or uploader internals.

## SDK Must Provide

### Key API

Android SDK provides:

- `SignalLakeKeyProvider`
- `SignalLakeDebugKeyProvider`
- `SignalLake.startWithKeyProvider(...)`
- `SignalLake.startAsync(...)`

Debug start:

```java
SignalLakeKeyProvider keyProvider = new SignalLakeDebugKeyProvider(
    "debug-cast-receiver-202607",
    debugKeyBytes,
    BuildConfig.DEBUG);

SignalLakeClient client = SignalLake.startWithKeyProvider(configBuilder, keyProvider);
```

`configBuilder` must include `.eventCatalog(...)`. The catalog is the runtime
snapshot exported from SignalLake governance; events not present in that catalog
are rejected before they enter the SDK queue.

Async production start:

```java
Future<SignalLakeClient> pendingClient =
    SignalLake.startAsync(configBuilder, productionKeyProvider);
```

`SignalLakeDebugKeyProvider` rejects non-debug builds. The SDK does not embed a
production key.

### Debug Key Rule

Generate a local debug key outside source control:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Pass it to the app through a debug-only channel such as a local Gradle property,
ADB shell extra, debug config file excluded from source control, or internal
test device management. Decode it into 32 bytes after privacy consent, then pass
it to `SignalLakeDebugKeyProvider`.

Do not commit debug keys. Do not reuse debug keys for production.

### Production Key Delivery

Production apps should fetch key material after privacy consent from a backend
key endpoint controlled by the product/operator.

Suggested response shape:

```json
{
  "keyId": "slk_cast_receiver_prod_202607_r01",
  "key": "<base64-32-byte-aes-key>",
  "notBefore": "2026-07-01T00:00:00.000Z",
  "expiresAt": "2026-08-01T00:00:00.000Z"
}
```

Rules:

- key is 32 bytes after base64 decode
- `keyId` is stable for one rotation window
- app keeps key material in memory only for v1
- app refetches on launch or provider failure
- do not store plaintext key on disk
- do not use Android ID, IMEI, MAC, IP, SSID, or BSSID as key inputs

Suggested `keyId` format:

```text
slk_<product>_<environment>_<yyyyMM>_rNN
```

Example:

```text
slk_cast_receiver_prod_202607_r01
```

Rotation:

- backend publishes a new `keyId` and key
- relay still only sees ciphertext and `keyId`
- decrypting downstream service keeps old keys readable for retention window
- revoke by disabling a `keyId` in downstream decrypt/ingest policy
- emergency revoke should stop accepting or decrypting that `keyId`

Relay never decrypts event payloads and must remain ciphertext-only.

## Relay Local Debug

Start local relay:

```bash
SIGNALLAKE_RELAY_TOKEN=local-token \
SIGNALLAKE_RELAY_STORE_PATH=.signallake/relay-store.json \
npm run relay:dev
```

Upload URL:

```text
http://127.0.0.1:4318/v1/upload
```

Android uploader config:

```java
.httpUploader(
    "http://127.0.0.1:4318/v1/upload",
    "local-token",
    5000,
    5000)
```

For emulator, use:

```text
http://10.0.2.2:4318/v1/upload
```

For a physical TV/box, use the host machine LAN address and keep the relay
bound only inside the trusted development network.

Auth header is handled by SDK uploader:

```text
Authorization: Bearer <token>
```

Validation:

- `/v1/upload` accepts only `signallake.encrypted-event-batch.v1`
- plaintext `signallake.event-batch.v1` is rejected
- relay stores/forwards ciphertext and does not decrypt

Confirm encrypted delivery:

```bash
npm run relay:verify-local
```

or run the existing relay HTTP/e2e tests in an environment that allows
`127.0.0.1` listen sockets:

```bash
npm test
```

Expected relay evidence:

- upload status `202`
- delivery pull returns one encrypted batch
- ACK returns `200`
- payload contains `payload.ciphertext`
- payload does not contain plaintext event names or properties

For fixture-only inspection without a running relay:

```bash
node tests/helpers/print-encrypted-upload-fixture.mjs
```

## Android Build Verification

Run on a machine with JDK, Gradle wrapper support, and Android SDK:

```bash
bash scripts/android/verify-release.sh
```

Expected AAR:

```text
sdk/android/signallake-android/build/outputs/aar/signallake-android-release.aar
```

The script prints:

- Java version
- Android SDK location
- AAR path
- AAR byte size
- consumer ProGuard/R8 rule confirmation

## API 19 / Android 4.4 Verification Matrix

Run:

```bash
npm run android:verify-api19
```

The script first looks for a connected API 19 device. On Intel Android CI hosts
it can create and boot an API 19 emulator. On Apple Silicon Macs, API 19 emulator
images are `armeabi-v7a` or `x86`; current arm64 emulator builds cannot run the
old ARMv7 image reliably. For Apple Silicon, use a physical Android 4.4/API 19
device or an Intel CI host.

Minimum matrix:

| Device | API | Check |
| --- | --- | --- |
| Android 4.4 emulator or box | 19 | SDK no-op before consent |
| Android 4.4 emulator or box | 19 | AES/GCM encrypt + flush with debug relay |
| Android TV old box | 19-23 | App start remains responsive |
| Android TV current box | 28+ | End-to-end encrypted upload |

Pass conditions:

- no collection before consent
- no install/device identifier before consent
- `SignalLakeDebugKeyProvider` works only for debug builds
- encrypted upload succeeds with `signallake.encrypted-event-batch.v1`
- relay pull shows ciphertext only
- Cast-SDK DLNA/player/image/receiver core code remains untouched

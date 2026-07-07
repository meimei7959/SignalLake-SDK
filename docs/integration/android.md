# Android Integration

Use the Android AAR module at `sdk/android/signallake-android`.
Real clients must be started with a versioned `SignalLakeEventCatalog`; the SDK
rejects events that are not registered in that catalog before queueing.

## Gradle

During local integration, include the module from this repository:

```kotlin
include(":signallake-android")
project(":signallake-android").projectDir =
    file("../SignalLake-SDK/sdk/android/signallake-android")
```

Then depend on it from the Android app:

```kotlin
implementation(project(":signallake-android"))
```

The host app declares network permission if upload is enabled:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

For binary delivery, build:

```bash
./gradlew -p sdk/android :signallake-android:assembleRelease
```

Expected artifact:

```text
sdk/android/signallake-android/build/outputs/aar/signallake-android-release.aar
```

## Consent Gate

Before privacy consent:

```java
SignalLakeClient analytics = SignalLake.noop();
```

The no-op client does not collect, upload, generate install/device identifiers,
write files, or start background threads.

After consent, the app layer starts the real client:

```java
SignalLakeConfig.Builder configBuilder = new SignalLakeConfig.Builder()
    .source(new Source(
        "com.zknowai.labi.cast.receiver",
        "Cast-SDK",
        "signallake-android",
        "0.1.0",
        "android-tv",
        BuildConfig.VERSION_NAME,
        "prod"))
    .identity(new Identity(consentedInstallId, consentedInstallId))
    .session(UUID.randomUUID().toString(), isoNow())
    .eventCatalog(castReceiverCatalog)
    .queuePolicy(SignalLakeQueuePolicy.androidTvDefault())
    .httpUploader("https://relay.example.com/v1/upload", relayToken, 5000, 5000);

analytics = SignalLake.startWithKeyProvider(configBuilder, productionKeyProvider);
```

Use `SignalLake.startAsync(configBuilder, productionKeyProvider)` when the
provider fetches key material from a backend. For debug-only local testing, use
`SignalLakeDebugKeyProvider(keyId, keyBytes, BuildConfig.DEBUG)`.

See [android-production-closure.md](android-production-closure.md) for key
delivery, relay debug, AAR build, and API 19 verification.

## Event API

```java
Map<String, Object> props = SignalLakeProperties.builder()
    .channel("official")
    .buildId(BuildConfig.BUILD_ID)
    .networkType(SignalLakeCommonValues.NetworkType.ETHERNET)
    .outcome(SignalLakeCommonValues.Outcome.SUCCESS)
    .build();

analytics.trackAppOpened(props);
analytics.trackScreenViewed("receiver.home", props);
analytics.trackCommandInvoked("player.start", props);
analytics.trackErrorOccurred("PLAYER_START_FAILED", props);
analytics.flush();
```

`flush()` returns `Future<FlushResult>`. Upload failure is captured in
`FlushResult`; it does not throw onto the host app thread.

## Common Field Governance

SignalLake SDK owns cross-product public field names, types, enum values, and
deprecation rules. Products should use SDK constants/builders instead of
handwriting common strings.

Canonical contract:

```text
schemas/common-properties.v1.json
docs/event-taxonomy/common-fields.md
```

Android APIs:

```java
SignalLakeCommonFields.CHANNEL_ID;
SignalLakeCommonValues.Outcome.SUCCESS;
SignalLakeProperties.builder().outcome(SignalLakeCommonValues.Outcome.SUCCESS);
```

Safe Android Context-derived fields:

```java
Map<String, Object> props = SignalLakeAndroidContext.commonProperties(context)
    .channel("official")
    .buildId(BuildConfig.BUILD_ID)
    .build();
```

The SDK may derive package name, app version, version code, locale, timezone,
and OS version from Android Context after consent. It does not derive network
identifiers, hardware identifiers, Android ID, IMEI, SSID, BSSID, IP, MAC,
filenames, URLs, or media metadata.

Common Cast-SDK receiver fields:

- `screenId`
- `commandId`
- `errorCode`
- `protocol`
- `playerBackend`
- `mediaKind`
- `durationBucket`
- `outcome`
- `channelId`
- `channelName`
- `buildId`
- `networkType`

Use `putProductField(...)` only for product-specific fields declared as
`scope: "product"` in the product event manifest.

Forbidden examples:

- URL
- filename
- path
- media title
- raw metadata
- IP
- MAC
- SSID / BSSID
- IMEI
- Android ID
- token / secret / password
- email / phone

## Non-Invasive Rule

Do not modify Cast-SDK DLNA, player, image, or receiver SDK core code for
analytics. Integrate only at app layer, analytics adapter, existing runtime
state observer, or existing log observer. Missing hooks should be reported as
integration gaps.

## Android 4.4 / API 19 Crypto

The SDK uses `Cipher.getInstance("AES/GCM/NoPadding")` with
`GCMParameterSpec(128, nonce)`. It does not use API 23+
`KeyGenParameterSpec` as the Android 4.4 path. Host apps inject key bytes and
`keyId` at runtime.

## Queue

The first Android delivery uses an in-memory ring buffer. Default Android TV
policy keeps 100 events and flushes 20 events per batch. Failed encrypted upload
is retained in memory for retry; plaintext is not written to disk.

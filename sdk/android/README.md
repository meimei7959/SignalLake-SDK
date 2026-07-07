# SignalLake Android SDK

Android SDK module path:

```text
sdk/android/signallake-android
```

Gradle target:

```bash
./gradlew -p sdk/android :signallake-android:assembleRelease
```

The expected AAR path after a successful Android build is:

```text
sdk/android/signallake-android/build/outputs/aar/signallake-android-release.aar
```

## Shape

- `com.android.library`
- `minSdk 19`
- no default OkHttp / WorkManager / Gson / Retrofit / Room dependency
- consumer ProGuard/R8 rules in `signallake-android/consumer-rules.pro`
- platform `HttpURLConnection` uploader
- API 19-compatible `AES/GCM/NoPadding` encryption
- in-memory ring queue only; no plaintext disk queue

The SDK manifest does not add network permission automatically. Host apps that
enable upload should declare `android.permission.INTERNET`.

## Consent Boundary

Before privacy consent, use `SignalLake.noop()`. The no-op client does not
collect, upload, generate install/device identifiers, write files, or start a
background thread.

After consent, the host creates a `SignalLakeConfig` and calls `SignalLake.start`.
The host must provide `Identity`, `sessionId`, `SignalLakeEncryptionKey`, and
uploader config. The host must also provide a versioned `SignalLakeEventCatalog`;
the SDK rejects unregistered events before queueing. The SDK never embeds
production keys.

For production key delivery, prefer `SignalLakeKeyProvider`:

```java
SignalLakeClient client = SignalLake.startWithKeyProvider(configBuilder, keyProvider);
```

Use `SignalLake.startAsync(configBuilder, keyProvider)` when the provider fetches
key material from a backend. Use `SignalLakeDebugKeyProvider` only for
debug/local relay testing; it rejects non-debug builds.

Full closure guide:

```text
docs/integration/android-production-closure.md
```

## Upload Boundary

Plain `signallake.event-batch.v1` objects are internal only. Every upload uses
`signallake.encrypted-event-batch.v1`. Relay must remain ciphertext-only.

## Field Governance

The SDK owns public common fields through:

- `schemas/common-properties.v1.json`
- `docs/event-taxonomy/common-fields.md`
- `SignalLakeCommonFields`
- `SignalLakeCommonValues`
- `SignalLakeProperties`

Use `SignalLakeProperties.builder()` for cross-product fields such as
`channelId`, `buildId`, `networkType`, `outcome`, and `errorCode`. Use
`putProductField(...)` only for fields declared as `scope: "product"` in the
product manifest.

`SignalLakeAndroidContext.commonProperties(context)` can add safe Context-derived
fields: version code, locale, timezone, and OS version. It does not read network
identifiers, hardware identifiers, Android ID, IMEI, SSID, BSSID, IP, MAC,
filenames, URLs, or media metadata.

## Cast-SDK Boundary

Cast-SDK receiver integration should live in the app layer or analytics adapter.
Do not modify DLNA, player, image, or receiver SDK core code for analytics.

# JS/Tauri Dry-Run Integration

```js
import { createTauriSignalLake } from "./sdk/js/tauri/src/index.mjs";

const sdk = createTauriSignalLake({
  source: {
    appId: "app.picpeek.desktop",
    product: "PicPeek",
    sdkName: "signallake-js-tauri",
    sdkVersion: "0.0.0",
    platform: "tauri",
    appVersion: "0.1.0",
    environment: "test"
  },
  identity: {
    anonymousId: "anon_123",
    deviceId: "device_123"
  },
  session: {
    sessionId: "session_123",
    startedAt: new Date().toISOString()
  },
  encryption: {
    keyId: "local-dev-key",
    keyBytes: keyBytesFromPlatformKeychain
  }
});

sdk.trackAppOpened({ launchType: "manual" });
sdk.trackScreenViewed("library", { routeKey: "main" });
sdk.trackCommandInvoked("folder.open", { entry: "toolbar" });

const encryptedBatch = await sdk.drainEncryptedBatch();
```

Dry-run mode does not upload by default. Any payload sent to `/v1/upload`
must use `drainEncryptedBatch()`. `drainBatch()` is only for local tests and
must not cross the client boundary.

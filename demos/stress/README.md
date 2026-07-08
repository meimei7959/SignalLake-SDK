# SignalLake Stress Demo

This demo exercises SDK behavior under weak network and high event volume.

Run:

```bash
npm run stress
```

Fast Tauri-only run:

```bash
npm run stress:tauri
```

Android real-device click run:

```bash
npm run stress:android-click
```

Config:

```bash
SIGNALLAKE_STRESS_EVENTS=100000 npm run stress:tauri
SIGNALLAKE_STRESS_MAX_BYTES=65536 SIGNALLAKE_STRESS_MAX_BATCHES=10 npm run stress:tauri
```

The Tauri demo validates:

- `track*` stays local and fast.
- encrypted disk queue never exceeds configured byte and batch caps.
- oldest encrypted batches are dropped under pressure.
- queue files do not contain plaintext event names.
- slow upload simulation keeps max in-flight upload at `1`.
- recovery upload drains pending encrypted batches.

Platform coverage:

- JS/Tauri: executable stress demo plus Node test wrapper.
- Rust: `cargo test` includes disk queue stress.
- iOS: `swift test` includes disk queue stress.
- Android: installable `signallake-stress-demo` app plus adb real-device click test. It taps `Clear`, `Run Offline`, `Recover`, and `Run Slow`, then verifies bounded encrypted disk cache, no plaintext leak, recovery drain, and max in-flight upload of `1`.

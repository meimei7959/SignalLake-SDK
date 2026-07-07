#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT_DIR/sdk/android"
AVD_NAME="${SIGNALLAKE_API19_AVD_NAME:-signallake_api19}"
SYSTEM_IMAGE="${SIGNALLAKE_API19_SYSTEM_IMAGE:-system-images;android-19;default;armeabi-v7a}"

if [[ -z "${JAVA_HOME:-}" && -x "/opt/homebrew/opt/openjdk@17/bin/java" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
fi
if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/Library/Android/sdk" ]]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:/opt/homebrew/bin:$PATH"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT_DIR/.gradle-verify}"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb: missing"
  exit 1
fi
if ! command -v emulator >/dev/null 2>&1; then
  echo "emulator: missing"
  exit 1
fi
if ! command -v avdmanager >/dev/null 2>&1; then
  echo "avdmanager: missing"
  exit 1
fi

if ! emulator -list-avds | grep -qx "$AVD_NAME"; then
  echo "Creating AVD $AVD_NAME from $SYSTEM_IMAGE"
  echo "no" | avdmanager create avd --force --name "$AVD_NAME" --package "$SYSTEM_IMAGE" --device "Nexus 5"
fi

find_api19_serial() {
  adb devices | awk 'NR > 1 && $2 == "device" { print $1 }' | while read -r serial; do
    [[ -z "$serial" ]] && continue
    api="$(adb -s "$serial" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || true)"
    if [[ "$api" == "19" ]]; then
      echo "$serial"
      return 0
    fi
  done
}

DEVICE_SERIAL="$(find_api19_serial || true)"

if [[ -z "$DEVICE_SERIAL" ]]; then
  if [[ "$(uname -m)" == "arm64" ]]; then
    echo "No connected API 19 device found."
    echo "API 19 emulator images are armeabi-v7a/x86 only; this arm64 Mac emulator cannot run them reliably."
    echo "Connect an Android 4.4/API 19 device or run this script on an Intel Android CI host."
    exit 2
  fi
  echo "Starting emulator $AVD_NAME"
  emulator -avd "$AVD_NAME" -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect &
  EMULATOR_PID="$!"
  trap 'kill "$EMULATOR_PID" >/dev/null 2>&1 || true' EXIT
  for _ in $(seq 1 120); do
    DEVICE_SERIAL="$(find_api19_serial || true)"
    [[ -n "$DEVICE_SERIAL" ]] && break
    sleep 2
  done
  if [[ -z "$DEVICE_SERIAL" ]]; then
    echo "API 19 emulator did not appear"
    exit 1
  fi
  boot_completed=""
  for _ in $(seq 1 120); do
    boot_completed="$(adb -s "$DEVICE_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    [[ "$boot_completed" == "1" ]] && break
    sleep 2
  done
  if [[ "$boot_completed" != "1" ]]; then
    echo "emulator boot timeout"
    exit 1
  fi
fi

api_level="$(adb -s "$DEVICE_SERIAL" shell getprop ro.build.version.sdk | tr -d '\r')"
release="$(adb -s "$DEVICE_SERIAL" shell getprop ro.build.version.release | tr -d '\r')"
echo "DEVICE_SERIAL=$DEVICE_SERIAL"
echo "DEVICE_API=$api_level"
echo "DEVICE_RELEASE=$release"

if [[ "$api_level" != "19" ]]; then
  echo "expected API 19 device, got $api_level"
  exit 1
fi
export ANDROID_SERIAL="$DEVICE_SERIAL"

if [[ -x "$ANDROID_DIR/gradlew" ]]; then
  GRADLE_CMD=("$ANDROID_DIR/gradlew")
elif [[ -x "/opt/homebrew/opt/gradle@8/bin/gradle" ]]; then
  GRADLE_CMD=("/opt/homebrew/opt/gradle@8/bin/gradle")
else
  GRADLE_CMD=("gradle")
fi

"${GRADLE_CMD[@]}" \
  --no-daemon \
  -Dorg.gradle.vfs.watch=false \
  -p "$ANDROID_DIR" \
  -Pandroid.testInstrumentationRunnerArguments.class=dev.signallake.Api19CryptoInstrumentedTest \
  :signallake-android:connectedAndroidTest

echo "api19-aes-gcm=ok"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT_DIR/sdk/android"
TEST_APK="$ANDROID_DIR/signallake-android/build/outputs/apk/androidTest/debug/signallake-android-debug-androidTest.apk"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$ROOT_DIR/.gradle-verify}"

echo "== SignalLake Android instrumented test assemble =="

if [[ -z "${JAVA_HOME:-}" && -x "/opt/homebrew/opt/openjdk@17/bin/java" ]]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [[ -z "${JAVA_HOME:-}" && -x "/usr/local/opt/openjdk@17/bin/java" ]]; then
  export JAVA_HOME="/usr/local/opt/openjdk@17"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! command -v java >/dev/null 2>&1; then
  echo "java: missing. Install JDK 17 or set JAVA_HOME."
  exit 1
fi
java -version

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" && -d "$HOME/Library/Android/sdk" ]]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
fi

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT: missing"
  exit 1
fi
echo "ANDROID_HOME=${ANDROID_HOME:-}"
echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-}"

if [[ -x "$ANDROID_DIR/gradlew" ]]; then
  GRADLE_CMD=("$ANDROID_DIR/gradlew")
elif [[ -x "/opt/homebrew/opt/gradle@8/bin/gradle" ]]; then
  GRADLE_CMD=("/opt/homebrew/opt/gradle@8/bin/gradle")
elif [[ -x "/usr/local/opt/gradle@8/bin/gradle" ]]; then
  GRADLE_CMD=("/usr/local/opt/gradle@8/bin/gradle")
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_CMD=("gradle")
else
  echo "gradle: missing. Install Gradle 8 or add sdk/android/gradlew."
  exit 1
fi

"${GRADLE_CMD[@]}" \
  --no-daemon \
  -Dorg.gradle.vfs.watch=false \
  -p "$ANDROID_DIR" \
  :signallake-android:assembleAndroidTest

if [[ ! -f "$TEST_APK" ]]; then
  echo "ANDROID_TEST_APK missing: $TEST_APK"
  exit 1
fi

BYTES="$(wc -c < "$TEST_APK" | tr -d ' ')"
echo "ANDROID_TEST_APK=$TEST_APK"
echo "ANDROID_TEST_APK_BYTES=$BYTES"

#!/usr/bin/env bash
# Configure one target without changing the caller's working directory.
set -euo pipefail

: "${ARTIFACT_NAME:?artifact-name is required}"
: "${TARGET:?target is required}"
case "$TARGET" in
  web|android|linux|windows|macos|ios|ios-simulator) ;;
  *) echo "Unsupported build target: $TARGET" >&2; exit 1 ;;
esac
source "${BASH_SOURCE[0]%/*}/release.sh" version

scripts=$(cd "${BASH_SOURCE[0]%/*}" && pwd)
if [[ "$RUNNER_OS" == Windows ]]; then
  scripts=$(cygpath -m "$scripts")
fi
build_name=${version%%-*}
: "${ARCH:?architecture is required}"
if [[ "$TARGET" == web ]]; then
  case "$ARCH" in
    javascript|wasm) ;;
    *) echo "Unsupported Web architecture: $ARCH" >&2; exit 1 ;;
  esac
  build_name=$version
fi

printf '%s\n' \
  "APP_DIR=$APP_DIR" "ARTIFACT_NAME=$ARTIFACT_NAME" "FLUTTER_VERSION=$FLUTTER_VERSION" \
  "VERSION=$version" "BUILD_NAME=$build_name" "TARGET=$TARGET" "ARCH=$ARCH" \
  "ANDROID_SIGNING=false" "IOS_SIGNING=false" \
  "MP_BUILD_SCRIPTS=$scripts" >> "$GITHUB_ENV"

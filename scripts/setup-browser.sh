#!/usr/bin/env bash
set -euo pipefail

case "$RUNNER_OS" in
  Linux) browser=${BROWSER_PATH:-$(command -v google-chrome)} ;;
  macOS) browser='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ;;
  Windows)
    program_files=$(cygpath -m "${PROGRAMFILES:-${ProgramFiles:-C:/Program Files}}")
    browser="$program_files/Google/Chrome/Application/chrome.exe"
    ;;
  *) echo "Unsupported browser host: $RUNNER_OS" >&2; exit 1 ;;
esac
test -f "$browser"
# Intel macOS runners have no working GPU; use Chrome's software renderer.
if [[ "$RUNNER_OS" == macOS && "$RUNNER_ARCH" == X64 ]]; then
  wrapper="$RUNNER_TEMP/chrome-tests"
  printf '#!/bin/bash\nexec %q --use-angle=swiftshader --enable-unsafe-swiftshader "$@"\n' "$browser" > "$wrapper"
  chmod +x "$wrapper"
  browser=$wrapper
fi
echo "CHROME_EXECUTABLE=$browser" >> "$GITHUB_ENV"

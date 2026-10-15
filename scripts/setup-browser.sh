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
echo "CHROME_EXECUTABLE=$browser" >> "$GITHUB_ENV"

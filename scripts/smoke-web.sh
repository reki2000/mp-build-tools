#!/usr/bin/env bash
# Serve a built Web archive and load it in headless Chrome. Fails on a blank page or a reported page error.
set -euo pipefail

archive_dir=$1
port=${SMOKE_PORT:-8765}
site=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/web-smoke.XXXXXX")
unzip -q "$archive_dir"/*.zip -d "$site/app"

python3 -m http.server "$port" --bind 127.0.0.1 --directory "$site/app" > "$site/server.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for _ in $(seq 100); do
  curl -fsS "http://127.0.0.1:$port/" > /dev/null 2>&1 && break
  sleep 0.2
done

# A loaded runner sometimes dumps the page before the app has started, so a
# blank page is tried again before it fails.
rendered=false
for attempt in 1 2 3; do
  "$CHROME_EXECUTABLE" --headless=new --no-sandbox --disable-gpu --use-angle=swiftshader \
    --enable-unsafe-swiftshader --enable-logging=stderr --v=0 --virtual-time-budget=60000 \
    --dump-dom "http://127.0.0.1:$port/" > "$site/dom.html" 2> "$site/console.log" || true
  if grep -q '<flt-glass-pane' "$site/dom.html"; then
    rendered=true
    break
  fi
  echo "Web smoke test: attempt $attempt did not render the Flutter view" >&2
done

if [[ $rendered != true ]]; then
  echo 'Web smoke test: the Flutter view was not rendered' >&2
  tail -n 40 "$site/console.log" >&2 || true
  exit 1
fi
if grep -E 'CONSOLE.*(ERROR|SEVERE)|Uncaught' "$site/console.log"; then
  echo 'Web smoke test: the page reported an error' >&2
  exit 1
fi
echo "Web smoke test passed: $archive_dir"

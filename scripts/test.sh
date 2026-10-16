#!/usr/bin/env bash
set -euo pipefail

tool=${1:?Expected flutter or dart}
runtime=${2:?Expected vm, js or wasm}
shift 2
case "$tool" in
  flutter) args=(--platform tester) ;;
  dart) args=(--platform vm) ;;
  *) echo 'Expected flutter or dart' >&2; exit 1 ;;
esac
case "$runtime" in
  vm) ;;
  js) args=(--platform chrome) ;;
  wasm)
    args=(--platform chrome)
    if [[ "$tool" == flutter ]]; then args+=(--wasm); else args+=(--compiler dart2wasm --concurrency=1); fi
    ;;
  *) echo 'Expected vm, js or wasm' >&2; exit 1 ;;
esac

if [[ "$tool" == flutter && $# == 0 ]]; then
  files=()
  # Flutter compiles browser suites together, before evaluating @TestOn.
  # Respect the package's VM/browser annotations before invoking the compiler.
  while IFS= read -r -d '' file; do
    if [[ "$runtime" == vm ]]; then
      if grep -q "@TestOn('browser')" "$file"; then continue; fi
    elif grep -q "@TestOn('vm')" "$file"; then
      continue
    fi
    files+=("$file")
  done < <(find test -name '*_test.dart' -print0)
  if [[ ${#files[@]} == 0 ]]; then echo 'No compatible Flutter test suites' >&2; exit 1; fi
  set -- "${files[@]}"
fi

"$tool" test "${args[@]}" "$@"

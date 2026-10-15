const {readFileSync, writeFileSync, rmSync} = require('node:fs');
const {join} = require('node:path');

// Backport the URL fix and upstream WASM cache fix to the pinned test backend.
// https://github.com/flutter/flutter/issues/192069
// https://github.com/flutter/flutter/pull/189623
function prepare(source) {
  return source.replace(/shelf\.Response _localCanvasKitHandler[\s\S]*?\n  }/, handler => handler
    .replace('_fileSystem.path.fromUri(request.url)', 'request.url.path')
    .replace('headers: <String, Object>{HttpHeaders.contentTypeHeader: contentType},',
      "headers: <String, Object>{HttpHeaders.contentTypeHeader: contentType, HttpHeaders.cacheControlHeader: 'public, max-age=3600'},"));
}

if (require.main === module) {
  const sdk = process.env.FLUTTER_ROOT;
  const file = join(sdk, 'packages/flutter_tools/lib/src/test/flutter_web_platform.dart');
  const original = readFileSync(file, 'utf8');
  const updated = prepare(original);
  if (updated !== original) {
    writeFileSync(file, updated);
    for (const name of ['flutter_tools.snapshot', 'flutter_tools.stamp']) rmSync(join(sdk, 'bin/cache', name), {force: true});
  }
}

module.exports = prepare;

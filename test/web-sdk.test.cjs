const assert = require('node:assert/strict');
const {test} = require('node:test');
const prepare = require('../scripts/prepare-web-tests.cjs');

test('normalize only CanvasKit URLs, cache WASM responses and keep the SDK fix idempotent', () => {
  const source = `shelf.Response _localCanvasKitHandler(shelf.Request request) {
    final String fullPath = _fileSystem.path.fromUri(request.url);
    return shelf.Response.ok(file.openRead(),
      headers: <String, Object>{HttpHeaders.contentTypeHeader: contentType},
    );
  }
  final String otherPath = _fileSystem.path.fromUri(request.url);`;
  const updated = prepare(source);
  assert(updated.includes('final String fullPath = request.url.path;'));
  assert(updated.includes("HttpHeaders.cacheControlHeader: 'public, max-age=3600'"));
  assert(updated.includes('final String otherPath = _fileSystem.path.fromUri(request.url);'));
  assert.equal(prepare(updated), updated);
  assert.equal(prepare(source.replaceAll('\n', '\r\n')), updated.replaceAll('\n', '\r\n'));
});

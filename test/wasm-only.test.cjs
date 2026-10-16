const assert = require('node:assert/strict');
const {test} = require('node:test');
const wasmOnly = require('../scripts/wasm-only.cjs');

test('keep only Wasm build entries and preserve loader code', () => {
  const source = '_flutter.buildConfig = {"engineRevision":"fixture","builds":[{"compileTarget":"dart2wasm","mainWasmPath":"main.dart.wasm"},{"compileTarget":"dart2js","mainJsPath":"main.dart.js"}]};\n_flutter.loader.load();';
  const updated = wasmOnly(source);
  assert(!updated.includes('main.dart.js'));
  assert(updated.includes('main.dart.wasm'));
  assert(updated.endsWith('_flutter.loader.load();'));
  assert.equal(wasmOnly(updated), updated);
  assert.throws(() => wasmOnly('_flutter.buildConfig={"builds":[]};'));
  assert.throws(() => wasmOnly('changed SDK format'));
});

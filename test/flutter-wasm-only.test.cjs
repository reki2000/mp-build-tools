const assert = require('node:assert/strict');
const {test} = require('node:test');
const flutterWasmOnly = require('../scripts/flutter-wasm-only.cjs');

const source = `    if (useWasm) {
      compilerConfigs = <WebCompilerConfig>[
        WasmCompilerConfig(
          optimizationLevel: optimizationLevel,
          stripWasm: boolArg('strip-wasm'),
          sourceMaps: sourceMaps,
          minify: minifyWasm,
        ),
        JsCompilerConfig(
          csp: boolArg('csp'),
          dumpInfo: boolArg('dump-info'),
          minify: minifyJs,
          nativeNullAssertions: boolArg('native-null-assertions'),
          useFrequencyBasedMinification: !boolArg('no-frequency-based-minification'),
          optimizationLevel: jsOptimizationLevel,
          sourceMaps: sourceMaps,
        ),
      ];
    } else {
      compilerConfigs = <WebCompilerConfig>[
        JsCompilerConfig(
          csp: boolArg('csp'),
          dumpInfo: boolArg('dump-info'),
          minify: minifyJs,
          nativeNullAssertions: boolArg('native-null-assertions'),
          useFrequencyBasedMinification: !boolArg('no-frequency-based-minification'),
          optimizationLevel: jsOptimizationLevel,
          sourceMaps: sourceMaps,
          renderer: webRenderer,
        ),
      ];
    }`;

test('drop the JavaScript fallback from the Wasm build only and stay idempotent', () => {
  const updated = flutterWasmOnly(source);
  const wasmList = updated.slice(updated.indexOf('if (useWasm)'), updated.indexOf('} else'));
  assert(!wasmList.includes('JsCompilerConfig('));
  assert(wasmList.includes('WasmCompilerConfig('));
  assert(updated.includes('renderer: webRenderer'));
  assert.equal(flutterWasmOnly(updated), updated);
  assert.throws(() => flutterWasmOnly('changed SDK format'));
});

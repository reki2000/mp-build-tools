const {readFileSync, writeFileSync, rmSync} = require('node:fs');
const {join} = require('node:path');

// flutter build web --wasm compiles a JavaScript fallback next to the Wasm
// build and fails the whole build when that compile fails, but the Wasm
// platform ships no JavaScript. Drop the fallback from the Wasm build's
// compiler list so it compiles Wasm only.
function flutterWasmOnly(source) {
  const block = `        JsCompilerConfig(
          csp: boolArg('csp'),
          dumpInfo: boolArg('dump-info'),
          minify: minifyJs,
          nativeNullAssertions: boolArg('native-null-assertions'),
          useFrequencyBasedMinification: !boolArg('no-frequency-based-minification'),
          optimizationLevel: jsOptimizationLevel,
          sourceMaps: sourceMaps,
        ),
`;
  const at = source.indexOf(block);
  if (at < 0) {
    // Already patched when the Wasm build's list has no JavaScript compiler.
    const wasm = source.indexOf('WasmCompilerConfig(');
    if (wasm >= 0 && !source.slice(wasm, source.indexOf('];', wasm)).includes('JsCompilerConfig(')) return source;
    throw new Error('Flutter build_web.dart format was not recognized');
  }
  if (!source.slice(Math.max(0, at - 400), at).includes('WasmCompilerConfig(')) {
    throw new Error('Flutter build_web.dart format was not recognized');
  }
  return source.slice(0, at) + source.slice(at + block.length);
}

if (require.main === module) {
  const sdk = process.env.FLUTTER_ROOT;
  const file = join(sdk, 'packages/flutter_tools/lib/src/commands/build_web.dart');
  const original = readFileSync(file, 'utf8');
  const updated = flutterWasmOnly(original);
  if (updated !== original) {
    writeFileSync(file, updated);
    for (const name of ['flutter_tools.snapshot', 'flutter_tools.stamp']) rmSync(join(sdk, 'bin/cache', name), {force: true});
  }
}

module.exports = flutterWasmOnly;

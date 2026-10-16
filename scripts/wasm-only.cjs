const {readFileSync, writeFileSync, rmSync} = require('node:fs');
const {join} = require('node:path');

function wasmOnly(source) {
  let found = false;
  const updated = source.replace(/(_flutter\.buildConfig\s*=\s*)(\{.*?\});/s, (_, prefix, json) => {
    const config = JSON.parse(json);
    config.builds = config.builds.filter(build => build.compileTarget === 'dart2wasm');
    if (!config.builds.length) throw new Error('No Wasm build in Flutter bootstrap');
    found = true;
    return `${prefix}${JSON.stringify(config)};`;
  });
  if (!found) throw new Error('Flutter build config was not found');
  return updated;
}

if (require.main === module) {
  const directory = process.argv[2];
  const bootstrap = join(directory, 'flutter_bootstrap.js');
  writeFileSync(bootstrap, wasmOnly(readFileSync(bootstrap, 'utf8')));
  for (const name of ['main.dart.js', 'main.dart.js.map']) rmSync(join(directory, name), {force: true});
}
module.exports = wasmOnly;

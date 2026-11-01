const assert = require('node:assert/strict');
const {test} = require('node:test');
const {select, plan} = require('../scripts/plan.cjs');

test('default catalog covers every distribution target and five native test hosts', () => {
  const result = plan({full: true, commit: 'commit'});
  assert.deepEqual(result.manifest.artifacts, [
    'release-android-all', 'release-linux-x64', 'release-linux-arm64',
    'release-windows-x64', 'release-windows-arm64', 'release-macos-universal',
    'release-ios-arm64', 'release-ios-simulator-arm64', 'release-web-javascript', 'release-web-wasm',
  ]);
  assert.equal(result.tests.length, 5);
  assert.equal(new Set(result.tests.map(t => t.runner)).size, 5);
  assert.deepEqual(result.browsers.map(b => b.id), ['web-js', 'web-wasm']);
  assert.equal(result.wasm, true);
  assert.equal(result.manifest.commit, 'commit');
});

test('include and exclude select builds, tests, browser coverage and release expectations together', () => {
  const result = plan({include: '["macos","web-wasm"]', full: true});
  assert.deepEqual(result.builds.map(b => b.id), ['macos', 'web-wasm']);
  assert.deepEqual(result.tests.map(t => t.id), ['macos-arm64']);
  assert.deepEqual(result.browsers, [{id: 'web-wasm', runner: 'ubuntu-22.04', runtime: 'wasm', artifact: 'release-web-wasm'}]);
  assert.deepEqual(result.manifest.tests, ['macos-arm64', 'linux-x64']);
  assert.deepEqual(result.manifest.artifacts, ['release-macos-universal', 'release-web-wasm']);
  const reduced = plan({exclude: '["windows-arm64","web-js","web-wasm"]', full: true});
  assert.equal(reduced.builds.length, 7);
  assert.equal(reduced.wasm, false);
  assert(!reduced.tests.some(t => t.id === 'windows-arm64'));
});

test('Web platforms are independent: they add no native test hosts and run on the Web host', () => {
  const js = plan({include: '["web-js"]', full: false});
  assert.deepEqual(js.tests.map(t => t.id), ['linux-x64']);
  assert.deepEqual(js.browsers, [{id: 'web-js', runner: 'ubuntu-22.04', runtime: 'js', artifact: 'release-web-javascript'}]);
  assert.equal(js.wasm, false);
  const android = plan({include: '["android"]', full: false});
  assert.deepEqual(android.browsers, []);
  assert.equal(android.wasm, false);
});

test('ordinary PR/develop builds every selected Web platform; the release plan still records all selected platforms', () => {
  assert.deepEqual(plan({full: false}).builds.map(b => b.id), ['web-js', 'web-wasm']);
  assert.deepEqual(plan({include: '["android"]', full: false}).builds, []);
  assert.equal(plan({full: false}).manifest.platforms.length, 10);
});

test('consumer-listed release-only platforms build and test only in full plans', () => {
  const releaseOnly = '["windows-arm64","linux-arm64"]';
  assert.deepEqual(plan({full: false}).tests.map(t => t.id),
      ['linux-x64', 'linux-arm64', 'windows-x64', 'windows-arm64', 'macos-arm64']);
  const ordinary = plan({full: false, releaseOnly});
  assert.deepEqual(ordinary.tests.map(t => t.id), ['linux-x64', 'windows-x64', 'macos-arm64']);
  assert(!ordinary.manifest.tests.includes('windows-arm64'));
  assert(!ordinary.manifest.tests.includes('linux-arm64'));
  assert(ordinary.manifest.artifacts.includes('release-windows-arm64'));
  assert(ordinary.manifest.artifacts.includes('release-linux-arm64'));
  const full = plan({full: true, releaseOnly});
  assert(full.builds.some(b => b.id === 'windows-arm64'));
  assert(full.tests.some(t => t.id === 'windows-arm64'));
  assert(full.builds.some(b => b.id === 'linux-arm64'));
  assert(full.tests.some(t => t.id === 'linux-arm64'));
  const only = plan({include: '["windows-arm64"]', releaseOnly: '["windows-arm64"]', full: false});
  assert.deepEqual(only.builds, []);
  assert.deepEqual(only.tests.map(t => t.id), ['windows-arm64']);
  for (const bad of ['["unknown"]', '["windows-arm64","windows-arm64"]', '"windows-arm64"', 'not-json']) {
    assert.throws(() => plan({full: false, releaseOnly: bad}));
  }
});

test('invalid filters fail before scheduling runners', () => {
  for (const [include, exclude] of [
    ['["unknown"]', '[]'], ['["web-wasm","web-wasm"]', '[]'], ['"web-wasm"', '[]'],
    ['[]', '["unknown"]'], ['["web-wasm"]', '["ios"]'], ['["web"]', '[]'], ['not-json', '[]'],
    ['[]', JSON.stringify(select().map(p => p.id))],
  ]) assert.throws(() => select(include, exclude));
});

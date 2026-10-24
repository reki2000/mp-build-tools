const assert = require('node:assert/strict');
const {test} = require('node:test');
const {select, plan} = require('../scripts/plan.cjs');

test('default catalog covers every distribution target and six native test hosts', () => {
  const result = plan({full: true, commit: 'commit'});
  assert.deepEqual(result.manifest.artifacts, [
    'release-android-all', 'release-linux-x64', 'release-linux-arm64',
    'release-windows-x64', 'release-windows-arm64', 'release-macos-universal',
    'release-ios-arm64', 'release-ios-simulator-arm64', 'release-web-browser',
  ]);
  assert.equal(result.tests.length, 6);
  assert.equal(new Set(result.tests.map(t => t.runner)).size, 6);
  assert.equal(result.manifest.commit, 'commit');
});

test('include and exclude select builds, tests, browser coverage and release expectations together', () => {
  const result = plan({include: '["macos","web"]', full: true});
  assert.deepEqual(result.builds.map(b => b.id), ['macos', 'web']);
  assert.deepEqual(result.tests.map(t => t.id), ['macos-arm64', 'macos-x64']);
  assert.equal(result['web-runner'], 'ubuntu-22.04');
  assert.deepEqual(result.manifest.tests, ['macos-arm64', 'macos-x64', 'linux-x64']);
  assert.deepEqual(result.manifest.artifacts, ['release-macos-universal', 'release-web-browser']);
  const reduced = plan({exclude: '["windows-arm64","web"]', full: true});
  assert.equal(reduced.builds.length, 7);
  assert.equal(reduced.web, false);
  assert(!reduced.tests.some(t => t.id === 'windows-arm64'));
});

test('Web is an independent platform: it adds no native test hosts and runs on its build host', () => {
  const web = plan({include: '["web"]', full: false});
  assert.deepEqual(web.tests.map(t => t.id), ['linux-x64']);
  assert.equal(web['web-runner'], 'ubuntu-22.04');
  assert.equal(plan({include: '["android"]', full: false}).web, false);
  assert.equal(plan({include: '["android"]', full: false})['web-runner'], '');
});

test('ordinary PR/develop builds only selected Web; the release plan still records all selected platforms', () => {
  assert.deepEqual(plan({full: false}).builds.map(b => b.id), ['web']);
  assert.deepEqual(plan({include: '["android"]', full: false}).builds, []);
  assert.equal(plan({full: false}).manifest.platforms.length, 9);
});

test('invalid filters fail before scheduling runners', () => {
  for (const [include, exclude] of [
    ['["unknown"]', '[]'], ['["web","web"]', '[]'], ['"web"', '[]'],
    ['[]', '["unknown"]'], ['["web"]', '["ios"]'], ['not-json', '[]'],
    ['[]', JSON.stringify(select().map(p => p.id))],
  ]) assert.throws(() => select(include, exclude));
});

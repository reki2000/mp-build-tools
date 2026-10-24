const {builds, hosts} = require('../platforms.json');

function select(include = '[]', exclude = '[]') {
  const filters = [include, exclude].map(value => {
    const ids = JSON.parse(value);
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length ||
        ids.some(id => typeof id !== 'string' || !Object.hasOwn(builds, id))) {
      throw new Error('include/exclude must be JSON arrays of unique platform IDs from platforms.json');
    }
    return ids;
  });
  if (filters.every(ids => ids.length)) throw new Error('Use either include or exclude, not both');
  const ids = (filters[0].length ? filters[0] : Object.keys(builds)).filter(id => !filters[1].includes(id));
  if (!ids.length) throw new Error('Select at least one build platform');
  return ids.map(id => ({id, ...builds[id], runner: hosts[builds[id].host]}));
}

const artifactNames = platforms => platforms.map(p => `release-${p.target}-${p.arch}`);

function plan({include, exclude, full, commit}) {
  const selected = select(include, exclude);
  // Web platforms are independent of native platforms: their browser tests run in their own jobs
  // and add no native test hosts. A Web-only selection still runs the VM suites on the Web host.
  const browsers = selected.filter(p => p.target === 'web');
  const native = selected.filter(p => p.target !== 'web');
  const tests = [...new Set((native.length ? native : selected).flatMap(p => p['test-hosts'] || [p.host]))]
    .map(id => ({id, runner: hosts[id]}));
  const testedHosts = [...new Set([...tests.map(t => t.id), ...browsers.map(p => p.host)])];
  return {
    builds: selected.filter(p => full || p.target === 'web'),
    tests,
    browsers: browsers.map(p => ({id: p.id, runner: hosts[p.host], runtime: p['test-runtime'], artifact: artifactNames([p])[0]})),
    wasm: browsers.some(p => p.arch === 'wasm'),
    manifest: {schema: 1, commit, platforms: selected.map(p => p.id), artifacts: artifactNames(selected), tests: testedHosts},
  };
}

module.exports = {select, artifactNames, plan};

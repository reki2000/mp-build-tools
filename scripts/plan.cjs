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
  const tests = [...new Set(selected.flatMap(p => p['test-hosts'] || [p.host]))]
    .map(id => ({id, runner: hosts[id]}));
  return {
    builds: selected.filter(p => full || p.target === 'web'),
    tests,
    web: selected.some(p => p.target === 'web'),
    manifest: {schema: 1, commit, platforms: selected.map(p => p.id), artifacts: artifactNames(selected), tests: tests.map(t => t.id)},
  };
}

module.exports = {select, artifactNames, plan};

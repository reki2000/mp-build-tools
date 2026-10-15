const {existsSync, readFileSync, writeFileSync} = require('node:fs');
const {join} = require('node:path');
const {select, artifactNames} = require('./plan.cjs');

module.exports = async ({github, context, core}) => {
  const found = JSON.parse(process.env.FOUND_ARTIFACTS);
  if (found.length !== 1 || found[0].expired) {
    throw new Error('Missing full-build completion artifact');
  }

  const runId = found[0].workflow_run.id;
  const run = (await github.rest.actions.getWorkflowRun({...context.repo, run_id: runId})).data;
  const workflow = (await github.rest.actions.getWorkflow({...context.repo, workflow_id: process.env.BUILD_WORKFLOW || 'build-binaries.yaml'})).data;
  const fullBuild = run.event === 'workflow_dispatch' || (run.event === 'push' && run.head_branch === 'main');
  if (run.head_sha !== process.env.COMMIT || run.workflow_id !== workflow.id ||
      run.status !== 'completed' || run.conclusion !== 'success' || !fullBuild) {
    throw new Error('Tag requires a successful full main/manual build of this exact commit');
  }

  const artifacts = (await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {...context.repo, run_id: runId}))
    .filter(a => a.name.startsWith('release-'));
  const manifestDir = process.env.MANIFEST_DIR;
  const manifestPath = join(manifestDir, 'full-build-success.json');
  let manifest;
  let expected;
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.schema !== 1 || manifest.commit !== run.head_sha || !manifest.platforms?.length) {
      throw new Error('Invalid build manifest or commit');
    }
    expected = artifactNames(select(JSON.stringify(manifest.platforms)));
    if (JSON.stringify(expected) !== JSON.stringify(manifest.artifacts)) throw new Error('Inconsistent build manifest');
  } else {
    // Legacy builds always required the complete default platform set.
    if (readFileSync(join(manifestDir, 'full-build-success.txt'), 'utf8').trim() !== run.head_sha) {
      throw new Error('Invalid legacy build marker');
    }
    expected = artifactNames(select());
  }
  if (artifacts.length !== expected.length || artifacts.some(a => a.expired) || artifacts.map(a => a.name).sort().join() !== expected.sort().join()) {
    throw new Error('Incomplete or expired CI binaries');
  }

  core.setOutput('run_id', runId);
  core.setOutput('artifact_ids', artifacts.map(a => a.id).join(','));
  writeFileSync('BUILD-METADATA.json', JSON.stringify({
    tag: process.env.RELEASE_TAG,
    commit: run.head_sha,
    ci_run: run.html_url,
    ...(manifest && {build: manifest}),
    artifacts,
  }, null, 2) + '\n');
};

const { resolve, join } = require('path');
const {
  existsSync,
  statSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
} = require('fs');

const WORKFLOW_DIR = '.github/workflows';
const WORKFLOW_FILENAME = 'ellx-sync.yml';

function copyRecursiveSync(src, dest) {
  const exists = existsSync(src);
  const stats = exists && statSync(src);

  if (exists && stats.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    readdirSync(src).forEach(
      (child) => copyRecursiveSync(
        join(src, child),
        join(dest, child)
      )
    );
  } else {
    copyFileSync(src, dest);
  }
}

module.exports = function initWorkflow(force = false) {
  if (!force && (existsSync(resolve(WORKFLOW_DIR, WORKFLOW_FILENAME))
    || existsSync('.syncignore'))) return;

  console.log('Adding workflow to sync between Github and Ellx Cloud...');

  try {
    copyRecursiveSync(resolve(__dirname, 'files'), WORKFLOW_DIR);
  } catch (e) {
    console.error(e);
  }

  console.log(`
    Workflow added successfully.\n
    Please add secret to your repository as described here:\n\n
    https://docs.ellx.app/#sync-with-github
  `)
}

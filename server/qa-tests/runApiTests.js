#!/usr/bin/env node
/**
 * Run API QA tests with an optional env profile (qa-tests/config/<profile>.env).
 * Profile vars are set before Mocha starts so test files see them at load time.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const profile = process.argv[2];
const passthrough = process.argv.slice(3);
const serverRoot = path.resolve(__dirname, '..');

if (profile) {
  const profilePath = path.join(__dirname, 'config', `${profile}.env`);
  const loaded = dotenv.config({ path: profilePath });
  if (loaded.error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load QA profile "${profile}" from ${profilePath}`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`QA profile: ${profile} (${profilePath})`);
}

const mochaArgs = [
  'mocha',
  '--no-config',
  '--require',
  'qa-tests/setup.js',
  '--timeout',
  process.env.QA_TEST_TIMEOUT_MS || '120000',
  '--exit',
];

if (passthrough.length) {
  mochaArgs.push(...passthrough);
} else {
  mochaArgs.push('--spec', 'qa-tests/api/**/*.test.js');
}

const result = spawnSync('npx', mochaArgs, {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);

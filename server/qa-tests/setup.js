/**
 * Mocha global setup — loaded before any test files via .mocharc.json.
 * Configures NODE_ENV, loads .env.test, and blocks accidental production DB use.
 */
const path = require('path');
const dotenv = require('dotenv');

process.env.NODE_ENV = 'test';

const envTestPath = path.resolve(__dirname, '..', '.env.test');
const loaded = dotenv.config({ path: envTestPath, override: true });

if (loaded.error) {
  throw new Error(
    `Could not load ${envTestPath}. Copy .env.test.example to .env.test and configure a dedicated test database.`
  );
}

assertTestEnvironmentSafety();

function assertTestEnvironmentSafety() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('QA tests must run with NODE_ENV=test.');
  }

  if (process.env.ALLOW_TEST_DATABASE !== 'true') {
    throw new Error(
      'Tests blocked: set ALLOW_TEST_DATABASE=true in .env.test to confirm use of a dedicated test database.'
    );
  }

  const dbName = process.env.DB_NAME?.trim();
  if (!dbName) {
    throw new Error('DB_NAME is required in .env.test.');
  }

  const productionDbName = process.env.PRODUCTION_DB_NAME?.trim();
  if (productionDbName && dbName === productionDbName) {
    throw new Error(
      `Tests blocked: DB_NAME "${dbName}" matches PRODUCTION_DB_NAME. Use a separate test database.`
    );
  }

  const testDbMarker = process.env.TEST_DB_NAME_MARKER || '_test';
  if (!dbName.toLowerCase().includes(testDbMarker.toLowerCase())) {
    throw new Error(
      `Tests blocked: DB_NAME "${dbName}" must include "${testDbMarker}" (set TEST_DB_NAME_MARKER to override).`
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const urlLower = databaseUrl.toLowerCase();
    if (productionDbName && urlLower.includes(`/${productionDbName}`)) {
      throw new Error(
        'Tests blocked: DATABASE_URL appears to reference the production database.'
      );
    }
    if (!urlLower.includes(testDbMarker.toLowerCase())) {
      throw new Error(
        `Tests blocked: DATABASE_URL must reference a database whose name includes "${testDbMarker}".`
      );
    }
  }
}

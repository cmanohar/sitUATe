import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { SqliteAdapter } from '../src/adapters/sqlite.js';
import { runStorageAdapterConformance } from './support/conformance.js';

// `:memory:` gives each call a fresh, isolated database; screenshots go to a temp
// dir so the suite never writes into the package.
runStorageAdapterConformance('SqliteAdapter', () => {
  const shotsDir = mkdtempSync(resolve(tmpdir(), 'situate-sqlite-shots-'));
  return new SqliteAdapter({ dbPath: ':memory:', shotsDir });
});

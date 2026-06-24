import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { FilesAdapter } from '../src/adapters/files.js';
import { runStorageAdapterConformance } from './support/conformance.js';

runStorageAdapterConformance('FilesAdapter', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'situate-files-'));
  return new FilesAdapter(dir);
});

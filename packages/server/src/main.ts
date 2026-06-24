/**
 * Deployable entrypoint for the Fastify collector (FS-11). Selects an adapter from
 * env and listens. Config mirrors collector.mjs so it's a drop-in upgrade:
 *
 *   PORT                   default 8080
 *   SITUATE_STORE          `sqlite` (default) | `files`
 *   SITUATE_STORAGE_DIR    storage root (default ./.situate/data)
 *   SITUATE_SQLITE_PATH    SQLite file (default <storage>/situate.db)
 *   SITUATE_ALLOWED_ORIGIN CORS origin (default *)
 *   SITUATE_INGEST_TOKEN   if set, require matching `x-situate-token` on ingest
 *   SITUATE_ADMIN_TOKEN    if set, require matching `x-situate-admin-token` on admin routes
 *
 * Run with `npm run serve` (after build). `/healthz` backs the container healthcheck.
 */
import { resolve } from 'node:path';
import type { StorageAdapter } from '@situate/core';
import { buildServer } from './server.js';
import { FilesAdapter } from './adapters/files.js';
import { SqliteAdapter } from './adapters/sqlite.js';

const PORT = Number(process.env.PORT) || 8080;
const STORAGE_DIR = process.env.SITUATE_STORAGE_DIR || resolve(process.cwd(), '.situate/data');
const STORE = (process.env.SITUATE_STORE || 'sqlite').toLowerCase();

function makeAdapter(): StorageAdapter {
  if (STORE === 'files') return new FilesAdapter(STORAGE_DIR);
  if (STORE === 'sqlite') {
    const dbPath = process.env.SITUATE_SQLITE_PATH || resolve(STORAGE_DIR, 'situate.db');
    return new SqliteAdapter({ dbPath, shotsDir: resolve(STORAGE_DIR, 'shots') });
  }
  throw new Error(`unknown SITUATE_STORE: ${STORE} (expected 'sqlite' or 'files')`);
}

async function main(): Promise<void> {
  const app = await buildServer({
    adapter: makeAdapter(),
    allowedOrigin: process.env.SITUATE_ALLOWED_ORIGIN,
    ingestToken: process.env.SITUATE_INGEST_TOKEN || undefined,
    adminToken: process.env.SITUATE_ADMIN_TOKEN || undefined,
    logger: true,
  });
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`situate collector (${STORE}) on :${PORT} → ${STORAGE_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

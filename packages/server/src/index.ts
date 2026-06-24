/**
 * @situate/server — the Situate collector.
 *
 * - `buildServer` — the Fastify ingest + config + findings-query service (D9).
 * - `FilesAdapter` / `SqliteAdapter` — pluggable storage (D3); SQLite is the v1
 *   self-host default, Files keeps JSONL parity with `situate report`.
 * - `situateVitePlugin` — local dev file sink.
 * - `collector.mjs` (run via `npm run collect`) remains the dependency-free reference.
 */
export { buildServer, MAX_BODY } from './server.js';
export type { BuildServerOptions } from './server.js';
export { FilesAdapter } from './adapters/files.js';
export { SqliteAdapter } from './adapters/sqlite.js';
export type { SqliteAdapterOptions } from './adapters/sqlite.js';
export { situateVitePlugin } from './vite-plugin.js';
export type { SituateVitePluginOptions } from './vite-plugin.js';

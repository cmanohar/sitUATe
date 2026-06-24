/**
 * @situate/server — collector seed.
 *
 * Today: a Vite dev plugin (local file sink) + a dependency-free standalone
 * ingest service (`collector.mjs`, run via `npm run collect`).
 *
 * Sprint 2 evolves this into a Fastify service with a pluggable StorageAdapter
 * (files | SQLite | Postgres), the flag/allowlist config API that powers runtime
 * gating, and the admin query API. See docs/DESIGN.md.
 */
export { situateVitePlugin } from './vite-plugin.js';
export type { SituateVitePluginOptions } from './vite-plugin.js';

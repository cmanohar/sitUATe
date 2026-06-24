import type { StorageAdapter } from '@situate/core';

/** Shared dependencies handed to each route registrar. */
export interface ServerContext {
  adapter: StorageAdapter;
  /** If set, ingest requires a matching `x-situate-token` header (parity with collector.mjs). */
  ingestToken?: string;
}

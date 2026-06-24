import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StorageAdapter } from '@situate/core';

/** Shared dependencies handed to each route registrar. */
export interface ServerContext {
  adapter: StorageAdapter;
  /** If set, ingest requires a matching `x-situate-token` header (parity with collector.mjs). */
  ingestToken?: string;
  /**
   * If set, admin routes (findings list/status, config write, screenshot read)
   * require a matching `x-situate-admin-token`. MUST be set in production — the
   * client-side `isAdmin` gate is UX only; this is the server-side enforcement.
   */
  adminToken?: string;
}

/**
 * onRequest guard for admin routes. When `adminToken` is set, requires a matching
 * `x-situate-admin-token` header. When unset (local dev), allows — documented as a
 * residual: production MUST set the token and/or sit behind host auth.
 */
export function adminGuard(ctx: ServerContext) {
  return function (req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
    if (ctx.adminToken && req.headers['x-situate-admin-token'] !== ctx.adminToken) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    done();
  };
}

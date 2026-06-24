/**
 * Fastify collector (D9). Thin HTTP layer over a `StorageAdapter` — the factory
 * shape lets tests drive it with `app.inject()` (no sockets). Preserves the existing
 * ingest contract; adds the gating-config + findings-query APIs S3/S4 depend on.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { StorageAdapter } from '@situate/core';
import type { ServerContext } from './context.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerFeedbackRoutes } from './routes/feedback.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerFindingsRoutes } from './routes/findings.js';

/** 25 MB — screenshots can be large; Fastify's 1 MB default would reject them. */
export const MAX_BODY = 25 * 1024 * 1024;

export interface BuildServerOptions {
  adapter: StorageAdapter;
  /** CORS origin for the app (default `*`). */
  allowedOrigin?: string;
  /** If set, ingest requires a matching `x-situate-token` header. */
  ingestToken?: string;
  /** If set, admin routes require a matching `x-situate-admin-token`. Set in production. */
  adminToken?: string;
  bodyLimit?: number;
  logger?: boolean;
}

export async function buildServer(opts: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: opts.bodyLimit ?? MAX_BODY,
    logger: opts.logger ?? false,
  });

  await app.register(cors, {
    origin: opts.allowedOrigin ?? '*',
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-situate-token'],
  });

  const ctx: ServerContext = {
    adapter: opts.adapter,
    ingestToken: opts.ingestToken,
    adminToken: opts.adminToken,
  };
  registerHealthRoutes(app);
  registerFeedbackRoutes(app, ctx);
  registerConfigRoutes(app, ctx);
  registerFindingsRoutes(app, ctx);

  return app;
}

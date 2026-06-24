import type { FastifyInstance } from 'fastify';
import type { ListFindingsQuery, SituateFindingStatus } from '@situate/core';
import { adminGuard, type ServerContext } from '../context.js';

/**
 * Admin findings API (D8) — all routes are admin-guarded (findings + screenshots
 * may carry sensitive data). `GET /config/:env` stays open (the widget reads it);
 * everything here requires the admin token when one is configured.
 */
const STATUSES: SituateFindingStatus[] = [
  'new',
  'triaged',
  'planned',
  'in-progress',
  'shipped',
  'declined',
  'duplicate',
];

const querySchema = {
  type: 'object',
  properties: {
    from: { type: 'string' },
    to: { type: 'string' },
    status: { type: 'string', enum: STATUSES },
  },
} as const;

const statusBodySchema = {
  type: 'object',
  required: ['status'],
  additionalProperties: false,
  properties: { status: { type: 'string', enum: STATUSES } },
} as const;

export function registerFindingsRoutes(app: FastifyInstance, ctx: ServerContext): void {
  const onRequest = adminGuard(ctx);

  app.get('/findings', { onRequest, schema: { querystring: querySchema } }, async (req) => {
    return ctx.adapter.listFindings(req.query as ListFindingsQuery);
  });

  // Status mutation (S4 triage). The adapter has carried setStatus since S2.
  app.put(
    '/findings/:id/status',
    { onRequest, schema: { body: statusBodySchema } },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status: SituateFindingStatus };
      try {
        await ctx.adapter.setStatus(id, status);
        return reply.code(200).send({ ok: true });
      } catch {
        return reply.code(404).send({ error: 'unknown finding' });
      }
    },
  );

  // Screenshot bytes by server-generated filename — through the adapter (never the FS).
  app.get('/shots/:filename', { onRequest }, async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const png = await ctx.adapter.readScreenshot(filename);
    if (!png) return reply.code(404).send({ error: 'not found' });
    return reply.header('Content-Type', 'image/png').send(png);
  });
}

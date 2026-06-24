import type { FastifyInstance } from 'fastify';
import type { ListFindingsQuery } from '@situate/core';
import type { ServerContext } from '../context.js';

/**
 * Admin findings query (D8). Read-only this sprint — status *mutation* is S4 triage,
 * so no `PUT /findings/:id/status` route is exposed yet (the adapter supports it).
 */
const querySchema = {
  type: 'object',
  properties: {
    from: { type: 'string' },
    to: { type: 'string' },
    status: {
      type: 'string',
      enum: ['new', 'triaged', 'planned', 'in-progress', 'shipped', 'declined', 'duplicate'],
    },
  },
} as const;

export function registerFindingsRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.get('/findings', { schema: { querystring: querySchema } }, async (req) => {
    return ctx.adapter.listFindings(req.query as ListFindingsQuery);
  });
}

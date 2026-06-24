import type { FastifyInstance } from 'fastify';
import type { SituateGatingConfig } from '@situate/core';
import type { ServerContext } from '../context.js';

/**
 * Gating config API (D5). S3 fail-closed gating reads `GET /config/:env`; the admin
 * route writes via `PUT`. The body schema is strict — this is the contract gating trusts.
 */
const paramsSchema = {
  type: 'object',
  required: ['env'],
  properties: { env: { type: 'string', minLength: 1 } },
} as const;

const gatingSchema = {
  type: 'object',
  required: ['enabled', 'allowedRoles', 'allowedUserIds'],
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    allowedRoles: { type: 'array', items: { type: 'string' } },
    allowedUserIds: { type: 'array', items: { type: 'string' } },
  },
} as const;

export function registerConfigRoutes(app: FastifyInstance, ctx: ServerContext): void {
  app.get('/config/:env', { schema: { params: paramsSchema } }, async (req) => {
    const { env } = req.params as { env: string };
    return ctx.adapter.getGatingConfig(env);
  });

  app.put('/config/:env', { schema: { params: paramsSchema, body: gatingSchema } }, async (req, reply) => {
    const { env } = req.params as { env: string };
    await ctx.adapter.setGatingConfig(env, req.body as SituateGatingConfig);
    return reply.code(200).send({ ok: true });
  });
}

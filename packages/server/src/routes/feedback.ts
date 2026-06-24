import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UatFinding } from '@situate/core';
import type { ServerContext } from '../context.js';

/**
 * Ingest route — preserves the contract the overlay already POSTs to:
 *   POST /uat/feedback  { finding, pngBase64? }  →  200 { screenshotFile? }
 */
const bodySchema = {
  type: 'object',
  required: ['finding'],
  properties: {
    finding: { type: 'object' },
    pngBase64: { type: 'string' },
  },
} as const;

export function registerFeedbackRoutes(app: FastifyInstance, ctx: ServerContext): void {
  // Token check in onRequest (before body parse) so unauthorized 25 MB uploads are
  // rejected early — parity with collector.mjs's x-situate-token gate.
  function tokenGuard(req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
    if (ctx.ingestToken && req.headers['x-situate-token'] !== ctx.ingestToken) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    done();
  }

  app.post('/uat/feedback', { schema: { body: bodySchema }, onRequest: tokenGuard }, async (req, reply) => {
    const { finding, pngBase64 } = req.body as { finding: UatFinding; pngBase64?: string };

    let screenshotFile: string | undefined;
    if (pngBase64) {
      const base64 = String(pngBase64).replace(/^data:image\/png;base64,/, '');
      // Filename is server-generated inside the adapter — client paths are never trusted.
      screenshotFile = await ctx.adapter.saveScreenshot(finding.id, Buffer.from(base64, 'base64'));
      finding.screenshotFile = screenshotFile;
    }

    finding.status = finding.status ?? 'new';
    await ctx.adapter.saveFinding(finding);
    return reply.code(200).send({ screenshotFile });
  });
}

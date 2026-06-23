import type { BuildFindingInput, UatFinding } from './types.js';

/**
 * Stamp a draft into a complete {@link UatFinding}: generates the id, sets
 * `schemaVersion`, an ISO timestamp, and trims the comment. `screenshotFile`
 * is intentionally left unset — it is assigned by the transport/collector once
 * the image is stored.
 */
export function buildFinding(input: BuildFindingInput): UatFinding {
  return {
    ...input,
    id: globalThis.crypto.randomUUID(),
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    comment: input.comment.trim(),
  };
}

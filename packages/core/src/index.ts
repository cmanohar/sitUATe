/**
 * @cmanohar/flow-core — framework-agnostic logic for Flow feedback.
 *
 * Barrel export. Consumed by the React widget (@cmanohar/flow-feedback), the
 * collector/server, and the report CLI.
 */
export * from './types.js';
export * from './constants.js';
export { buildFinding } from './finding.js';
export {
  computeSelectorPath,
  extractElementMeta,
  getBoundingBox,
} from './selector.js';
export { captureElement, captureViewport } from './capture.js';
export { getCurrentRoute, installLocationTracking } from './location.js';
export {
  LOCAL_ENDPOINT,
  resolveEndpoint,
  submitFinding,
  flushQueue,
  readQueue,
  queueSize,
} from './transport.js';
export type { TransportConfig, SubmitResult } from './transport.js';
export { renderReport } from './report.js';
export type { ReportMeta } from './report.js';

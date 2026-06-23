/**
 * Flow feedback — shared types.
 *
 * Framework-agnostic. Carries no clinical/PHI semantics of its own — when Flow
 * is embedded in a healthcare app, PHI protection is the host's responsibility
 * plus Flow's redaction layer (see the capture module + DESIGN.md).
 *
 * Extracted from SerenityEMR `mvp/src/uat/types.ts`. The `Uat*` names are
 * retained for the extraction milestone and renamed to `Flow*` in a later sprint.
 */

export type UatCategory = 'bug' | 'change' | 'question';

/** Severity vocabulary matches the repo's review/feedback docs. */
export type UatSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/** Which instance produced the finding. */
export type UatEnvironment = 'clone' | 'local';

/** `element` = anchored to a clicked DOM node; `screen` = a whole-page note. */
export type UatScope = 'element' | 'screen';

/** Whether the tester is a clinician or an internal team member. */
export type TesterRole = 'hcp' | 'internal';

/** DOM-only identity for a selected element (no React-internals coupling). */
export interface SelectorInfo {
  cssPath?: string;
  testId?: string;
  ariaLabel?: string;
  role?: string;
  textSnippet?: string;
  tagName?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UatViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

/** A single captured finding. Rich enough to double as an AI-fix worklist item. */
export interface UatFinding {
  id: string;
  schemaVersion: 1;
  timestamp: string; // ISO 8601
  sessionId: string;
  environment: UatEnvironment;
  scope: UatScope;
  route: string; // pathname + search
  url: string; // full href
  viewport: UatViewport;
  selector?: SelectorInfo;
  boundingBox?: BoundingBox;
  category?: UatCategory;
  severity: UatSeverity;
  comment: string;
  screenshotFile?: string; // assigned by the transport/collector, not the client
  appVersion?: string;
  testerRole?: TesterRole;
  userAgent: string;
}

/** Everything the UI/session gathers before `buildFinding` stamps id/timestamp. */
export type BuildFindingInput = Omit<
  UatFinding,
  'id' | 'schemaVersion' | 'timestamp' | 'screenshotFile'
>;

/** A per-page-load session. */
export interface UatSession {
  sessionId: string;
  environment: UatEnvironment;
  startedAt: string;
}

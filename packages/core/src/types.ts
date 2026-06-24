/**
 * Situate feedback — shared types.
 *
 * Framework-agnostic. Carries no domain semantics of its own — when Situate
 * is embedded in a digital health application, sensitive-data protection is the host's
 * responsibility plus Situate's redaction layer (see the capture module + DESIGN.md).
 *
 * Extracted from an internal UAT overlay. The `Uat*` names are
 * retained deliberately — they read as the "UAT" inside "sit·UAT·e", so no
 * rename is planned.
 */

import type { SituateFindingStatus } from './gating.js';

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
  status?: SituateFindingStatus; // triage state, collector-managed (defaults to 'new' on ingest)
  appVersion?: string;
  testerRole?: TesterRole;
  userAgent: string;
}

/** Everything the UI/session gathers before `buildFinding` stamps id/timestamp. */
export type BuildFindingInput = Omit<
  UatFinding,
  'id' | 'schemaVersion' | 'timestamp' | 'screenshotFile' | 'status'
>;

/** A per-page-load session. */
export interface UatSession {
  sessionId: string;
  environment: UatEnvironment;
  startedAt: string;
}

import type { UatSeverity } from './types.js';

/** Attribute marking the overlay root so the picker + capture can ignore it. */
export const UAT_ROOT_ATTR = 'data-uat-root';

/** Sit above the host app but stay sane. */
export const UAT_Z_INDEX = 2_147_483_000;

export const STORAGE_KEYS = {
  queue: 'uat:queue',
  session: 'uat:session',
  testerRole: 'uat:tester-role',
} as const;

export const SEVERITIES: UatSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Severity → Tailwind token classes. The token names (`primary`,
 * `surface-container`, `on-surface-variant`, …) are defined by Flow's own
 * Tailwind preset / CSS-variable theme (see packages/widget), NOT by the host —
 * so the widget renders correctly in any app. Stock Tailwind palette colours
 * (`red-700`, `amber-700`, `yellow-700`, …) come from Tailwind defaults.
 */
export const SEVERITY_CLASSES: Record<UatSeverity, string> = {
  Critical: 'text-red-700 bg-red-50',
  High: 'text-amber-700 bg-amber-50',
  Medium: 'text-yellow-700 bg-yellow-50',
  Low: 'text-on-surface-variant bg-surface-container',
};

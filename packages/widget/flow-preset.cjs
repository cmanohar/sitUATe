/**
 * Flow Tailwind preset.
 *
 * Defines Flow's design tokens as CSS-variable-backed colours so the widget
 * renders correctly in ANY host — the host does NOT need to define SerenityEMR's
 * design tokens. Override the `--flow-*-rgb` variables in your own `:root` to
 * re-theme the overlay. RGB channel format enables Tailwind opacity modifiers
 * (e.g. `bg-primary/10`, `border-outline-variant/40`).
 *
 * Two ways to consume:
 *   1. Standalone CSS:  import '@cmanohar/flow-feedback/styles.css'  (no Tailwind needed)
 *   2. Tailwind host:   add this preset + the widget src to your content globs.
 */
const channel = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: channel('--flow-primary-rgb'),
        'on-primary': channel('--flow-on-primary-rgb'),
        surface: channel('--flow-surface-rgb'),
        'surface-container-lowest': channel('--flow-surface-container-lowest-rgb'),
        'surface-container': channel('--flow-surface-container-rgb'),
        'surface-container-high': channel('--flow-surface-container-high-rgb'),
        'on-surface': channel('--flow-on-surface-rgb'),
        'on-surface-variant': channel('--flow-on-surface-variant-rgb'),
        'outline-variant': channel('--flow-outline-variant-rgb'),
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      fontFamily: {
        body: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
};

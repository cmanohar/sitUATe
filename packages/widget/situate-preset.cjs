/**
 * Situate Tailwind preset.
 *
 * Defines Situate's design tokens as CSS-variable-backed colours so the widget
 * renders correctly in ANY host — the host does NOT need to define the origin app's
 * design tokens. Override the `--st-*-rgb` variables in your own `:root` to
 * re-theme the overlay. RGB channel format enables Tailwind opacity modifiers
 * (e.g. `bg-primary/10`, `border-outline-variant/40`).
 *
 * Two ways to consume:
 *   1. Standalone CSS:  import '@situate/widget/styles.css'  (no Tailwind needed)
 *   2. Tailwind host:   add this preset + the widget src to your content globs.
 */
const channel = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: channel('--st-primary-rgb'),
        'on-primary': channel('--st-on-primary-rgb'),
        surface: channel('--st-surface-rgb'),
        'surface-container-lowest': channel('--st-surface-container-lowest-rgb'),
        'surface-container': channel('--st-surface-container-rgb'),
        'surface-container-high': channel('--st-surface-container-high-rgb'),
        'on-surface': channel('--st-on-surface-rgb'),
        'on-surface-variant': channel('--st-on-surface-variant-rgb'),
        'outline-variant': channel('--st-outline-variant-rgb'),
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

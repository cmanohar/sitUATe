/**
 * Tailwind config for building the widget's self-contained stylesheet
 * (`dist/styles.css`). Preflight is disabled so importing the stylesheet never
 * clobbers the host app's global styles — only the `--tw-*` custom-property
 * defaults (needed by ring/shadow/transform utilities) and the utilities Flow
 * actually uses are emitted.
 */
module.exports = {
  presets: [require('./flow-preset.cjs')],
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
};

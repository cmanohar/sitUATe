import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flowVitePlugin } from '@cmanohar/flow-server';

/**
 * Example host config.
 *
 * Note what is NOT here: no Tailwind, no SerenityEMR design tokens. The overlay
 * styles itself entirely from `@cmanohar/flow-feedback/styles.css` — proving the
 * widget is style-decoupled from any host.
 *
 * `flowVitePlugin()` adds the local `POST /__uat/feedback` sink so saved
 * feedback lands in `flow-sessions/<date>-<user>/` for `flow-report` to render.
 */
export default defineConfig({
  plugins: [react(), flowVitePlugin()],
});

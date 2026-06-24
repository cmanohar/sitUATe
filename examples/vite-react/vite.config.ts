import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { situateVitePlugin } from '@situate/server';

/**
 * Example host config.
 *
 * Note what is NOT here: no Tailwind, no origin-app design tokens. The overlay
 * styles itself entirely from `@situate/widget/styles.css` — proving the
 * widget is style-decoupled from any host.
 *
 * `situateVitePlugin()` adds the local `POST /__uat/feedback` sink so saved
 * feedback lands in `.situate/sessions/<date>-<user>/` for `situate report` to render.
 */
export default defineConfig({
  plugins: [react(), situateVitePlugin()],
});

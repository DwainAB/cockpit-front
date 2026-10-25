import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** questionnaire.html est servi à la racine du site (`/?t=<jeton>`), en développement comme une fois publié. */
const servedAtRoot = (): Plugin => ({
  name: 'questionnaire-at-root',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/' || req.url?.startsWith('/?')) req.url = req.url.replace(/^\//, '/questionnaire.html');
      next();
    });
  },
  closeBundle() {
    const page = path.resolve(__dirname, 'dist-questionnaire/questionnaire.html');
    if (fs.existsSync(page)) fs.renameSync(page, path.resolve(__dirname, 'dist-questionnaire/index.html'));
  },
});

/**
 * Page publique du questionnaire (lien envoyé au restaurateur), construite à part du cockpit :
 * `npm run build:questionnaire` → dist-questionnaire/, à publier telle quelle (site statique).
 * Elle parle directement à l'API Yumco (VITE_YUMCO_API_URL), jamais au backend du cockpit.
 */
export default defineConfig({
  plugins: [react(), servedAtRoot()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5174 },
  build: {
    outDir: 'dist-questionnaire',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: path.resolve(__dirname, 'questionnaire.html') },
  },
});

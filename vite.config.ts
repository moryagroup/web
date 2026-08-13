import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function versionJsonPlugin(): Plugin {
  const buildTime = new Date().toISOString();
  return {
    name: 'generate-version-json',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        path.resolve(publicDir, 'version.json'),
        JSON.stringify({ version: buildTime, timestamp: Date.now() }, null, 2)
      );
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildTime, timestamp: Date.now() }, null, 2),
      });
    },
  };
}

export default defineConfig(() => {
  const buildTime = new Date().toISOString();
  return {
    base: './',
    define: {
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [react(), tailwindcss(), versionJsonPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { resolve } from 'path';

export default defineConfig(() => ({
  root: import.meta.dirname,
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  publicDir: '../../public',
  cacheDir: '../../node_modules/.vite/item-bank',
  server: {
    port: 4200,
    host: 'localhost',
    watch: {
      // Use polling to avoid EMFILE (too many open files) on systems with low inotify/fd limits
      usePolling: true,
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/item-bank',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));

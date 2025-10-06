/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ahora `@/…` apunta a src
    },
  },
  test: {
    environment: 'jsdom',                  // necesario para Testing Library
    globals: true,                          // define `expect`, `vi`, etc. como globales
    setupFiles: './src/test/setup.ts',      // corre antes de los tests
    css: true,                              // permite importar CSS en pruebas si hace falta
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});

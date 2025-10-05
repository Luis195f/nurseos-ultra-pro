/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // se mantiene tu alias a src
    },
  },
  // Evita que Vite escanee otros HTML (p. ej., playwright-report/index.html)
  optimizeDeps: {
    entries: ['index.html'],
  },
  test: {
    environment: 'jsdom',             // Testing Library
    globals: true,                     // expect/vi globales
    setupFiles: './src/test/setup.ts', // tu setup de tests
    css: true,                         // permitir CSS en tests
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'], // <-- CONSERVADO del branch HEAD
  },
});


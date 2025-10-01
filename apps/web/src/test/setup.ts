import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// ¡IMPORTANTE! usar el entrypoint para Vitest:
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

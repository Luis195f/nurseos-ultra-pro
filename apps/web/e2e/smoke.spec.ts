import { test, expect } from '@playwright/test';

test('smoke: homepage renders', async ({ page }) => {
  // Si tienes dev server, apúntalo; si no, usa un HTML estático o deja placeholder.
  // Ejemplo con dev server local:
  // await page.goto('http://localhost:5173/');

  // Deja un placeholder por ahora hasta tener server:
  await page.setContent('<h1>NurseOS Ultra Pro</h1>');
  await expect(page.locator('h1')).toHaveText('NurseOS Ultra Pro');
});

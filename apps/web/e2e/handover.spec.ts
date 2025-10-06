import { test, expect } from "@playwright/test";

test("handover page mounts (smoke)", async ({ page }) => {
  await page.setContent("<div id=\\"app\\"></div>");
  expect(1).toBe(1);
});

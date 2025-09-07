import { test, expect } from '@playwright/test';

test.describe('App smoke', () => {
  test('homepage renders footer links', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Genbook/i);
    const privacy = page.getByRole('link', { name: /Privacy Policy/i });
    await expect(privacy).toBeVisible();
  });
});

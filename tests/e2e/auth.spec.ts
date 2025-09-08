import { test, expect } from '@playwright/test';

const projectRef = 'example';
const storageKey = `sb-${projectRef}-auth-token`;

test.describe('Authenticated flow (mocked)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(({ key }) => {
      const now = Math.floor(Date.now() / 1000);
      const session = {
        currentSession: {
          access_token: 'fake_access',
          refresh_token: 'fake_refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: { name: 'Test User' }
          }
        },
        expiresAt: now + 3600
      };
      window.localStorage.setItem(key, JSON.stringify(session));
    }, { key: storageKey });
  });

  test('loads app with injected session', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Genbook/i);
    const hasSession = await page.evaluate((k) => !!window.localStorage.getItem(k), storageKey);
    expect(hasSession).toBeTruthy();
  });
});

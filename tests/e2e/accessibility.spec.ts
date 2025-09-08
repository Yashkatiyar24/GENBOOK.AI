import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('home has no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const critical = results.violations.filter(v => ['critical', 'serious'].includes(v.impact || ''));
    if (critical.length) {
      console.log('Accessibility violations:', critical.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })));
    }
    expect(critical, 'Serious/Critical a11y violations').toHaveLength(0);
  });
});

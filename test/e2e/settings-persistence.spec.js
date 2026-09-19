import { expect, test } from '@playwright/test';

test('live Admin invoice settings save through the workspace and reload from Supabase', async ({ browser }, testInfo) => {
  test.skip(process.env.CRM_LIVE_REQUIRED !== '1', 'Run npm run test:e2e:live to enable hosted write workflows.');
  test.setTimeout(90_000);

  const admin = { email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD };
  if (!admin.email || !admin.password) throw new Error('Live settings lifecycle requires an Admin identity.');
  const baseUrl = new URL(String(testInfo.project.use.baseURL || 'http://127.0.0.1:4321')).origin;
  const context = await browser.newContext();
  const page = await context.newPage();
  let signedIn = false;
  let originalTaxRate = 0;
  let restoreRequired = false;

  async function saveTaxRate(value) {
    const input = page.locator('#form-invoice [name="tax_rate"]');
    await input.fill(String(value));
    const responsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/rest/v1/crm_settings')
        && ['POST', 'PATCH'].includes(response.request().method());
    }, { timeout: 15_000 });
    await page.locator('#btn-save-invoice').click();
    const response = await responsePromise;
    expect(response.ok(), `Settings persistence request should succeed (HTTP ${response.status()})`).toBeTruthy();
    await expect(page.locator('#status-invoice')).toBeVisible();
    await expect(page.locator('#status-invoice')).toHaveText('✓ Saved');
  }

  try {
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel(/username or email/i).fill(admin.email);
    await page.locator('#password').fill(admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/company(?:\/|$)/, { timeout: 20_000 });
    signedIn = true;
    await page.goto(`${baseUrl}/company/settings`);
    await page.evaluate(() => window.tmCrmReady);
    const initialSettings = await page.evaluate(async () => {
      const result = await window.tmCrm.repository.request('/api/portal/settings/invoice');
      return result.settings || {};
    });
    originalTaxRate = Number(initialSettings.tax_rate) || 0;
    const temporaryTaxRate = originalTaxRate < 99.99
      ? Number((originalTaxRate + 0.01).toFixed(2))
      : 99.99;
    await expect(page.locator('#settings-status')).toBeEmpty();
    const initialInputValue = await page.locator('#form-invoice [name="tax_rate"]').inputValue();
    expect(Number(initialInputValue) || 0).toBe(originalTaxRate);

    restoreRequired = true;
    await saveTaxRate(temporaryTaxRate);
    const savedSettings = await page.evaluate(async () => {
      const result = await window.tmCrm.repository.request('/api/portal/settings/invoice');
      return result.settings || {};
    });
    expect(Number(savedSettings.tax_rate)).toBe(temporaryTaxRate);

    await page.goto(`${baseUrl}/company/settings`);
    await page.evaluate(() => window.tmCrmReady);
    await expect(page.locator('#form-invoice [name="tax_rate"]')).toHaveValue(String(temporaryTaxRate));

    await saveTaxRate(originalTaxRate);
    const restoredSettings = await page.evaluate(async () => {
      const result = await window.tmCrm.repository.request('/api/portal/settings/invoice');
      return result.settings || {};
    });
    expect(Number(restoredSettings.tax_rate) || 0).toBe(originalTaxRate);
    restoreRequired = false;
  } finally {
    if (signedIn && restoreRequired && !page.isClosed()) {
      await page.goto(`${baseUrl}/company/settings`);
      await page.evaluate(() => window.tmCrmReady);
      await saveTaxRate(originalTaxRate);
      const restoredSettings = await page.evaluate(async () => {
        const result = await window.tmCrm.repository.request('/api/portal/settings/invoice');
        return result.settings || {};
      });
      if ((Number(restoredSettings.tax_rate) || 0) !== originalTaxRate) {
        throw new Error('Could not restore the original invoice tax rate after the live settings test.');
      }
    }
    await context.close();
  }
});

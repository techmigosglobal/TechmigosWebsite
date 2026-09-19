import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test('live Admin provisions an Employee, first login forces a password change, and deactivation denies the next login', async ({ browser }, testInfo) => {
  test.skip(process.env.CRM_LIVE_REQUIRED !== '1', 'Run npm run test:e2e:live to enable hosted write workflows.');
  test.setTimeout(120_000);

  const admin = { email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD };
  if (!admin.email || !admin.password) throw new Error('Live user lifecycle requires an Admin identity.');
  const baseUrl = new URL(String(testInfo.project.use.baseURL || 'http://127.0.0.1:4321')).origin;
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toLowerCase();
  const employeeEmail = `codex-ui-${suffix}@example.com`;
  const employeeName = `Codex UI Employee ${suffix}`;
  const newPassword = `Tm-Ui-${randomUUID().slice(0, 12)}aA1!`;
  const adminContext = await browser.newContext();
  const employeeContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const employeePage = await employeeContext.newPage();
  let adminSignedIn = false;

  try {
    await adminPage.goto(`${baseUrl}/login`);
    await adminPage.getByLabel(/username or email/i).fill(admin.email);
    await adminPage.locator('#password').fill(admin.password);
    await adminPage.getByRole('button', { name: /sign in/i }).click();
    await expect(adminPage).toHaveURL(/\/company(?:\/|$)/, { timeout: 20_000 });
    adminSignedIn = true;
    await adminPage.goto(`${baseUrl}/company/users`);
    await adminPage.evaluate(() => window.tmCrmReady);
    await expect(adminPage.locator('[data-create="profiles"]')).toBeVisible();
    await adminPage.locator('[data-create="profiles"]').click();
    const createForm = adminPage.locator('#crm-edit-form');
    await createForm.locator('[name="name"]').fill(employeeName);
    await createForm.locator('[name="email"]').fill(employeeEmail);
    await createForm.locator('[name="role"]').selectOption('company_member');
    await createForm.locator('button[type="submit"]').click();

    const temporaryPassword = adminPage.locator('#generated-login-password');
    await expect(temporaryPassword).toBeVisible({ timeout: 20_000 });
    const initialPassword = await temporaryPassword.innerText();
    expect(initialPassword.length).toBeGreaterThanOrEqual(8);
    await adminPage.locator('#close-generated-login').click();

    const createdProfile = await adminPage.evaluate(async (email) => {
      const response = await window.tmCrm.repository.request('/api/portal/profiles');
      return (response.items || []).find((profile) => profile.email === email) || null;
    }, employeeEmail);
    expect(createdProfile, 'the User Management form should create a live Employee profile').toBeTruthy();
    expect(createdProfile.role).toBe('company_member');
    expect(createdProfile.status).toBe('active');
    expect(createdProfile.must_change_password).toBe(true);

    await employeePage.goto(`${baseUrl}/login`);
    await employeePage.getByLabel(/username or email/i).fill(employeeEmail);
    await employeePage.locator('#password').fill(initialPassword);
    await employeePage.getByRole('button', { name: /sign in/i }).click();
    await expect(employeePage).toHaveURL(/\/change-password(?:\/|$)/, { timeout: 20_000 });
    await employeePage.getByLabel(/new password/i).fill(newPassword);
    await employeePage.getByLabel(/confirm password/i).fill(newPassword);
    await employeePage.getByRole('button', { name: /save password/i }).click();
    await expect(employeePage).toHaveURL(/\/company(?:\/|$)/, { timeout: 20_000 });
    await expect(employeePage.locator('[data-nav-key="projects"]')).toBeVisible();
    await expect(employeePage.locator('[data-nav-key="finance"]')).toBeHidden();
    await expect(employeePage.locator('[data-nav-key="users"]')).toBeHidden();

    const employeeRow = adminPage.locator(`tr[data-resource="profiles"][data-row-id="${createdProfile.id}"]`);
    await expect(employeeRow).toBeVisible();
    await employeeRow.locator('[data-edit-resource="profiles"]').click();
    const editForm = adminPage.locator('#crm-edit-form');
    await editForm.locator('[name="status"]').selectOption('inactive');
    const updateResponse = adminPage.waitForResponse((response) => response.url().includes('/functions/v1/admin-users')
      && response.request().method() === 'POST', { timeout: 15_000 });
    await editForm.locator('button[type="submit"]').click();
    const response = await updateResponse;
    expect(response.ok(), `Admin user deactivation should succeed (HTTP ${response.status()})`).toBeTruthy();

    const deactivatedProfile = await adminPage.evaluate(async (email) => {
      const result = await window.tmCrm.repository.request('/api/portal/profiles');
      return (result.items || []).find((profile) => profile.email === email) || null;
    }, employeeEmail);
    expect(deactivatedProfile?.status).toBe('inactive');

    await employeePage.evaluate(() => window.tmSupabase.auth.signOut());
    await employeePage.goto(`${baseUrl}/login`);
    await employeePage.getByLabel(/username or email/i).fill(employeeEmail);
    await employeePage.locator('#password').fill(newPassword);
    await employeePage.getByRole('button', { name: /sign in/i }).click();
    await expect(employeePage.getByRole('alert')).toContainText(/user is banned|account is not active yet/i, { timeout: 15_000 });
    await expect(employeePage).toHaveURL(/\/login(?:\/|$)/);
  } finally {
    if (adminSignedIn && !adminPage.isClosed()) {
      await adminPage.evaluate(async (email) => {
        await window.tmCrmReady;
        const result = await window.tmCrm.repository.request('/api/portal/profiles');
        const profile = (result.items || []).find((item) => item.email === email);
        if (profile && profile.status !== 'inactive') {
          await window.tmCrm.repository.request(`/api/portal/profiles/${encodeURIComponent(profile.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'inactive' }),
          });
        }
      }, employeeEmail);
    }
    await Promise.all([adminContext.close(), employeeContext.close()]);
  }
});

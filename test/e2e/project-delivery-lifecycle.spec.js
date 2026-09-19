import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// This mutating hosted acceptance test uses disposable identities and cleans
// the exact project through the repository's admin-only deletion workflow.
test.use({ trace: 'off', screenshot: 'off' });

async function signIn(page, baseUrl, identity, destination) {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel(/username or email/i).fill(identity.email);
  await page.locator('#password').fill(identity.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
}

test('live project delivery links Admin, assigned Employee, private files, and Client status', async ({ browser }, testInfo) => {
  test.skip(process.env.CRM_LIVE_REQUIRED !== '1', 'Run npm run test:e2e:live to enable hosted write workflows.');
  test.setTimeout(120_000);

  const admin = { email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD };
  const employee = { email: process.env.CRM_EMPLOYEE_EMAIL, password: process.env.CRM_EMPLOYEE_PASSWORD };
  const client = { email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD };
  const clientId = Number(process.env.CRM_LIVE_CLIENT_ID);
  if (![admin, employee, client].every((identity) => identity.email && identity.password)
    || !Number.isSafeInteger(clientId) || clientId < 1) {
    throw new Error('Live project delivery requires Admin, Employee, and Client identities plus CRM_LIVE_CLIENT_ID.');
  }

  const baseUrl = new URL(String(testInfo.project.use.baseURL || 'http://127.0.0.1:4321')).origin;
  const adminContext = await browser.newContext();
  const employeeContext = await browser.newContext();
  const clientContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const employeePage = await employeeContext.newPage();
  const clientPage = await clientContext.newPage();
  const projectName = `Codex project delivery ${randomUUID()}`;
  const adminProbeName = `codex-admin-drive-probe-${randomUUID()}.pdf`;
  const fileName = `codex-delivery-${randomUUID()}.pdf`;
  let projectId = null;
  let adminSignedIn = false;

  try {
    await signIn(adminPage, baseUrl, admin, '/company');
    adminSignedIn = true;
    await adminPage.goto(`${baseUrl}/company/projects`);
    await adminPage.evaluate(() => window.tmCrmReady);
    await adminPage.locator('[data-create="projects"]').click();

    const projectForm = adminPage.locator('#crm-edit-form');
    await expect(projectForm).toBeVisible();
    await projectForm.locator('[name="name"]').fill(projectName);
    await projectForm.locator('[name="client_id"]').selectOption(String(clientId));
    await projectForm.locator('[name="status"]').selectOption('active');
    await projectForm.locator('[name="progress"]').fill('47');
    const employeeAssignment = projectForm.locator('label.project-team-option')
      .filter({ hasText: 'Codex Live Employee' })
      .locator('input[name="project_member_id"]');
    await employeeAssignment.check();
    await projectForm.locator('button[type="submit"]').click();

    const projectRow = adminPage.locator('[data-resource="projects"]').filter({ hasText: projectName });
    await expect(projectRow).toBeVisible({ timeout: 20_000 });
    projectId = Number(await projectRow.getAttribute('data-row-id'));
    expect(Number.isSafeInteger(projectId) && projectId > 0, 'the saved project should have a valid id').toBeTruthy();
    await expect(projectRow).toContainText('Codex Live Verification');
    await expect(projectRow).toContainText('Codex Live Employee');

    const adminStorageResponsePromise = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST'
        && url.pathname.includes('/storage/v1/object/project-files/');
    });
    const adminProbe = await adminPage.evaluate(async ({ id, name }) => {
      const file = new File(['%PDF-1.4\\n% Admin Storage policy probe\\n%%EOF\\n'], name, { type: 'application/pdf' });
      try {
        const saved = await window.tmCrm.repository.uploadProjectFile(id, null, file);
        return { ok: true, id: saved.id };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }, { id: projectId, name: adminProbeName });
    const adminStorageResponse = await adminStorageResponsePromise;
    const adminStorageRequest = adminStorageResponse.request();
    const adminStorageHeaders = await adminStorageRequest.allHeaders();
    const adminStorageBody = adminStorageRequest.postDataBuffer()?.toString('latin1') || '';
    const multipartMimeParts = [...adminStorageBody.matchAll(/Content-Type:\s*([^\r\n]+)/gi)].map((match) => match[1].trim());
    expect(
      adminProbe.ok,
      `Admin project-file Storage probe failed: HTTP ${adminStorageResponse.status()} ${new URL(adminStorageResponse.url()).pathname}; `
        + `requestContentType=${adminStorageHeaders['content-type'] || 'none'}, bodyBytes=${adminStorageBody.length}, `
        + `filePartMimes=${JSON.stringify(multipartMimeParts)}, multipartHasFileName=${adminStorageBody.includes(adminProbeName)}; `
        + `${adminProbe.error || 'unknown error'}`,
    ).toBeTruthy();

    await signIn(employeePage, baseUrl, employee, '/company');
    await employeePage.goto(`${baseUrl}/company/projects`);
    await employeePage.evaluate(() => window.tmCrmReady);
    await expect(employeePage.locator(`[data-resource="projects"][data-row-id="${projectId}"]`)).toContainText(projectName);

    await employeePage.goto(`${baseUrl}/company/files?project=${encodeURIComponent(projectId)}`);
    await employeePage.evaluate(() => window.tmCrmReady);
    const fileInput = employeePage.locator(`[data-project-file-upload="${projectId}"]`).last();
    const storageUpload = employeePage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST'
        && url.pathname.includes('/storage/v1/object/project-files/');
    });
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% Codex live project-delivery fixture\n%%EOF\n'),
    });
    const uploadResponse = await storageUpload;
    const uploadResponseText = await uploadResponse.text();
    expect(
      uploadResponse.ok(),
      `the assigned employee should upload to private project storage (HTTP ${uploadResponse.status()}, ${new URL(uploadResponse.url()).pathname}: ${uploadResponseText})`,
    ).toBeTruthy();
    await expect(employeePage.locator('.files-reference-file-card').filter({ hasText: fileName })).toBeVisible({ timeout: 20_000 });

    await adminPage.goto(`${baseUrl}/company/files?project=${encodeURIComponent(projectId)}`);
    await adminPage.evaluate(() => window.tmCrmReady);
    await expect(adminPage.locator('.files-reference-file-card').filter({ hasText: adminProbeName })).toBeVisible({ timeout: 20_000 });
    await expect(adminPage.locator('.files-reference-file-card').filter({ hasText: fileName })).toBeVisible({ timeout: 20_000 });

    await signIn(clientPage, baseUrl, client, '/client');
    await expect(clientPage.locator('#projects-list article').filter({ hasText: projectName })).toContainText('active');
    await expect(clientPage.locator('#projects-list article').filter({ hasText: projectName })).toContainText('Progress: 47%');
    await expect(clientPage.locator('#projects-list')).not.toContainText(fileName);
  } finally {
    try {
      if (!adminSignedIn) await signIn(adminPage, baseUrl, admin, '/company');
      if (!projectId && adminSignedIn) {
        projectId = await adminPage.evaluate(async (name) => {
          await window.tmCrmReady;
          const { data, error } = await window.tmSupabase
            .from('crm_projects')
            .select('id')
            .eq('name', name)
            .limit(2);
          if (error) throw new Error(error.message);
          if ((data || []).length > 1) throw new Error('Multiple live projects matched the unique test name; refusing cleanup.');
          return data?.[0]?.id ? Number(data[0].id) : null;
        }, projectName);
      }
      if (projectId) {
        await adminPage.evaluate(async (id) => {
          await window.tmCrmReady;
          await window.tmCrm.repository.deleteProject(id);
          const { data, error } = await window.tmSupabase
            .from('crm_projects')
            .select('id')
            .eq('id', id)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (data) throw new Error('The test project still exists after cleanup.');
        }, projectId);
      }
    } finally {
      await Promise.all([adminContext.close(), employeeContext.close(), clientContext.close()]);
    }
  }
});

import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { seedEmulators } from '../../scripts/firebase/emulator-fixture.mjs';

const accounts = [
  ['vinay@techmigos.com', 'LocalAdmin@12345', 'Vinay'],
  ['vishal@techmigos.com', 'LocalAdmin@67890', 'Vishal'],
];
const storeKey = 'techmigos-finance-standalone-v4';
const readState = async page => {await page.waitForFunction(()=>document.querySelector('#mainContent')&&!ui.cloudBusy&&!ui.saving);return page.evaluate(()=>structuredClone(state));};
const idle = page => page.waitForFunction(()=>!ui.cloudBusy&&!ui.saving);
const nav = async (page, name) => {await idle(page);await page.locator(`.sidebar [data-page="${name}"]`).click();await idle(page);};
const act = async (page, name) => {await idle(page);await page.locator(`[data-act="${name}"]`).first().click();await idle(page);};
const field = (page, name) => page.locator(`#modalHost [name="${name}"]`);
const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  await seedEmulators();
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]));

async function login(page, account = accounts[0]) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(account[0]);
  await page.getByLabel('Password', { exact: true }).fill(account[1]);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/finance\/?$/);
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
}

async function addTransaction(page, type, description, amount, options = {}) {
  await act(page, 'add-tx');
  if (type !== 'income') await page.locator(`[data-act="switch-tx-type"][data-type="${type}"]`).click();
  await field(page, 'description').fill(description);
  await field(page, 'amount').fill(String(amount));
  if (options.project) await field(page, 'projectId').selectOption(options.project);
  if (options.team) await field(page, 'teamId').selectOption(options.team);
  if (options.status) await field(page, 'status').selectOption(options.status);
  if (options.proof) await page.locator('#tx-file').setInputFiles(options.proof);
  await page.getByRole('button', { name: 'Save transaction', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('website Login is visible on desktop and mobile; direct finance visit redirects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#navbar').getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#navbar').getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await page.goto('/finance');
  await expect(page).toHaveURL(/\/login\/?$/);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.locator('#login-error')).toHaveText('Enter a valid email address.');
  await expect(page.locator('#email')).toBeFocused();
  await page.getByLabel('Email address').fill('vinay@techmigos.com');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.locator('#login-error')).toHaveText('Enter your password.');
  await page.getByLabel('Password', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.locator('#login-error')).toContainText('Email or password is incorrect');
  await expect(page.locator('#password')).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

for (const account of accounts) {
  test(`${account[2]} opens the original document, survives reload and logs out`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page, account);
    await expect(page.locator('.finance-user:not(#cloudStatus)')).toHaveText(account[2]);
    expect(await page.locator('iframe').count()).toBe(0);
    const seed = await readState(page);
    expect(seed.projects.map(project => project.name).sort()).toEqual(['Example Alpha', 'Example Beta']);
    for (const section of ['transactions', 'projects', 'invoices', 'reports', 'settings']) {
      await nav(page, section);
      await expect(page.locator('#mainContent')).not.toBeEmpty();
    }
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
    await page.goto('/finance');
    await expect(page).toHaveURL(/\/login\/?$/);
    expect(errors).toEqual([]);
  });
}

test('transactions create/edit/delete, filter/search, proofs, CSV, backup/restore and persistence', async ({ page }) => {
  await login(page);
  await nav(page, 'transactions');
  const png = { name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5H8AAAAASUVORK5CYII=', 'base64') };
  await addTransaction(page, 'income', 'QA client receipt', 1234.5, { project: 'p-arish', proof: png });
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('QA client receipt');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  await page.locator('.data-table tbody tr').click();
  await expect(page.locator('#proofArea img')).toBeVisible();
  await nav(page, 'dashboard');
  await nav(page, 'transactions');
  await expect(page.locator('#proofArea img')).toBeVisible();
  await act(page, 'edit-tx');
  await field(page, 'amount').fill('1500');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  let state = await readState(page);
  expect(state.transactions.find(tx => tx.description === 'QA client receipt').amount).toBe(1500);
  await page.locator('[data-filter="tx-type"]').selectOption('expense');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(0);
  await act(page, 'clear-tx-filters');
  const csvPromise = page.waitForEvent('download');
  await act(page, 'csv');
  const csv = await csvPromise;
  expect(await fs.readFile(await csv.path(), 'utf8')).toContain('QA client receipt');
  const backupPromise = page.waitForEvent('download');
  await act(page, 'backup');
  const backup = await backupPromise;
  const backupPath = await backup.path();
  const payload = JSON.parse(await fs.readFile(backupPath, 'utf8'));
  expect(payload.proofs).toHaveLength(1);
  expect(payload.proofs[0].dataUrl).toMatch(/^data:image\/png;base64,/);
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('QA client receipt');
  await page.locator('.data-table tbody tr').click();
  page.once('dialog', dialog => dialog.accept());
  await act(page, 'delete-tx');
  await expect(page.locator('#toastHost')).toContainText('Transaction removed.');
  await expect.poll(async () => (await readState(page)).transactions.some(tx => tx.description === 'QA client receipt')).toBe(false);
  await nav(page, 'settings');
  await page.locator('#restoreInput').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#toastHost')).toContainText('Invalid backup file');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restoreInput').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: await fs.readFile(backupPath) });
  await expect(page.locator('#toastHost')).toContainText('Backup restored successfully');
  await page.reload();
  state = await readState(page);
  expect(state.transactions.find(tx => tx.description === 'QA client receipt').amount).toBe(1500);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await login(page, accounts[1]);
  expect((await readState(page)).transactions.some(tx => tx.description === 'QA client receipt')).toBe(true);
});

test('project CRUD, team shares, expense and salary calculations', async ({ page }) => {
  await login(page);
  await nav(page, 'projects');
  await act(page, 'add-project');
  await field(page, 'name').fill('QA project');
  await field(page, 'client').fill('QA client');
  await page.getByRole('button', { name: 'Save Project', exact: true }).click();
  const project = (await readState(page)).projects.find(item => item.name === 'QA project');
  await page.locator(`[data-act="edit-project"][data-id="${project.id}"]`).click();
  await field(page, 'name').fill('QA project edited');
  await page.getByRole('button', { name: 'Save Project', exact: true }).click();
  await page.locator(`[data-act="edit-shares"][data-id="${project.id}"]`).click();
  await field(page, 'share_team-1').fill('60');
  await field(page, 'share_team-2').fill('50');
  await page.locator('[data-form="shareForm"]').click();
  await expect(page.locator('#toastHost')).toContainText('at most 100%');
  await field(page, 'share_team-1').fill('30');
  await field(page, 'share_team-2').fill('20');
  await page.locator('[data-form="shareForm"]').click();
  await addTransaction(page, 'income', 'QA project income', 10000, { project: project.id });
  await addTransaction(page, 'expense', 'QA project expense', 1000, { project: project.id });
  await addTransaction(page, 'salary', 'QA team payment', 500, { project: project.id, team: 'team-1' });
  const metrics = await page.evaluate(id => projectMetrics(id), project.id);
  expect(metrics.received).toBe(10000);
  expect(metrics.expenseAll).toBe(1000);
  expect(metrics.companyShare).toBe(5000);
  expect(metrics.companyEstimatedNet).toBe(4000);
  expect(metrics.shares.find(team => team.teamId === 'team-1').remaining).toBe(2500);
  await page.locator(`[data-act="project-detail"][data-id="${project.id}"]`).click();
  for (const tab of ['overview', 'transactions', 'payouts', 'invoices', 'proofs']) {
    await page.locator(`.tabbar [data-act="project-tab"][data-tab="${tab}"]`).click();
    await expect(page.locator('#mainContent')).not.toBeEmpty();
  }
  await nav(page, 'settings');
  await act(page, 'add-team');
  await field(page, 'name').fill('QA team');
  await page.locator('[data-form="teamForm"]').click();
  const team = (await readState(page)).teams.find(item => item.name === 'QA team');
  page.once('dialog', dialog => dialog.accept());
  await page.locator(`[data-act="delete-team"][data-id="${team.id}"]`).click();
  expect((await readState(page)).teams.some(item => item.id === team.id)).toBe(false);
  await page.locator('#businessName').fill('Techmigos QA');
  await page.getByRole('button', { name: 'Save business details' }).click();
  await readState(page);
  await page.reload();
  await expect.poll(async () => (await readState(page)).settings.businessName).toBe('Techmigos QA');
});

test('monthly plan editing, proof removal, unused project deletion and confirmed reset', async ({ page }) => {
  await login(page);
  await nav(page, 'projects');
  await act(page, 'add-project');
  await field(page, 'name').fill('Disposable project');
  await page.locator('[data-form="projectForm"]').click();
  const project = (await readState(page)).projects.find(item => item.name === 'Disposable project');
  await page.locator(`[data-act="edit-project"][data-id="${project.id}"]`).click();
  page.once('dialog', dialog => dialog.accept());
  await act(page, 'delete-project');
  expect((await readState(page)).projects.some(item => item.id === project.id)).toBe(false);

  await nav(page, 'invoices');
  await act(page, 'add-plan');
  await field(page, 'projectId').selectOption('p-arish');
  await field(page, 'title').fill('QA billing plan');
  await field(page, 'amount').fill('1000');
  await page.locator('[data-form="planForm"]').click();
  await act(page, 'edit-plan');
  await field(page, 'amount').fill('1200');
  await page.locator('[data-form="planForm"]').click();
  expect((await readState(page)).recurringTemplates[0].amount).toBe(1200);
  await act(page, 'edit-plan');
  page.once('dialog', dialog => dialog.accept());
  await act(page, 'delete-plan');
  expect((await readState(page)).recurringTemplates).toHaveLength(0);

  await nav(page, 'transactions');
  const pdfBytes = await page.evaluate(async () => Array.from(new Uint8Array(await (await buildInvoicePdf(state.invoices[0])).arrayBuffer())));
  const pdf = { name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdfBytes) };
  await addTransaction(page, 'expense', 'QA proof removal', 100, { proof: pdf });
  await page.getByRole('textbox', { name: 'Search transactions' }).fill('QA proof removal');
  await page.locator('.data-table tbody tr').click();
  await expect(page.locator('#proofArea iframe')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await act(page, 'remove-proof');
  await expect(page.locator('#proofArea')).toContainText('No receipt or proof attached');
  expect((await readState(page)).transactions.find(item => item.description === 'QA proof removal').proofIds).toHaveLength(0);

  await nav(page, 'settings');
  page.once('dialog', dialog => dialog.dismiss());
  await act(page, 'reset-data');
  expect((await readState(page)).transactions.some(item => item.description === 'QA proof removal')).toBe(true);
  const accept = dialog => dialog.accept();
  page.on('dialog', accept);
  await act(page, 'reset-data');
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible();
  page.off('dialog', accept);
  expect((await readState(page)).transactions).toHaveLength(18);
});

test('invoice CRUD, PDF, receipts and idempotent monthly billing', async ({ page }) => {
  await login(page);
  await nav(page, 'invoices');
  await act(page, 'add-invoice');
  await field(page, 'projectId').selectOption('p-focus');
  await field(page, 'description').fill('QA maintenance invoice');
  await field(page, 'amount').fill('2000');
  await page.locator('#invoiceRecurring').check();
  await page.locator('[data-form="invoiceForm"]').click();
  let state = await readState(page);
  const invoice = state.invoices.find(item => item.description === 'QA maintenance invoice');
  expect(invoice).toBeTruthy();
  expect(state.recurringTemplates).toHaveLength(1);
  const before = await page.evaluate(() => globalMetrics().income);
  await page.locator('[data-filter="invoice-search"]').fill('QA maintenance invoice');
  await expect(page.locator('.data-table tbody tr')).toHaveCount(1);
  const pdfPromise = page.waitForEvent('download');
  await page.locator(`[data-act="pdf-invoice"][data-id="${invoice.id}"]`).click();
  const pdf = await pdfPromise;
  expect((await fs.readFile(await pdf.path(), 'utf8')).startsWith('%PDF-1.4')).toBe(true);
  await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();
  await act(page, 'receipt-invoice');
  await page.getByRole('button', { name: 'Save transaction', exact: true }).click();
  expect(await page.evaluate(() => globalMetrics().income)).toBe(before + 2000);
  await act(page, 'generate-recurring');
  const count = (await readState(page)).invoices.length;
  await act(page, 'generate-recurring');
  expect((await readState(page)).invoices).toHaveLength(count);
  await act(page, 'toggle-plan');
  expect((await readState(page)).recurringTemplates[0].enabled).toBe(false);
  await act(page, 'toggle-plan');
  expect((await readState(page)).recurringTemplates[0].enabled).toBe(true);
  await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();
  await act(page, 'edit-invoice');
  await field(page, 'description').fill('QA maintenance revised');
  await page.locator('[data-form="invoiceForm"]').click();
  await act(page, 'clear-invoice-filters');
  await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();
  page.once('dialog', dialog => dialog.accept());
  await act(page, 'delete-invoice');
  state = await readState(page);
  expect(state.invoices.some(item => item.id === invoice.id)).toBe(false);
  expect(state.transactions.some(item => item.linkedInvoiceId === invoice.id)).toBe(true);
});

test('mobile login and finance navigation remain usable with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  for (const section of ['transactions', 'projects', 'invoices', 'reports', 'settings', 'dashboard']) {
    await page.locator(`.mobile-nav [data-page="${section}"]`).click();
    await expect(page.locator('#mainContent')).not.toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
  await page.screenshot({ path: 'reports/finance-mobile.png', fullPage: true });
});

import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { loadLocalEnv } from '../../scripts/local-env.mjs';

// This mutating hosted workflow uses only namespaced disposable identities and
// removes its exact invoice, finance ledger entry, and private proof object.
test.use({ trace: 'off', screenshot: 'off' });

async function signIn(page, baseUrl, identity, destination) {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel(/username or email/i).fill(identity.email);
  await page.locator('#password').fill(identity.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
}

async function supabaseRequest(supabaseUrl, apiKey, accessToken, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(method === 'DELETE' ? { Prefer: 'return=minimal' } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Scoped live invoice cleanup failed (${response.status}): ${text.slice(0, 500)}`);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function cleanupInvoiceFixture({ supabaseUrl, apiKey, accessToken, clientId, invoiceNumber }) {
  if (!accessToken) return;
  const invoiceQuery = new URLSearchParams({
    select: 'id,invoice_number,client_id',
    invoice_number: `eq.${invoiceNumber}`,
    client_id: `eq.${clientId}`,
    limit: '2',
  });
  const invoices = await supabaseRequest(supabaseUrl, apiKey, accessToken, `/rest/v1/crm_invoices?${invoiceQuery}`) || [];
  if (invoices.length > 1 || invoices.some((row) => row.invoice_number !== invoiceNumber || Number(row.client_id) !== clientId)) {
    throw new Error('Multiple or mismatched invoices matched the unique test key; refusing cleanup.');
  }
  const invoiceId = Number(invoices[0]?.id) || null;
  let finances = [];
  if (invoiceId) {
    const financeQuery = new URLSearchParams({
      select: 'id,invoice_id,transaction_type,reference_id,proof_url',
      invoice_id: `eq.${invoiceId}`,
      transaction_type: 'eq.invoice',
      limit: '2',
    });
    finances = await supabaseRequest(supabaseUrl, apiKey, accessToken, `/rest/v1/crm_finances?${financeQuery}`) || [];
    if (finances.length > 1 || finances.some((row) => Number(row.invoice_id) !== invoiceId || row.transaction_type !== 'invoice')) {
      throw new Error('Multiple or mismatched finance rows matched the test invoice; refusing cleanup.');
    }
  }
  for (const finance of finances) {
    if (finance.proof_url) {
      await supabaseRequest(supabaseUrl, apiKey, accessToken, '/storage/v1/object/finance-proofs', {
        method: 'DELETE', body: { prefixes: [finance.proof_url] },
      });
    }
    await supabaseRequest(supabaseUrl, apiKey, accessToken, `/rest/v1/crm_finances?id=eq.${finance.id}`, { method: 'DELETE' });
  }
  if (invoiceId) await supabaseRequest(supabaseUrl, apiKey, accessToken, `/rest/v1/crm_invoices?id=eq.${invoiceId}`, { method: 'DELETE' });
  const remaining = await supabaseRequest(supabaseUrl, apiKey, accessToken, `/rest/v1/crm_invoices?${invoiceQuery}`) || [];
  if (remaining.length) throw new Error('The unique test invoice still exists after cleanup.');
}

test('live Admin invoice, payment proof, Client preview, and Finance report stay aligned', async ({ browser }, testInfo) => {
  test.skip(process.env.CRM_LIVE_REQUIRED !== '1', 'Run npm run test:e2e:live to enable hosted write workflows.');
  test.setTimeout(120_000);

  const admin = { email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD };
  const client = { email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD };
  const clientId = Number(process.env.CRM_LIVE_CLIENT_ID);
  if (![admin, client].every((identity) => identity.email && identity.password)
    || !Number.isSafeInteger(clientId) || clientId < 1) {
    throw new Error('Live invoice lifecycle requires Admin and linked Client identities plus CRM_LIVE_CLIENT_ID.');
  }

  const baseUrl = new URL(String(testInfo.project.use.baseURL || 'http://127.0.0.1:4321')).origin;
  const localEnv = loadLocalEnv();
  const supabaseUrl = String(localEnv.PUBLIC_SUPABASE_URL || localEnv.SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = localEnv.PUBLIC_SUPABASE_KEY || localEnv.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !apiKey) throw new Error('Live invoice lifecycle requires Supabase URL and publishable key environment variables.');
  const adminContext = await browser.newContext();
  const clientContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const clientPage = await clientContext.newPage();
  const invoiceNumber = `CODEX-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const serviceName = `Codex finance lifecycle ${randomUUID()}`;
  const proofName = `codex-payment-proof-${randomUUID()}.pdf`;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  let invoiceId = null;
  let financeId = null;
  let proofPath = '';
  let adminSignedIn = false;
  let adminAccessToken = '';

  try {
    await signIn(adminPage, baseUrl, admin, '/company');
    adminSignedIn = true;
    await adminPage.evaluate(() => window.tmCrmReady);
    adminAccessToken = await adminPage.evaluate(async () => (await window.tmSupabase.auth.getSession()).data.session?.access_token || '');
    expect(adminAccessToken, 'the Admin test session should expose a cleanup-scoped access token').toBeTruthy();
    await adminPage.goto(`${baseUrl}/company/finance`);
    await adminPage.evaluate(() => window.tmCrmReady);
    await expect(adminPage.locator('#crm-status')).toBeEmpty({ timeout: 20_000 });
    await adminPage.locator('[data-acc-tab="invoices"]').click();
    await adminPage.getByRole('button', { name: /new invoice/i }).click();
    await expect(adminPage.locator('#inv-builder-form')).toBeVisible();

    await adminPage.locator('#inv-client-select').selectOption(String(clientId));
    await adminPage.locator('#inv-number').fill(invoiceNumber);
    await adminPage.locator('#inv-date').fill(invoiceDate);
    await adminPage.locator('#inv-due-date').fill(invoiceDate);
    await adminPage.locator('#inv-status').selectOption('paid');
    await adminPage.locator('#inv-currency').selectOption('INR');
    await adminPage.locator('#inv-tax-rate').fill('0');
    await adminPage.locator('#inv-items-tbody .inv-item-desc').first().fill(serviceName);
    await adminPage.locator('#inv-items-tbody .inv-item-qty').first().fill('1');
    await adminPage.locator('#inv-items-tbody .inv-item-rate').first().fill('2500');
    await adminPage.locator('#inv-payment').fill('Test-only payment reference; no real payment requested.');
    const invoiceSaveResponsePromise = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST' && url.pathname.endsWith('/rest/v1/rpc/save_invoice_with_items');
    }, { timeout: 15_000 });
    await adminPage.locator('#inv-save-invoice').click();
    const invoiceSaveResponse = await invoiceSaveResponsePromise;
    const invoiceSaveResponseText = await invoiceSaveResponse.text();
    expect(invoiceSaveResponse.ok(), `invoice save RPC failed (HTTP ${invoiceSaveResponse.status()}): ${invoiceSaveResponseText}`).toBeTruthy();

    const invoiceRow = adminPage.locator('.acc-tbl-row').filter({ hasText: invoiceNumber });
    await expect(invoiceRow).toBeVisible({ timeout: 20_000 });
    const invoice = await adminPage.evaluate(async (number) => {
      const result = await window.tmCrm.repository.request('/api/portal/invoices');
      return (result.items || []).find((invoice) => invoice.invoice_number === number) || null;
    }, invoiceNumber);
    expect(invoice, 'the saved invoice should be available through the Admin repository').toBeTruthy();
    invoiceId = Number(invoice.id);
    expect(Number.isSafeInteger(invoiceId) && invoiceId > 0).toBeTruthy();
    expect(Number(invoice.total_amount)).toBe(2500);
    expect(Number(invoice.received_amount)).toBe(2500);
    expect(invoice.status).toBe('paid');

    const ledger = await adminPage.evaluate(async (id) => {
      const result = await window.tmCrm.repository.request('/api/portal/finances');
      return (result.items || []).find((row) => String(row.invoice_id) === String(id) && row.transaction_type === 'invoice') || null;
    }, invoiceId);
    expect(ledger, 'the invoice trigger should create its linked finance ledger row').toBeTruthy();
    financeId = Number(ledger.id);
    expect(ledger.status).toBe('received');
    expect(Number(ledger.amount)).toBe(2500);

    const proofInput = adminPage.locator(`[data-proof-upload="${financeId}"]`).first();
    await expect(proofInput).toBeAttached();
    const proofUploadResponse = adminPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST' && url.pathname.includes('/storage/v1/object/finance-proofs/');
    });
    await proofInput.setInputFiles({
      name: proofName,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% Codex test payment proof\n%%EOF\n'),
    });
    const proofResponse = await proofUploadResponse;
    expect(proofResponse.ok(), `private finance proof upload should succeed (HTTP ${proofResponse.status()})`).toBeTruthy();

    const proofPreviewButton = invoiceRow.locator('button[data-proof-open]');
    await expect(proofPreviewButton).toBeVisible({ timeout: 20_000 });
    await proofPreviewButton.click();
    await expect(adminPage.locator('#proof-preview-modal')).toBeVisible();
    const financeWithProof = await adminPage.evaluate(async (id) => {
      const result = await window.tmCrm.repository.request('/api/portal/finances');
      return (result.items || []).find((row) => String(row.id) === String(id) && row.proof_url) || null;
    }, financeId);
    expect(financeWithProof, 'the invoice ledger entry should persist its payment proof').toBeTruthy();
    proofPath = String(financeWithProof.proof_url || '');
    expect(proofPath).toContain('records/');

    const paidValue = await invoiceRow.locator('td').nth(5).innerText();
    const balanceValue = await invoiceRow.locator('td').nth(6).innerText();
    expect(Number(paidValue.replace(/[^0-9.-]/g, ''))).toBe(2500);
    expect(Number(balanceValue.replace(/[^0-9.-]/g, ''))).toBe(0);
    await expect(invoiceRow).toContainText(/paid/i);

    await signIn(clientPage, baseUrl, client, '/client');
    const clientInvoice = clientPage.locator('#invoices-list article').filter({ hasText: invoiceNumber });
    await expect(clientInvoice).toContainText(/paid/i);
    await clientInvoice.getByRole('button', { name: /preview/i }).click();
    await expect(clientPage.locator('#invoice-modal')).toBeVisible();
    await expect(clientPage.locator('#invoice-preview')).toContainText(invoiceNumber);
    await expect(clientPage.locator('#invoice-preview')).toContainText(serviceName);
    await expect(clientPage.locator('#invoice-preview')).toContainText('Grand Total');
    await expect(clientPage.locator('#invoice-preview')).not.toContainText(proofName);

    await adminPage.goto(`${baseUrl}/company/reports`);
    await adminPage.evaluate(() => window.tmCrmReady);
    await adminPage.locator('#report-type').selectOption('finance');
    await adminPage.locator('#report-from').fill(invoiceDate);
    await adminPage.locator('#report-to').fill(invoiceDate);
    await adminPage.locator('[data-report-refresh]').click();
    const reportRow = adminPage.locator('#report-preview table tbody tr').filter({ hasText: invoiceNumber });
    await expect(reportRow).toBeVisible();
    await expect(reportRow).toContainText('paid');
    const invoiceTotalMetric = adminPage.locator('.reports-chart-list .reports-chart-row').filter({ hasText: 'Invoice Total' });
    await expect(invoiceTotalMetric).toContainText('2,500');
    const outstandingMetric = adminPage.locator('.reports-chart-list .reports-chart-row').filter({ hasText: 'Outstanding' });
    await expect(outstandingMetric).toContainText('0');

    const downloadPromise = adminPage.waitForEvent('download');
    await adminPage.locator('[data-report-export]').first().click();
    const csvDownload = await downloadPromise;
    expect(csvDownload.suggestedFilename()).toContain('finance-report');
    const csvStream = await csvDownload.createReadStream();
    const csvChunks = [];
    for await (const chunk of csvStream) csvChunks.push(chunk);
    const csv = Buffer.concat(csvChunks).toString('utf8');
    expect(csv).toContain(invoiceNumber);
    expect(csv).toContain('2,500');
  } finally {
    try {
      if (!adminAccessToken && adminPage.context().pages().length && !adminPage.isClosed()) {
        if (!adminSignedIn) await signIn(adminPage, baseUrl, admin, '/company');
        adminAccessToken = await adminPage.evaluate(async () => (await window.tmSupabase.auth.getSession()).data.session?.access_token || '');
      }
      await cleanupInvoiceFixture({ supabaseUrl, apiKey, accessToken: adminAccessToken, clientId, invoiceNumber });
    } finally {
      await Promise.all([adminContext.close(), clientContext.close()]);
    }
  }
});

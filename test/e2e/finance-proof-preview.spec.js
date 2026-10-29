import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { calculateProjectMetrics } from '../../functions/project-finance.js';
import { financeFixture } from '../fixtures/finance-state.js';

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const policy = config.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
const source = readFileSync(new URL('../../src/features/finance/Techmigos_Finance_Standalone.html', import.meta.url), 'utf8');
const preview = source.slice(source.indexOf('function clearProofPreview('), source.indexOf('function projectCard('));
const esc = source.split(/\r?\n/).find(line => line.startsWith('const esc='));

function pdfBytes() {
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  const stream = 'BT /F1 18 Tf 50 100 Td (Finance proof preview) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return [...Buffer.from(pdf)];
}

test('transaction PDF loads inside the native viewer under the production security policy', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/__proof-preview-regression', route => route.fulfill({
    status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': policy },
    body: '<!doctype html><html><body><div id="proofArea"></div></body></html>',
  }));
  await page.goto('/__proof-preview-regression');
  await page.evaluate(bytes => {
    window.violations = [];
    document.addEventListener('securitypolicyviolation', event => window.violations.push(event.effectiveDirective));
    window.ui = { selectedTxId: 'tx', selectedProofId: null, proofUrl: '' };
    window.state = { transactions: [{ id: 'tx', proofIds: ['pdf'] }] };
    window.$ = selector => document.querySelector(selector);
    window.icon = () => '';
    window.isFinanceAdmin = () => true;
    window.proofOp = async () => ({ id: 'pdf', name: 'receipt.pdf', mime: 'application/pdf',
      blob: new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }), size: bytes.length, addedAt: '2026-10-29' });
  }, pdfBytes());
  await page.addScriptTag({ content: `${esc}\n${preview}\nrenderProofArea();` });
  await expect(page.getByTitle('PDF preview')).toBeVisible();
  await expect.poll(() => page.frames().some(frame => frame.url().startsWith('chrome-extension://'))).toBe(true);
  await page.evaluate(() => renderProofArea());
  await expect(page.getByTitle('PDF preview')).toBeVisible();
  await expect.poll(() => page.frames().some(frame => frame.url().startsWith('chrome-extension://'))).toBe(true);
  expect(await page.evaluate(() => window.violations)).toEqual([]);
  expect(errors).toEqual([]);
});

test('Company allocation previews project expenses and paid invoice receipts and opens their PDF proofs', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cloud = readFileSync(new URL('../../src/features/finance/cloud-ui.js', import.meta.url), 'utf8');
  await page.route('**/__company-expenses-regression', route => route.fulfill({
    status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': policy },
    body: source.replace('// FINANCE_CLOUD_UI', () => cloud).replace('// FINANCE_APPROVAL_UI', () => readFileSync(new URL('../../src/features/finance/approval-ui.js', import.meta.url), 'utf8')).replace('// FINANCE_ALLOCATION_UI', () => readFileSync(new URL('../../src/features/finance/expense-allocation-ui.js', import.meta.url), 'utf8')),
  }));
  await page.goto('/__company-expenses-regression');
  const state = financeFixture();
  state.transactions = [
    { ...state.transactions[1], description: 'Project purchase PDF', proofIds: ['pdf'] },
    { ...state.transactions[1], id: 'pending', description: 'Pending purchase', status: 'Pending' },
    { ...state.transactions[1], id: 'other', projectId: 'p-focus', description: 'Other project purchase' },
    state.transactions[2],
  ];
  state.invoices = [
    { ...state.invoices[0], id: 'paid-invoice', projectId: 'p-arish', amount: 150, status: 'Pending', companyOnly: true },
    { ...state.invoices[0], id: 'partial-invoice', projectId: 'p-arish', amount: 200, status: 'Pending' },
    { ...state.invoices[0], id: 'other-invoice', projectId: 'p-focus', amount: 100, status: 'Paid' },
  ];
  const receipt = { ...state.transactions[0], type: 'income', status: 'Received', proofIds: [] };
  state.transactions.push(
    { ...receipt, id: 'receipt-one', description: 'First invoice receipt', amount: 100, linkedInvoiceId: 'paid-invoice' },
    { ...receipt, id: 'receipt-two', description: 'Final invoice receipt', amount: 50, linkedInvoiceId: 'paid-invoice' },
    { ...receipt, id: 'partial-receipt', description: 'Partial invoice receipt', amount: 50, linkedInvoiceId: 'partial-invoice' },
    { ...receipt, id: 'pending-receipt', description: 'Pending invoice receipt', amount: 100, status: 'Pending', linkedInvoiceId: 'paid-invoice' },
    { ...receipt, id: 'other-receipt', description: 'Other project receipt', projectId: 'p-focus', amount: 100, linkedInvoiceId: 'other-invoice' },
    { ...receipt, id: 'manual-income', description: 'Unlinked income', amount: 75, linkedInvoiceId: '' },
  );
  const metrics = Object.fromEntries(state.projects.map(project => [project.id, calculateProjectMetrics(state, project.id)]));
  await page.evaluate(({ records, metrics, bytes }) => {
    window.TechmigosFinanceAuth = { currentUser: () => ({ role: 'admin', name: 'Test admin' }) };
    window.FinanceProjectFinance = { calculate: (_state, id) => metrics[id], transactionsForProject: (records,id) => records.transactions.filter(t=>t.projectId===id) };
    window.FinanceBackend = { proofOp: async () => ({ id: 'pdf', name: 'purchase.pdf', mime: 'application/pdf',
      blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), size: bytes.length, addedAt: '2026-10-29' }) };
    state = records;
    ui.page = 'projectDetail'; ui.detailProjectId = 'p-arish'; ui.detailTab = 'overview';
    render();
  }, { records: state, metrics, bytes: pdfBytes() });
  const company = page.getByRole('button', { name: 'Show company transactions' });
  const preview = page.locator('#projectTeamTransactions');
  const companyRow = page.locator('tr[data-act="preview-company-transactions"]');
  await expect(companyRow).toContainText('₹7,150.00');
  await expect(companyRow).toContainText('₹150.00 received company invoice income');
  await expect(companyRow).toContainText('₹6,150.00');
  await company.click();
  await expect(company).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByRole('heading')).toHaveText('Company transactions');
  await expect(preview.locator('tbody tr')).toHaveCount(4);
  await expect(preview).toContainText('Project purchase PDF');
  await expect(preview).toContainText('Pending purchase');
  await expect(preview).toContainText('First invoice receipt');
  await expect(preview).toContainText('Final invoice receipt');
  await expect(preview).not.toContainText('Partial invoice receipt');
  await expect(preview).not.toContainText('Pending invoice receipt');
  await expect(preview).not.toContainText('Other project receipt');
  await expect(preview).not.toContainText('Unlinked income');
  await expect(preview).not.toContainText('Other project purchase');
  await expect(preview).not.toContainText('Example tx-payout');
  await page.getByRole('button', { name: 'Show transactions for Team 1' }).click();
  await expect(preview.getByRole('heading')).toHaveText('Team 1 transactions');
  await expect(company).toHaveAttribute('aria-pressed', 'false');
  await company.focus(); await page.keyboard.press('Enter');
  await expect(preview.getByRole('heading')).toHaveText('Company transactions');
  await preview.getByRole('button', { name: 'Clear filter' }).click();
  await expect(preview.getByRole('heading')).toHaveText('Recent project transactions');
  await company.click();
  await preview.getByRole('button', { name: 'Preview Project purchase PDF' }).click();
  await expect(page.getByRole('heading', { name: 'All Transactions' })).toBeVisible();
  await expect(page.getByTitle('PDF preview')).toBeVisible();
  await expect.poll(() => page.frames().some(frame => frame.url().startsWith('chrome-extension://'))).toBe(true);
  expect(errors).toEqual([]);
});

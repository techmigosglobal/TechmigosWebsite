import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRM_ROLES,
  canManageUsers,
  canCreate,
  canDelete,
  canRead,
  canUpdate,
  canWrite,
} from '../src/lib/crm/permissions.js';
import {
  calculateInvoiceTotals,
  FINANCE_CASH_TRANSACTION_TYPES,
  FINANCE_EXPENSE_TRANSACTION_TYPES,
  FINANCE_INCOME_TRANSACTION_TYPES,
  FINANCE_TRANSACTION_TYPES,
  isIncomeTransaction,
  invoiceBalance,
  invoiceReceived,
  invoiceTotal,
} from '../src/lib/crm/finance.js';
import { buildCrmReportPdf } from '../src/scripts/crm-pdf.js';

test('RBAC keeps Admin, Employee, and Client capabilities separate', () => {
  assert.equal(canManageUsers(CRM_ROLES.ADMIN), true);
  assert.equal(canManageUsers(CRM_ROLES.EMPLOYEE), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canWrite(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'projects'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'tickets'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'invoices'), false);
});

test('employees can update assigned delivery work and manage only internal project files', () => {
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'projects'), true);
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'tickets'), true);
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canDelete(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'clients'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_files'), false);
  assert.equal(canUpdate(CRM_ROLES.CLIENT, 'project_folders'), false);
});

test('project-folder and file permissions retain company-only boundaries', () => {
  assert.equal(canCreate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canUpdate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_folders'), false);
  assert.equal(canCreate(CRM_ROLES.CLIENT, 'project_files'), false);
});

test('invoice balances use received amounts and treat cancelled invoices as void', () => {
  const invoice = { total_amount: 1000, received_amount: 250, status: 'sent' };
  assert.equal(invoiceTotal(invoice), 1000);
  assert.equal(invoiceReceived(invoice), 250);
  assert.equal(invoiceBalance(invoice), 750);
  assert.equal(invoiceBalance({ ...invoice, status: 'cancelled' }), 0);
  assert.equal(invoiceReceived({ total_amount: 1000, status: 'paid' }), 1000);
});

test('invoice totals normalize line items and settle fully-paid invoices', () => {
  const totals = calculateInvoiceTotals([
    { description: 'Design', quantity: 2, rate: 500 },
    { description: 'Ignored blank row', quantity: 0, rate: 0 },
    { description: '', quantity: 1, rate: 999 },
  ], { discount_amount: 100, tax_amount: 50, received_amount: 950 });

  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.total, 950);
  assert.equal(totals.received, 950);
  assert.equal(totals.status, 'paid');
  assert.equal(totals.items.length, 2);
});

test('invoice ledger entries stay separate from cash income and expenses', () => {
  assert.equal(FINANCE_TRANSACTION_TYPES.has('invoice'), true);
  assert.equal(FINANCE_INCOME_TRANSACTION_TYPES.has('invoice'), true);
  assert.equal(FINANCE_CASH_TRANSACTION_TYPES.has('invoice'), false);
  assert.equal(FINANCE_EXPENSE_TRANSACTION_TYPES.has('invoice'), false);
  assert.equal(FINANCE_CASH_TRANSACTION_TYPES.has('income'), true);
  assert.equal(FINANCE_EXPENSE_TRANSACTION_TYPES.has('expense'), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'pending' }), false);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'received' }), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'cancelled' }), false);
  assert.equal(isIncomeTransaction({ transaction_type: 'income', status: 'received' }), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'income', status: 'pending' }), false);
});

test('report export creates a PDF artifact from supplied report rows', () => {
  const { document, fileName } = buildCrmReportPdf({
    report: {
      key: 'tickets',
      title: 'Support Tickets Report',
      subtitle: 'Live ticket records.',
      metrics: [['Open', 1]],
      columns: [['id', 'Ticket'], ['subject', 'Subject']],
      rows: [{ id: 'TIC-9', subject: 'Production issue' }],
    },
    from: '2026-09-01',
    to: '2026-09-09',
  });
  assert.match(fileName, /^techmigos-tickets-2026-09-01-to-2026-09-09\.pdf$/);
  const header = Buffer.from(document.output('arraybuffer')).subarray(0, 4).toString('utf8');
  assert.equal(header, '%PDF');
});

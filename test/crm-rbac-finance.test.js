import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRM_ROLES,
  canManageUsers,
  canRead,
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

test('RBAC keeps Admin, Employee, and Client capabilities separate', () => {
  assert.equal(canManageUsers(CRM_ROLES.ADMIN), true);
  assert.equal(canManageUsers(CRM_ROLES.EMPLOYEE), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'finances'), true);
  assert.equal(canWrite(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'projects'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'tickets'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'invoices'), false);
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

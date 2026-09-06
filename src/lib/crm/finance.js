export const INVOICE_SETTLED_STATUSES = new Set(['paid', 'completed']);
export const FINANCE_TRANSACTION_TYPES = new Set(['income', 'revenue', 'expense', 'salary', 'invoice']);
export const FINANCE_INCOME_TRANSACTION_TYPES = new Set(['income', 'revenue', 'invoice']);
export const FINANCE_CASH_TRANSACTION_TYPES = new Set(['income', 'revenue']);
export const FINANCE_EXPENSE_TRANSACTION_TYPES = new Set(['expense', 'salary']);
export const FINANCE_TRANSACTION_STATUSES = new Set(['pending', 'paid', 'received', 'half_payment', 'cancelled']);

export function normalizedStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isIncomeTransaction(transaction = {}) {
  const type = normalizedStatus(transaction.transaction_type);
  if (type === 'invoice') return normalizedStatus(transaction.status) !== 'cancelled';
  return FINANCE_CASH_TRANSACTION_TYPES.has(type)
    && new Set(['paid', 'received', 'completed']).has(normalizedStatus(transaction.status));
}
export function invoiceTotal(invoice = {}) {
  return Math.max(Number(invoice.total_amount ?? invoice.amount ?? 0) || 0, 0);
}

export function invoiceReceived(invoice = {}) {
  const total = invoiceTotal(invoice);
  if (INVOICE_SETTLED_STATUSES.has(normalizedStatus(invoice.status))) return total;
  return Math.min(Math.max(Number(invoice.received_amount ?? 0) || 0, 0), total);
}

export function invoiceBalance(invoice = {}) {
  if (normalizedStatus(invoice.status) === 'cancelled') return 0;
  return Math.max(invoiceTotal(invoice) - invoiceReceived(invoice), 0);
}

export function calculateInvoiceTotals(items = [], values = {}) {
  const normalizedItems = items.map((item, index) => {
    const quantity = Math.max(Number(item.quantity ?? 1) || 0, 0);
    const rate = Math.max(Number(item.rate ?? 0) || 0, 0);
    return {
      description: String(item.description ?? '').trim(),
      quantity,
      rate,
      amount: quantity * rate,
      unit: String(item.unit ?? '').trim(),
      notes: String(item.notes ?? '').trim(),
      sort_order: Number.isInteger(Number(item.sort_order)) ? Number(item.sort_order) : index,
    };
  }).filter((item) => item.description);

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(Number(values.discount_amount ?? 0) || 0, 0);
  const tax = Math.max(Number(values.tax_amount ?? 0) || 0, 0);
  const total = Math.max(subtotal - discount + tax, 0);
  let received = Math.min(Math.max(Number(values.received_amount ?? 0) || 0, 0), total);
  let status = normalizedStatus(values.status) || 'draft';

  if (status === 'paid' || (total > 0 && received >= total)) {
    received = total;
    status = 'paid';
  }

  return { items: normalizedItems, subtotal, discount, tax, total, received, status };
}

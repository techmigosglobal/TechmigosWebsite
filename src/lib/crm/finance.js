export const INVOICE_SETTLED_STATUSES = new Set(['paid', 'completed']);
export const FINANCE_TRANSACTION_TYPES = new Set(['income', 'revenue', 'expense', 'salary', 'invoice']);
export const FINANCE_INCOME_TRANSACTION_TYPES = new Set(['income', 'revenue', 'invoice']);
export const FINANCE_CASH_TRANSACTION_TYPES = new Set(['income', 'revenue']);
export const FINANCE_EXPENSE_TRANSACTION_TYPES = new Set(['expense', 'salary']);
export const FINANCE_TRANSACTION_STATUSES = new Set(['pending', 'paid', 'received', 'half_payment', 'cancelled']);
export const FINANCE_SETTLED_TRANSACTION_STATUSES = new Set(['paid', 'received', 'completed']);
export const SETTLED_FINANCE_STATUSES = new Set(['paid', 'received', 'completed']);
export const SETTLED_EXPENSE_STATUSES = new Set(['paid', 'completed']);
export const SETTLED_INVOICE_STATUSES = new Set(['paid', 'completed']);

export function normalizedStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isIncomeTransaction(transaction = {}) {
  const type = normalizedStatus(transaction.transaction_type);
  if (type === 'invoice') return FINANCE_SETTLED_TRANSACTION_STATUSES.has(normalizedStatus(transaction.status));
  return FINANCE_CASH_TRANSACTION_TYPES.has(type)
    && FINANCE_SETTLED_TRANSACTION_STATUSES.has(normalizedStatus(transaction.status));
}

export function normalizeFinanceRecord(record = {}) {
  return {
    ...record,
    transaction_type: normalizedStatus(record.transaction_type),
    status: normalizedStatus(record.status),
  };
}

export function normalizeFinanceRecords(records = []) {
  return Array.isArray(records) ? records.filter(Boolean).map(normalizeFinanceRecord) : [];
}

export function isSettledFinance(item = {}) {
  const transactionType = normalizedStatus(item.transaction_type);
  if (transactionType === 'invoice') return FINANCE_SETTLED_TRANSACTION_STATUSES.has(normalizedStatus(item.status));
  const statuses = ['income', 'revenue'].includes(transactionType)
    ? SETTLED_FINANCE_STATUSES
    : SETTLED_EXPENSE_STATUSES;
  return statuses.has(normalizedStatus(item.status));
}

export function isSettledInvoice(invoice = {}) {
  return SETTLED_INVOICE_STATUSES.has(normalizedStatus(invoice.status));
}

export function invoiceTotal(invoice = {}) {
  return Math.max(Number(invoice.total_amount ?? invoice.amount ?? 0) || 0, 0);
}

export function invoiceReceived(invoice = {}) {
  const total = invoiceTotal(invoice);
  if (INVOICE_SETTLED_STATUSES.has(normalizedStatus(invoice.status))) return total;
  return Math.min(Math.max(Number(invoice.received_amount ?? 0) || 0, 0), total);
}

export const invoicePaidAmount = invoiceReceived;

export function invoiceBalance(invoice = {}) {
  if (normalizedStatus(invoice.status) === 'cancelled') return 0;
  return Math.max(invoiceTotal(invoice) - invoiceReceived(invoice), 0);
}

export function invoiceEffectiveStatus(invoice = {}, now = new Date()) {
  const status = normalizedStatus(invoice.status) || 'draft';
  if (isSettledInvoice(invoice) || status === 'cancelled') return status;
  if (invoiceBalance(invoice) > 0 && invoice.due_date) {
    const dueDate = new Date(`${String(invoice.due_date).slice(0, 10)}T23:59:59`);
    if (!Number.isNaN(dueDate.getTime()) && dueDate < now) return 'overdue';
  }
  return status;
}

export function standaloneInvoiceBalance(item = {}, invoices = []) {
  if (normalizedStatus(item.transaction_type) !== 'invoice' || isSettledFinance(item)) return 0;
  if (normalizedStatus(item.status) === 'cancelled') return 0;
  if (item.invoice_id && invoices.some((invoice) => String(invoice.id) === String(item.invoice_id))) return 0;
  return Math.max(Number(item.amount || 0), 0);
}

export function outstandingInvoiceRows(invoices = [], finances = []) {
  return [
    ...invoices.filter((invoice) => invoiceBalance(invoice) > 0).map((invoice) => ({
      ...invoice,
      amount: invoiceBalance(invoice),
      record_kind: 'invoice',
    })),
    ...finances.filter((item) => standaloneInvoiceBalance(item, invoices) > 0),
  ];
}

export function sumAmounts(rows = []) {
  return rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function outstandingInvoiceAmount(invoices = [], finances = []) {
  return sumAmounts(outstandingInvoiceRows(invoices, finances));
}

export function outstandingExpenseRows(finances = []) {
  return finances.filter((item) => {
    const type = normalizedStatus(item.transaction_type);
    return type === 'expense'
      && normalizedStatus(item.status) !== 'cancelled'
      && !isSettledFinance(item)
      && Number(item.amount || 0) > 0;
  });
}

export function outstandingExpenseAmount(finances = []) {
  return sumAmounts(outstandingExpenseRows(finances));
}

export function invoiceIncomeRows(invoices = [], finances = [], { clientName = () => '', projectName = () => '' } = {}) {
  const linkedInvoiceIds = new Set(
    finances
      .filter((item) => ['income', 'revenue', 'invoice'].includes(normalizedStatus(item.transaction_type)) && item.invoice_id)
      .map((item) => String(item.invoice_id)),
  );
  return invoices
    .filter((invoice) => isSettledInvoice(invoice))
    .filter((invoice) => !linkedInvoiceIds.has(String(invoice.id)))
    .map((invoice) => ({
      ...invoice,
      id: `invoice-${invoice.id}`,
      invoice_id: invoice.id,
      record_kind: 'invoice',
      transaction_type: 'invoice',
      transaction_date: invoice.invoice_date || String(invoice.created_at || '').slice(0, 10),
      reference_id: invoice.invoice_number,
      title: invoice.service_title || invoice.invoice_number || 'Invoice income',
      client: invoice.customer_company || invoice.customer_name || clientName(invoice.client_id),
      project: projectName(invoice.project_id),
      amount: invoicePaidAmount(invoice),
      status: invoiceEffectiveStatus(invoice),
      source: 'invoice',
    }));
}

export function invoiceLedgerEntryRows(finances = []) {
  return finances
    .filter((item) => normalizedStatus(item.transaction_type) === 'invoice' && !item.invoice_id)
    .map((item) => ({ ...item, record_kind: 'invoice_ledger' }));
}

export function incomeRows(finances = [], invoices = [], selectors = {}) {
  const invoiceLedgerIds = new Set(
    finances
      .filter((item) => normalizedStatus(item.transaction_type) === 'invoice' && item.invoice_id)
      .map((item) => String(item.invoice_id)),
  );
  const ledgerIncome = finances.filter((item) => {
    const type = normalizedStatus(item.transaction_type);
    if (!['income', 'revenue', 'invoice'].includes(type) || !isSettledFinance(item)) return false;
    return !(type !== 'invoice' && item.invoice_id && invoiceLedgerIds.has(String(item.invoice_id)));
  });
  return [...ledgerIncome, ...invoiceIncomeRows(invoices, finances, selectors)];
}

export function selectFinanceSheetRows({
  sheet = 'all',
  financeRecords = [],
  invoiceRecords = [],
  selectIncomeRows = () => [],
  clientName = () => '',
  projectName = () => '',
} = {}) {
  if (sheet === 'invoices') {
    return invoiceRecords.map((invoice) => ({
      ...invoice,
      id: invoice.id,
      transaction_date: invoice.invoice_date || invoice.created_at?.slice(0, 10),
      reference_id: invoice.invoice_number,
      client: invoice.customer_company || invoice.customer_name || clientName(invoice.client_id),
      project: projectName(invoice.project_id),
      transaction_type: 'invoice',
      amount: invoiceTotal(invoice),
      received_amount: invoicePaidAmount(invoice),
      status: invoiceEffectiveStatus(invoice),
      notes: invoice.notes,
    }));
  }
  if (sheet === 'income') return selectIncomeRows();
  if (sheet === 'all') return financeRecords.slice();

  return financeRecords.filter((item) => {
    const type = normalizedStatus(item.transaction_type);
    const status = normalizedStatus(item.status);
    if (sheet === 'expenses') return type === 'expense';
    if (sheet === 'salary') return type === 'salary';
    if (sheet === 'pending') return ['pending', 'half_payment', 'sent'].includes(status);
    if (sheet === 'paid') return ['paid', 'received', 'completed'].includes(status);
    return true;
  });
}

export function expenseRows(finances = []) {
  return finances.filter((item) => ['expense', 'salary'].includes(normalizedStatus(item.transaction_type)) && isSettledFinance(item));
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

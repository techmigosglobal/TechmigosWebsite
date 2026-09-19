import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderFinance(context) {
  const { state, els, incomeRows, expenseRows, sumAmounts, normalizedStatus, outstandingInvoiceAmount, outstandingExpenseAmount, outstandingExpenseRows, canWrite, isCompanyAdmin, renderInvoiceBuilder, SETTLED_INVOICE_TRANSACTION_STATUSES, invoiceLedgerEntryRows, invoiceLedgerRecord, invoiceTotal, invoiceEffectiveStatus, invoicePaidAmount, isSettledInvoice, invoiceBalance, proofIconMarkup, crmProjectIcon, pageHead, escapeHtml, nice, initAccounting, initInvoiceBuilder, loadAutoProofPreviews, financeSheetTabs } = context;
  const isBuilder = state.financeSheet === 'invoices' && state.invoiceBuilderActive;
  const collectedIncome = incomeRows();
  const settledExpenses = expenseRows();
  const income = sumAmounts(collectedIncome);
  const operatingExpenses = sumAmounts(settledExpenses.filter((item) => normalizedStatus(item.transaction_type) === 'expense'));
  const salaries = sumAmounts(settledExpenses.filter((item) => normalizedStatus(item.transaction_type) === 'salary'));
  const expenses = operatingExpenses + salaries;
  const receivable = outstandingInvoiceAmount();
  const outstandingExpenses = outstandingExpenseAmount();
  const outstandingExpenseCount = outstandingExpenseRows().length;
  const availableBalance = income - expenses;

  const canWriteFinance = canWrite('finances');
  const tabActions = isBuilder
    ? `<button class="crm-button" type="button" id="inv-cancel-btn">Back to Invoices</button>${isCompanyAdmin() ? '<button class="crm-button green" type="button" id="inv-save-settings">Save Settings</button><button class="crm-button primary" type="button" id="inv-save-invoice">Save Invoice</button>' : ''}<button class="crm-button" type="button" id="inv-print-btn">Print / PDF</button>`
    : '<button class="crm-button" data-export="finance" type="button">Export CSV</button>';

  const subtitles = isBuilder
    ? 'Build professional invoices with live preview. Configure company settings, client details, service items, and branding.'
    : 'Track revenue, expenses, salary, receivables, and proof-backed ledger records in one controlled workspace.';

  let bodyContent = '';

  if (isBuilder) {
    bodyContent = renderInvoiceBuilder();
  } else {
    const accTab = state.accTab || 'overview';
    const fmtINR = (v) => '₹' + Math.abs(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const isInc = (t) => ['income', 'revenue', 'invoice'].includes(t);
    const signedINR = (v, t, status = '') => t === 'invoice' && !SETTLED_INVOICE_TRANSACTION_STATUSES.has(normalizedStatus(status))
      ? fmtINR(Math.abs(Number(v) || 0))
      : isInc(t) ? '+' + fmtINR(Math.abs(Number(v) || 0)) : '-' + fmtINR(Math.abs(Number(v) || 0));
    const cashFlowByMonth = {};
    collectedIncome.forEach((item) => {
      const month = (item.transaction_date || '').slice(0, 7);
      if (!month) return;
      cashFlowByMonth[month] = (cashFlowByMonth[month] || 0) + Number(item.amount || 0);
    });
    settledExpenses.forEach((item) => {
      const month = (item.transaction_date || '').slice(0, 7);
      if (!month) return;
      cashFlowByMonth[month] = (cashFlowByMonth[month] || 0) - Number(item.amount || 0);
    });
    const cashFlowMonths = Object.keys(cashFlowByMonth).sort().slice(-6);
    const cashFlowValues = cashFlowMonths.map((month) => cashFlowByMonth[month]);
    const cashFlowMax = Math.max(...cashFlowValues.map(Math.abs), 1);
    const cashFlowPoints = cashFlowValues.map((value, index) => `${8 + (index * 184 / Math.max(cashFlowValues.length - 1, 1))},${44 - (value / cashFlowMax) * 32}`).join(' ');

    const catBadge = (t) => {
      const m = { income: 'acc-badge-income', revenue: 'acc-badge-income', expense: 'acc-badge-expense', salary: 'acc-badge-salary', invoice: 'acc-badge-invoice' };
      const l = { income: 'Income', revenue: 'Income', expense: 'Expenses', salary: 'Salary', invoice: 'Invoice' };
      const cls = m[t?.toLowerCase()] || 'acc-badge-other';
      return `<span class="acc-badge ${cls}">${l[t?.toLowerCase()] || 'Other'}</span>`;
    };
    const sBadge = (s) => {
      const m = { paid: 'acc-status-paid', received: 'acc-status-paid', completed: 'acc-status-paid', pending: 'acc-status-pending', overdue: 'acc-status-overdue', draft: 'acc-status-draft', sent: 'acc-status-sent', cancelled: 'acc-status-cancelled' };
      const status = String(s || '').toLowerCase();
      const label = status ? status[0].toUpperCase() + status.slice(1).replace(/_/g, ' ') : '—';
      return `<span class="acc-status-badge ${m[status] || 'acc-status-other'}" aria-label="Status: ${escapeHtml(label)}">${status === 'pending' ? proofIconMarkup('pending', 13) : ''}<span>${escapeHtml(label)}</span></span>`;
    };
    const proofIcon = (r) => r.proof_url
      ? `<button class="acc-proof-btn has-proof" data-proof="${escapeHtml(r.proof_url)}" data-id="${r.id}" title="View proof" aria-label="View proof" type="button">${proofIconMarkup('paperclip')}</button>`
      : `<span class="acc-proof-btn acc-proof-btn-empty" data-noproof="${r.id}" title="No proof attached" aria-label="No proof attached">${proofIconMarkup('file')}</span>`;

    // Filter finance rows by sub-tab and search
    const getFinRows = () => {
      let rows = [...state.data.finances];
      const sh = state.accSubTab || 'all';
      if (sh === 'income') rows = incomeRows();
      else if (sh === 'expenses') rows = rows.filter(r => normalizedStatus(r.transaction_type) === 'expense');
      else if (sh === 'salary') rows = rows.filter(r => normalizedStatus(r.transaction_type) === 'salary');
      else if (sh === 'invoices') rows = [
        ...state.data.invoices.map((invoice) => ({
          ...invoice,
          record_kind: 'invoice',
          invoice_id: invoice.id,
          transaction_type: 'invoice',
          transaction_date: invoice.invoice_date || String(invoice.created_at || '').slice(0, 10),
          title: invoice.service_title || invoice.invoice_number || 'Invoice',
          amount: invoiceTotal(invoice),
          status: invoiceEffectiveStatus(invoice),
        })),
        ...invoiceLedgerEntryRows(),
      ];
      if (state.accSearch) {
        const q = state.accSearch.toLowerCase();
        rows = rows.filter(r => (r.title || '').toLowerCase().includes(q) || (r.status || '').toLowerCase().includes(q));
      }
      return rows;
    };
    const finRows = getFinRows();
    const txPage = state.accTxPage || 1, txPer = 12;
    const txTotal = finRows.length;
    const txPageRows = finRows.slice((txPage - 1) * txPer, txPage * txPer);

    const transactionTypeOptions = (selected) => ['income', 'revenue', 'expense', 'salary', 'invoice'].map((type) => `<option value="${type}" ${selected === type ? 'selected' : ''}>${nice(type === 'expense' ? 'expenses' : type)}</option>`).join('');
    const transactionStatusOptions = (selected) => ['pending', 'paid', 'received', 'half_payment', 'cancelled'].map((status) => `<option value="${status}" ${selected === status ? 'selected' : ''}>${nice(status)}</option>`).join('');
    const inlineTransactionRow = (record = {}, showProof = false) => {
      const isNew = !record.id;
      const type = record.transaction_type || state.accInlineFinanceType || (state.accSubTab === 'income' ? 'income' : state.accSubTab === 'expenses' ? 'expense' : state.accSubTab === 'salary' ? 'salary' : 'expense');
      const status = record.status || (type === 'income' ? 'received' : 'pending');
      const date = record.transaction_date || new Date().toISOString().slice(0, 10);
      const initialSaveLabel = isNew ? 'Draft · complete required fields' : 'Auto-save ready';
      const proofCellMarkup = showProof
        ? isNew
          ? '<span class="acc-inline-proof-placeholder">Complete the row to attach proof</span>'
          : `<div class="acc-inline-proof-actions">${record.proof_url ? proofIcon(record) : '<span class="acc-inline-no-proof">No proof</span>'}<label class="acc-proof-btn acc-proof-upload" title="Attach or replace proof" aria-label="Attach or replace proof">${proofIconMarkup('upload')}<input type="file" accept="image/*,.pdf" data-proof-upload="${record.id}" style="display:none;" /></label></div>`
        : '';
      const actionLabel = isNew ? 'Cancel' : 'Done';
      return `<tr class="acc-tbl-row acc-inline-row" data-inline-finance-row${isNew ? ' data-inline-finance-new' : ` data-inline-finance-id="${record.id}"`}>
        <td><input class="crm-edit-input" data-inline-field="transaction_date" type="date" value="${escapeHtml(date)}" aria-label="Transaction date" /></td>
        <td><input class="crm-edit-input" data-inline-field="title" value="${escapeHtml(record.title || '')}" placeholder="Description" aria-label="Description" /></td>
        <td><select class="crm-edit-select" data-inline-field="transaction_type" aria-label="Category">${transactionTypeOptions(type)}</select></td>
        <td><input class="crm-edit-input" data-inline-field="amount" type="number" min="0" step="0.01" value="${escapeHtml(record.amount ?? '')}" placeholder="0.00" aria-label="Amount" /></td>
        <td><select class="crm-edit-select" data-inline-field="status" aria-label="Status">${transactionStatusOptions(status)}</select></td>
        ${showProof ? `<td>${proofCellMarkup}</td>` : ''}
        <td><div class="acc-inline-actions"><span class="acc-inline-save-state acc-inline-save-state--draft" data-inline-save-state aria-live="polite">${initialSaveLabel}</span><button class="crm-button" data-cancel-inline-finance type="button">${actionLabel}</button></div></td>
      </tr>`;
    };
    const invoiceTransactionRow = (record, showProof) => {
      const invoiceId = record.invoice_id || record.id;
      const invoice = state.data.invoices.find((item) => String(item.id) === String(invoiceId)) || record;
      const ledger = invoiceLedgerRecord(invoice);
      const proofUrl = ledger?.proof_url || '';
      const incomeLabel = normalizedStatus(invoice.status) === 'cancelled'
        ? '<span style="font-size:10px;color:#94a3b8;font-weight:700;">Voided</span>'
        : isSettledInvoice(invoice)
          ? '<span style="font-size:10px;color:#15803d;font-weight:700;">Included in income</span>'
          : '<span style="font-size:10px;color:#a16207;font-weight:700;">Outstanding</span>';
      const proofAction = proofUrl
        ? `<button class="crm-mini-action" data-proof-open="${escapeHtml(proofUrl)}" type="button">Preview proof</button>${canWriteFinance ? `<label class="crm-mini-action" style="cursor:pointer;">Replace<input type="file" data-proof-upload="${ledger.id}" accept="image/*,.pdf" style="display:none;" /></label>` : ''}`
        : ledger && canWriteFinance
          ? `<label class="crm-mini-action" style="cursor:pointer;">+ Proof<input type="file" data-proof-upload="${ledger.id}" accept="image/*,.pdf" style="display:none;" /></label>`
          : '<span style="font-size:10px;color:#94a3b8;">Optional proof</span>';
      return `<tr class="acc-tbl-row" data-row-id="${record.id}" data-record-kind="invoice">
        <td style="white-space:nowrap;font-size:12px;color:#64748b;">${fmtDate(record.transaction_date)}</td>
        <td style="font-weight:600;">${escapeHtml(record.title || record.reference_id || 'Invoice')}</td>
        <td>${catBadge('invoice')}</td>
        <td class="acc-amt-invoice" style="font-weight:700;">${signedINR(record.amount, 'invoice', record.status)}</td>
        <td>${sBadge(record.status)}</td>
        ${showProof ? `<td><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${proofAction}</div></td>` : ''}
        <td><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${incomeLabel}<button class="crm-button" data-load-invoice="${invoiceId}" type="button" title="Open invoice">View invoice</button></div></td>
      </tr>`;
    };
    const txTable = (rows, showProof = false) => {
      const isAdding = state.accInlineFinanceId === 'new';
      if (!rows.length && !isAdding) return `<p style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">No records found.</p>`;
      return `<div style="overflow-x:auto;"><table class="acc-tbl"><thead><tr>
        <th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th>${showProof ? '<th>Proof</th>' : ''}<th>Actions</th>
      </tr></thead><tbody>
      ${isAdding ? inlineTransactionRow({}, showProof) : ''}
      ${rows.map(r => r.record_kind === 'invoice' || (r.transaction_type === 'invoice' && r.invoice_id) ? invoiceTransactionRow(r, showProof) : state.accInlineFinanceId === String(r.id) ? inlineTransactionRow(r, showProof) : `<tr class="acc-tbl-row${state.accSelectedId === String(r.id) ? ' acc-row-selected' : ''}${String(r.status).toLowerCase() === 'pending' ? ' acc-row-pending' : ''}" data-row-id="${r.id}">
        <td style="white-space:nowrap;font-size:12px;color:#64748b;">${fmtDate(r.transaction_date)}</td>
        <td style="font-weight:600;">${escapeHtml(r.title || '—')}</td>
        <td>${catBadge(r.transaction_type)}</td>
        <td class="${r.transaction_type === 'invoice' ? 'acc-amt-invoice' : isInc(r.transaction_type) ? 'acc-amt-pos' : 'acc-amt-neg'}" style="font-weight:700;">${signedINR(r.amount, r.transaction_type, r.status)}</td>
        <td>${sBadge(r.status)}</td>
        ${showProof ? `<td><div class="acc-proof-actions">${proofIcon(r)}${canWriteFinance ? `<label class="acc-proof-btn acc-proof-upload" title="Attach or replace proof" aria-label="Attach or replace proof">${proofIconMarkup('upload')}<input type="file" accept="image/*,.pdf" data-proof-upload="${r.id}" style="display:none;" /></label>` : ''}</div></td>` : ''}
        <td><div style="display:${canWriteFinance ? 'flex' : 'none'};gap:4px;align-items:center;">
          <button class="crm-button" data-edit-finance="${r.id}" type="button" title="Edit" aria-label="Edit" style="padding:4px 7px;display:inline-flex;align-items:center;justify-content:center;line-height:1;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="crm-button" data-del-finance="${r.id}" type="button" title="Delete" aria-label="Delete" style="padding:4px 7px;display:inline-flex;align-items:center;justify-content:center;line-height:1;color:#dc2626;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div></td>
      </tr>`).join('')}
      </tbody></table></div>`;
    };

    const proofPanel = (panelId) => {
      const row = state.data.finances.find(r => String(r.id) === String(state.accSelectedId));
      if (!row) return `<div class="acc-proof-panel" id="${panelId}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;min-height:200px;">
        <div class="acc-proof-empty-icon">${proofIconMarkup('file', 32)}</div>
        <div style="font-size:14px;font-weight:700;color:#475569;">Proof Preview</div>
        <p style="font-size:12px;color:#94a3b8;margin-top:6px;max-width:320px;">Click any transaction row to see details and proof/receipt here.</p>
      </div>`;
      const safeRawUrl = escapeHtml(row.proof_url || '');

      let proofContentMarkup = '';
      if (row.proof_url) {
        proofContentMarkup = `<div data-proof-auto-preview data-proof-value="${safeRawUrl}" style="border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;background:#fff;margin-bottom:10px;"><p style="margin:0;color:#64748b;font-size:12px;">Loading secure preview…</p></div>`;
      } else {
        proofContentMarkup = `
          <label class="acc-proof-upload-zone" style="display:${canWriteFinance ? 'flex' : 'none'};flex-direction:column;align-items:center;gap:8px;border:1.5px dashed #d1d5db;border-radius:10px;padding:20px;cursor:pointer;background:#fafafa;transition:background .15s;">
            <div class="acc-proof-empty-icon">${proofIconMarkup('upload', 30)}</div>
            <span style="font-size:12px;color:#94a3b8;font-weight:600;">No proof attached</span>
            <span style="font-size:11px;color:#6366f1;font-weight:700;">Click to Upload</span>
            <input type="file" accept="image/*,.pdf" data-proof-upload="${row.id}" data-proof-row="${row.id}" style="display:none;" />
          </label>`;
      }

      return `<div class="acc-proof-panel" id="${panelId}">
        <div style="padding:14px 16px;border-bottom:1px solid #f0f4fb;background:#f8fafc;">
          <div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:2px;">${escapeHtml(row.title || '—')}</div>
          <div style="font-size:11px;color:#94a3b8;">${fmtDate(row.transaction_date)}</div>
        </div>
        <div style="padding:14px 16px;">
          <div style="font-size:22px;font-weight:800;color:${isInc(row.transaction_type) && (normalizedStatus(row.transaction_type) !== 'invoice' || SETTLED_INVOICE_TRANSACTION_STATUSES.has(normalizedStatus(row.status))) ? '#16a34a' : normalizedStatus(row.transaction_type) === 'invoice' ? '#a16207' : '#dc2626'};margin-bottom:6px;">${signedINR(row.amount, row.transaction_type, row.status)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">${catBadge(row.transaction_type)}${sBadge(row.status)}</div>
          ${String(row.status).toLowerCase() === 'pending' && normalizedStatus(row.transaction_type) !== 'invoice' ? '<div class="acc-pending-note" role="status">' + proofIconMarkup('pending', 16) + '<span><strong>Pending review</strong><small>Update the status after confirming this record.</small></span>' + (canWriteFinance ? `<button class="crm-button" type="button" data-resolve-finance="${row.id}" style="margin-left:auto;white-space:nowrap;padding:5px 8px;font-size:10px;">Mark ${isInc(row.transaction_type) ? 'Received' : 'Paid'}</button>` : '') + '</div>' : ''}
          ${proofContentMarkup}
          ${row.notes ? `<div style="margin-top:12px;font-size:12px;color:#64748b;background:#f8fafc;padding:10px;border-radius:8px;border-left:3px solid #e2e8f0;">${escapeHtml(row.notes)}</div>` : ''}
        </div>
      </div>`;
    };

    // Build sub-tab pills
    const subTabs = (tabs) => `<div class="acc-sheet-tabs" role="tablist" aria-label="Finance record filters">${tabs.map(([k, l]) => `<button class="acc-sheet-tab${(state.accSubTab || 'all') === k ? ' active' : ''}" data-acc-subtab="${k}" type="button" role="tab" aria-selected="${(state.accSubTab || 'all') === k}">${l}</button>`).join('')}</div>`;
    const financialPulse = `<section class="acc-financial-pulse" aria-label="Financial summary">
      <div class="acc-pulse-metrics">
        <div class="acc-pulse-metric acc-pulse-income"><span>Income</span><strong>${fmtINR(income)}</strong><small>${collectedIncome.length} settled entries, including paid invoices</small></div>
        <div class="acc-pulse-metric"><span>Operating expenses</span><strong>${fmtINR(operatingExpenses)}</strong><small>Excludes salaries</small></div>
        <div class="acc-pulse-metric"><span>Total spending</span><strong>${fmtINR(expenses)}</strong><small>Expenses and salaries</small></div>
        <div class="acc-pulse-metric"><span>Outstanding invoices</span><strong>${fmtINR(receivable)}</strong><small>Awaiting collection</small></div>
        <div class="acc-pulse-metric"><span>Outstanding expenses</span><strong>${fmtINR(outstandingExpenses)}</strong><small>${outstandingExpenseCount} unpaid expense${outstandingExpenseCount === 1 ? '' : 's'}</small></div>
        <div class="acc-pulse-metric ${availableBalance >= 0 ? 'acc-pulse-balance-positive' : 'acc-pulse-balance-negative'}"><span>Available balance</span><strong>${availableBalance < 0 ? '−' : ''}${fmtINR(availableBalance)}</strong><small>${availableBalance >= 0 ? 'Funds remaining' : 'Spending exceeds income'}</small></div>
      </div>
      <div class="acc-pulse-chart">
        <div><span>Net income</span><strong>${availableBalance >= 0 ? '+' : '−'}${fmtINR(availableBalance)}</strong></div>
        ${cashFlowMonths.length ? `<svg viewBox="0 0 200 88" role="img" aria-label="Net income trend" preserveAspectRatio="none"><line x1="0" y1="44" x2="200" y2="44" class="acc-pulse-baseline"/><polyline points="${cashFlowPoints}" class="acc-pulse-line"/></svg><div class="acc-pulse-months">${cashFlowMonths.map((month) => `<span>${new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' })}</span>`).join('')}</div>` : '<p>No income data yet.</p>'}
      </div>
    </section>`;

    // ── OVERVIEW TAB ──
    const overviewTab = `<div class="finance-tab-stack finance-overview-stack" style="display:flex;flex-direction:column;gap:18px;">
      ${financialPulse}
      <div style="display:grid;grid-template-columns:1fr 620px;gap:14px;">
        <div class="crm-card" style="padding:18px;">
          ${subTabs([['all', 'All Records'], ['income', 'Income'], ['expenses', 'Expenses'], ['salary', 'Salary'], ['invoices', 'Invoices']])}
          ${txTable(finRows.slice(0, 8), true)}
        </div>
        ${proofPanel('acc-ov-proof')}
      </div>
    </div>`;

    // ── TRANSACTIONS TAB ──
    const transactionsTab = `<div class="finance-tab-stack finance-transactions-stack" style="display:flex;flex-direction:column;gap:18px;">
      ${financialPulse}
      <div class="acc-transactions-workspace">
      <div class="acc-transactions-left">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div style="font-size:16px;font-weight:800;color:#1e293b;">All Transactions</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input class="crm-input" id="acc-tx-search" placeholder="Search transactions…" value="${escapeHtml(state.accSearch || '')}" style="width:200px;height:36px;font-size:13px;" />
            ${canWriteFinance ? '<button class="crm-button primary" data-add-inline-finance type="button">+ Add Transaction</button><button class="crm-button" data-add-invoice-finance type="button">+ Add Invoice Entry</button>' : ''}
          </div>
        </div>
        ${subTabs([['all', 'All'], ['income', 'Income'], ['expenses', 'Expenses'], ['salary', 'Salary'], ['invoices', 'Invoices']])}
        ${txTable(txPageRows, true)}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 2px;">
          <span style="font-size:12px;color:#94a3b8;">Showing ${txTotal ? ((txPage - 1) * txPer + 1) : 0}–${Math.min(txPage * txPer, txTotal)} of ${txTotal} transactions</span>
          <div style="display:flex;gap:4px;">
            ${txPage > 1 ? `<button class="crm-button" data-acc-pg="${txPage - 1}" type="button">‹</button>` : ''}
            ${Array.from({ length: Math.min(Math.ceil(txTotal / txPer), 6) }, (_, i) => `<button class="crm-button${i + 1 === txPage ? ' primary' : ''}" data-acc-pg="${i + 1}" type="button">${i + 1}</button>`).join('')}
            ${txPage < Math.ceil(txTotal / txPer) ? `<button class="crm-button" data-acc-pg="${txPage + 1}" type="button">›</button>` : ''}
          </div>
        </div>
      </div>
      ${proofPanel('acc-tx-proof')}
      </div>
    </div>`;

    // ── INVOICES TAB ──
    const invoicesTab = `<div class="finance-tab-stack finance-invoices-stack" style="display:flex;flex-direction:column;gap:14px;">
      ${financialPulse}
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:16px;font-weight:800;color:#1e293b;">Invoices</div>
        ${canWriteFinance ? '<button class="crm-button primary" data-create="invoices" type="button">+ New Invoice</button>' : ''}
      </div>
      ${state.data.invoices.length === 0
        ? `<div class="finance-empty-state"><div class="finance-empty-icon">${crmProjectIcon('reports')}</div><div>No Invoices Yet</div><p>Create your first invoice to get started.</p></div>`
        : `<div style="overflow-x:auto;"><table class="acc-tbl"><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Recurring</th><th>Income</th><th>Proof (optional)</th><th>Actions</th></tr></thead><tbody>
        ${state.data.invoices.map((inv) => {
          const invoiceLedger = invoiceLedgerRecord(inv);
          const proofUrl = invoiceLedger?.proof_url || '';
          const incomeState = normalizedStatus(inv.status) === 'cancelled'
            ? '<span style="font-size:10px;color:#94a3b8;font-weight:700;white-space:nowrap;">Voided</span>'
            : isSettledInvoice(inv)
              ? '<span style="font-size:10px;color:#15803d;font-weight:700;white-space:nowrap;">Included</span>'
              : '<span style="font-size:10px;color:#a16207;font-weight:700;white-space:nowrap;">Outstanding</span>';
          const proofAction = proofUrl
            ? `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;"><button class="crm-mini-action" data-proof-open="${escapeHtml(proofUrl)}" type="button">Preview</button>${canWriteFinance ? `<label class="crm-mini-action" style="cursor:pointer;">Replace<input type="file" data-proof-upload="${invoiceLedger.id}" accept="image/*,.pdf" style="display:none;" /></label>` : ''}</div>`
            : invoiceLedger && canWriteFinance
              ? `<label class="crm-mini-action" style="cursor:pointer;white-space:nowrap;">+ Proof<input type="file" data-proof-upload="${invoiceLedger.id}" accept="image/*,.pdf" style="display:none;" /></label>`
              : '<span style="font-size:10px;color:#94a3b8;">Optional</span>';
          return `<tr class="acc-tbl-row">
          <td style="font-weight:700;color:#0f766e;">${escapeHtml(inv.invoice_number || '—')}</td>
          <td>${escapeHtml(inv.customer_name || '—')}</td>
          <td style="font-size:12px;color:#64748b;">${fmtDate(inv.invoice_date || inv.created_at)}</td>
          <td style="font-size:12px;color:${invoiceEffectiveStatus(inv) === 'overdue' ? '#dc2626' : '#64748b'}">${fmtDate(inv.due_date)}</td>
          <td style="font-weight:700;">${fmtINR(invoiceTotal(inv))}</td>
          <td style="font-weight:700;color:#16a34a;">${fmtINR(invoicePaidAmount(inv))}</td>
          <td style="font-weight:700;color:${invoiceBalance(inv) > 0 ? '#d97706' : '#16a34a'};">${fmtINR(invoiceBalance(inv))}</td>
          <td>${sBadge(invoiceEffectiveStatus(inv))}</td>
          <td style="font-size:12px;">${inv.is_recurring ? '<span class="finance-recurring-badge">Recurring</span>' : '—'}</td>
          <td>${incomeState}</td>
          <td>${proofAction}</td>
          <td><div style="display:flex;gap:4px;align-items:center;">
            <button class="crm-button" data-invoice-view="${inv.id}" type="button" title="Preview Invoice" aria-label="Preview Invoice" style="padding:4px 7px;">View</button>
            <button class="crm-button primary" data-load-invoice="${inv.id}" type="button" title="Edit Invoice" aria-label="Edit Invoice" style="padding:4px 7px;display:inline-flex;align-items:center;justify-content:center;line-height:1;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
            <button class="crm-button" data-del-invoice="${inv.id}" type="button" title="Delete Invoice" aria-label="Delete Invoice" style="padding:4px 7px;display:inline-flex;align-items:center;justify-content:center;line-height:1;color:#dc2626;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div></td>
        </tr>`;
        }).join('')}
        </tbody></table></div>`}
    </div>`;

    // ── REPORTS TAB ──
    const monthMap2 = {};
    [...collectedIncome, ...settledExpenses].forEach(r => {
      const mk = (r.transaction_date || '').slice(0, 7);
      if (!mk || mk.length < 7) return;
      if (!monthMap2[mk]) monthMap2[mk] = { income: 0, expense: 0 };
      if (isInc(r.transaction_type)) monthMap2[mk].income += Number(r.amount || 0);
      else monthMap2[mk].expense += Number(r.amount || 0);
    });
    const mKeys = Object.keys(monthMap2).sort().slice(-9);
    const maxV = Math.max(...mKeys.flatMap(m => [monthMap2[m].income, monthMap2[m].expense]), 1);
    const barCols = mKeys.map(m => {
      const incH = Math.round((monthMap2[m].income / maxV) * 140);
      const expH = Math.round((monthMap2[m].expense / maxV) * 140);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="display:flex;gap:3px;align-items:flex-end;height:140px;">
          <div style="width:12px;height:${incH || 2}px;background:#22f25a;border-radius:3px 3px 0 0;" title="Income: ${fmtINR(monthMap2[m].income)}"></div>
          <div style="width:12px;height:${expH || 2}px;background:#b69df8;border-radius:3px 3px 0 0;" title="Expenses: ${fmtINR(monthMap2[m].expense)}"></div>
        </div>
        <span style="font-size:9px;color:#94a3b8;">${new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' })}</span>
      </div>`;
    }).join('');
    const perfRows = [...mKeys].reverse().slice(0, 6).map(m => {
      const d = monthMap2[m], profit = d.income - d.expense;
      const margin = d.income > 0 ? ((profit / d.income) * 100).toFixed(1) : '0.0';
      return `<tr>
        <td style="font-size:12px;">${new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
        <td style="color:#16a34a;font-weight:600;">${fmtINR(d.income)}</td>
        <td style="color:#dc2626;font-weight:600;">${fmtINR(d.expense)}</td>
        <td style="color:${profit >= 0 ? '#16a34a' : '#dc2626'};font-weight:700;">${profit >= 0 ? '+' : ''}${fmtINR(profit)}</td>
        <td style="font-weight:600;">${margin}%</td>
      </tr>`;
    }).join('');
    const salAmt = salaries;
    const totalAll = Math.max(income + operatingExpenses + salAmt, 1);
    const net = availableBalance;
    const target = Math.max(net * 1.4, income * 0.5, 500000);
    const pct = Math.min(Math.max(Math.round((net / target) * 100), 0), 100);
    const donutArcs = (() => {
      const circ = 2 * Math.PI * 15.9155;
      let off = 25;
      return [{ c: '#22f25a', v: income }, { c: '#b69df8', v: operatingExpenses }, { c: '#1e293b', v: salAmt }].map(({ c, v }) => {
        const dash = (v / totalAll) * circ;
        const arc = `<circle cx="18" cy="18" r="15.9155" fill="none" stroke="${c}" stroke-width="3.5" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${off}" transform="rotate(-90 18 18)"/>`;
        off -= dash;
        return arc;
      }).join('');
    })();
    const reportsTab = `<div class="finance-tab-stack finance-reports-stack" style="display:flex;flex-direction:column;gap:18px;">
      ${financialPulse}
      <div class="acc-reports-workspace">
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="crm-card" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
            <div><div style="font-size:15px;font-weight:800;color:#1e293b;">Income vs Expenses</div><div style="font-size:12px;color:#94a3b8;margin-top:2px;">Monthly income comparison</div></div>
            <div style="display:flex;gap:12px;">
              <span style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#22f25a;display:inline-block;"></span>Income</span>
              <span style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#b69df8;display:inline-block;"></span>Expenses</span>
            </div>
          </div>
          ${mKeys.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:140px;padding:0 4px;">${barCols}</div>` : `<p style="font-size:13px;color:#94a3b8;text-align:center;padding:40px 0;">No transaction data yet.</p>`}
        </div>
        <div class="crm-card" style="padding:20px;">
          <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:14px;">Monthly Performance</div>
          <table class="acc-tbl"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net Profit</th><th>Margin</th></tr></thead><tbody>
            ${perfRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No data available</td></tr>`}
          </tbody></table>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="crm-card" style="padding:20px;">
          <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:14px;">Spending Breakdown</div>
          <svg viewBox="0 0 36 36" width="120" height="120" style="display:block;margin:0 auto 14px;">
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" stroke-width="3.5"/>
            ${donutArcs}
            <text x="18" y="16" text-anchor="middle" font-size="5" font-weight="800" fill="#1e293b">${Math.round((income / totalAll) * 100)}%</text>
            <text x="18" y="21" text-anchor="middle" font-size="2.5" fill="#94a3b8">Income</text>
          </svg>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${[{ c: '#22f25a', l: 'Revenue', v: income }, { c: '#b69df8', l: 'Expenses', v: operatingExpenses }, { c: '#1e293b', l: 'Salaries', v: salAmt }].map(d => `<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;"><div style="display:flex;align-items:center;gap:6px;"><div style="width:8px;height:8px;border-radius:50%;background:${d.c};flex-shrink:0;"></div>${d.l}</div><strong style="font-size:12px;">${fmtINR(d.v)}</strong></div>`).join('')}
          </div>
        </div>
        <div style="background:#111;border-radius:14px;padding:20px;color:#fff;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Annual Savings Target</div>
          <div style="font-size:22px;font-weight:800;margin-bottom:12px;">${fmtINR(target)}</div>
          <div style="height:8px;background:#1e2a1e;border-radius:4px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;background:#22f25a;border-radius:4px;width:${pct}%;transition:width .5s;"></div></div>
          <div style="font-size:11px;color:#555;margin-bottom:16px;">You have reached ${pct}% of your annual goal.</div>
          <div style="display:flex;gap:8px;">
            <button class="crm-button" data-export="finance" type="button" style="flex:1;font-size:12px;"><span class="finance-button-icon">${crmProjectIcon('reports')}</span> Export CSV</button>
            <button class="crm-button" data-export-pdf="finance" type="button" style="flex:1;font-size:12px;"><span class="finance-button-icon">${crmProjectIcon('reports')}</span> PDF</button>
          </div>
        </div>
      </div>
      </div>
    </div>`;

    const tabDefs = [['overview', 'Overview'], ['transactions', 'Transactions'], ['invoices', 'Invoices'], ['reports', 'Reports']];
    const tabContent = accTab === 'overview' ? overviewTab : accTab === 'transactions' ? transactionsTab : accTab === 'invoices' ? invoicesTab : reportsTab;

    bodyContent = `
    <div class="acc-tab-nav" role="tablist" aria-label="Finance views">
      ${tabDefs.map(([k, l]) => `<button class="acc-tab-btn${accTab === k ? ' active' : ''}" data-acc-tab="${k}" type="button" role="tab" aria-selected="${accTab === k}">${l}</button>`).join('')}
    </div>
    <div id="acc-tab-content" role="tabpanel" aria-live="polite">${tabContent}</div>`;
  }

  replaceSafeMarkup(els.view, `
    ${pageHead('Financial Management', subtitles, tabActions)}
    ${isBuilder ? financeSheetTabs() : ''}
    ${bodyContent}`);

  els.view.querySelectorAll('.acc-tbl').forEach((table) => {
    const labels = [...table.querySelectorAll('thead th')].map((cell) => cell.textContent.trim());
    table.querySelectorAll('tbody tr').forEach((row) => {
      row.querySelectorAll('td').forEach((cell, index) => {
        cell.dataset.label = labels[index] || '';
      });
    });
  });

  if (!canWriteFinance) {
    els.view.querySelectorAll('[data-load-invoice], [data-del-invoice]').forEach((element) => { element.style.display = 'none'; });
  }

  if (isBuilder) {
    initInvoiceBuilder();
  } else {
    initAccounting();
    loadAutoProofPreviews(els.view);
  }
}

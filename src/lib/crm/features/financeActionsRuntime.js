/* Finance and invoice interactions dispatched from the CRM root. */

export function createFinanceActionsRuntime(context) {
  const {
    state,
    render,
    renderFinance,
    bindActions,
    showInvoice,
    printInvoiceMarkup,
    getInvoicePrintName,
    showToast,
    openProofInNewTab,
    openProofPreview,
    printFinancePdf,
    portal,
    upsertFinanceRecord,
    inlineFinanceRowKey,
    inlineFinancePayload,
    scheduleInlineFinanceSave = () => {},
    validateLedgerInput = () => {},
    saveInlineFinanceRow,
    confirmAction = (message) => globalThis.confirm?.(message) ?? false,
    removeCachedWorkspaceRecord,
    storage = globalThis.sessionStorage,
    crmCacheKey,
    loadData,
    toast,
    documentRef = globalThis.document,
    clearTimeoutFn = globalThis.clearTimeout,
  } = context;

  function handleInput(element, { isSurface = () => true } = {}) {
    const inlineField = element?.closest?.('[data-inline-field]');
    if (inlineField && isSurface(inlineField)) {
      scheduleInlineFinanceSave(inlineField.closest('[data-inline-finance-row]'));
      return true;
    }
    if (element?.matches?.('#acc-tx-search')) {
      state.accSearch = element.value;
      state.accTxPage = 1;
      renderFinance();
      return true;
    }
    if (!element?.matches?.('#finance-search')) return false;
    state.search = element.value;
    renderFinance();
    return true;
  }

  function handleBlur(element, { isSurface = () => true } = {}) {
    if (!element?.matches?.('[data-row-id] [data-field], [data-row-id][data-field]') || !isSurface(element)) return false;
    validateLedgerInput(element);
    return true;
  }

  function handleChange(element) {
    if (element?.matches?.('#finance-status-filter')) state.financeStatusFilter = element.value;
    else if (element?.matches?.('#finance-proof-filter')) state.financeProofFilter = element.value;
    else return false;
    renderFinance();
    return true;
  }

  async function handleInvoiceActions(element) {
    if (element.matches('#finance-edit-toggle')) {
      state.financeEditMode = !state.financeEditMode;
      renderFinance();
      return true;
    }
    if (element.matches('#inv-cancel-btn')) {
      state.invoiceBuilderActive = false;
      state.invoiceBuilderId = null;
      renderFinance();
      return true;
    }
    if (element.matches('#inv-print-btn')) {
      const markup = documentRef.getElementById('inv-preview-container')?.innerHTML || '';
      if (!markup) showToast('Invoice preview is not ready yet.', 'error');
      else await printInvoiceMarkup(markup, getInvoicePrintName(documentRef.getElementById('inv-number')?.value || 'invoice'));
      return true;
    }
    if (element.matches('#finance-filter-reset')) {
      state.search = '';
      state.financeStatusFilter = '';
      state.financeProofFilter = 'all';
      renderFinance();
      return true;
    }
    if (element.matches('[data-invoice-view]')) {
      await showInvoice(element.dataset.invoiceView);
      return true;
    }
    if (element.matches('[data-load-invoice]')) {
      state.financeSheet = 'invoices';
      state.accTab = 'invoices';
      state.invoiceBuilderActive = true;
      state.invoiceBuilderId = element.dataset.loadInvoice;
      renderFinance();
      return true;
    }
    return false;
  }

  async function handleLedgerActions(element, event) {
    if (element.matches('[data-acc-tab]')) {
      state.accTab = element.dataset.accTab;
      state.accSelectedId = null;
      renderFinance();
      return true;
    }
    if (element.matches('[data-acc-subtab]')) {
      state.accSubTab = element.dataset.accSubtab;
      state.accTxPage = 1;
      renderFinance();
      return true;
    }
    if (element.matches('.acc-tbl-row[data-row-id]')) {
      if (event.target?.closest?.('button,input,select,textarea,a')) return true;
      if (element.dataset.recordKind !== 'invoice') {
        state.accSelectedId = element.dataset.rowId;
        renderFinance();
        return true;
      }
    }
    if (element.matches('.acc-proof-btn[data-proof]')) {
      event.stopPropagation();
      if (element.dataset.id) {
        state.accSelectedId = element.dataset.id;
        renderFinance();
      } else {
        await openProofInNewTab(element.dataset.proof);
      }
      return true;
    }
    if (element.matches('[data-resolve-finance]')) return resolveFinance(element, event);
    if (element.matches('[data-acc-pg]')) {
      state.accTxPage = Number(element.dataset.accPg);
      renderFinance();
      return true;
    }
    if (element.matches('[data-add-inline-finance], [data-add-invoice-finance]')) {
      state.accInlineFinanceId = 'new';
      state.accInlineFinanceType = element.matches('[data-add-invoice-finance]') ? 'invoice' : null;
      renderFinance();
      documentRef.querySelector('[data-inline-field="title"]')?.focus();
      return true;
    }
    if (element.matches('[data-cancel-inline-finance]')) return cancelInlineFinance(element);
    if (element.matches('[data-edit-finance]')) {
      event.stopPropagation();
      state.accInlineFinanceId = element.dataset.editFinance;
      renderFinance();
      return true;
    }
    if (element.matches('[data-del-finance], [data-del-invoice]')) return deleteFinanceRecord(element, event);
    return false;
  }

  async function resolveFinance(element, event) {
    event.stopPropagation();
    const record = state.data.finances.find((item) => String(item.id) === String(element.dataset.resolveFinance));
    if (!record) return true;
    const nextStatus = ['income', 'revenue'].includes(record.transaction_type) ? 'received' : 'paid';
    element.disabled = true;
    element.textContent = 'Updating…';
    try {
      const response = await portal(`/api/portal/finances/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (response.item) upsertFinanceRecord(response.item);
      state.accSelectedId = String(record.id);
      toast(`Finance record marked ${nextStatus}.`);
      renderFinance();
    } catch (error) {
      element.disabled = false;
      element.textContent = `Mark ${nextStatus === 'received' ? 'Received' : 'Paid'}`;
      toast(error instanceof Error ? error.message : 'Could not update finance status');
    }
    return true;
  }

  async function cancelInlineFinance(element) {
    const row = element.closest('[data-inline-finance-row]');
    if (row?.dataset.inlineSaving === 'true') {
      toast('Still saving this finance record.');
      return true;
    }
    if (row) {
      clearTimeoutFn(state.saveTimers.get(inlineFinanceRowKey(row)));
      const payload = inlineFinancePayload(row);
      const hasRequiredFields = Boolean(String(payload.title || '').trim())
        && payload.amount !== undefined
        && payload.amount !== null
        && String(payload.amount).trim() !== '';
      if (hasRequiredFields) await saveInlineFinanceRow(row);
    }
    state.accInlineFinanceId = null;
    state.accInlineFinanceType = null;
    render();
    return true;
  }

  async function deleteFinanceRecord(element, event) {
    event.stopPropagation();
    const isInvoice = element.matches('[data-del-invoice]');
    const id = isInvoice ? element.dataset.delInvoice : element.dataset.delFinance;
    if (!confirmAction(isInvoice ? 'Delete invoice?' : 'Delete this record?')) return true;
    try {
      await portal(`/api/portal/${isInvoice ? 'invoices' : 'finances'}/${id}`, { method: 'DELETE' });
      const key = isInvoice ? 'invoices' : 'finances';
      removeCachedWorkspaceRecord(state, key, id, { storage, key: crmCacheKey('data') });
      if (state.accSelectedId === id) state.accSelectedId = null;
      await loadData({ skipCache: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Delete failed.');
    }
    return true;
  }

  async function handleFinanceUtilities(element) {
    if (element.matches('[data-export-pdf]') && element.dataset.exportPdf === 'finance') {
      await printFinancePdf();
      return true;
    }
    if (element.matches('[data-proof-open]')) {
      await openProofPreview(element.dataset.proofOpen);
      return true;
    }
    if (element.matches('[data-proof-link]')) {
      await openProofInNewTab(element.dataset.proofLink);
      return true;
    }
    if (element.matches('[data-finance-quick-filter]')) {
      const type = element.dataset.financeQuickFilter;
      if (type === 'status-clear') state.financeStatusFilter = '';
      if (type === 'proof-clear') state.financeProofFilter = 'all';
      if (type === 'search-clear') state.search = '';
      renderFinance();
      bindActions();
      return true;
    }
    if (element.matches('[data-finance-density]')) {
      state.financeDensity = element.dataset.financeDensity || 'comfortable';
      renderFinance();
      bindActions();
      return true;
    }
    if (element.matches('[data-finance-sheet]')) {
      state.financeSheet = element.dataset.financeSheet;
      state.invoiceBuilderActive = false;
      state.invoiceBuilderId = null;
      renderFinance();
      bindActions();
      return true;
    }
    return false;
  }

  async function handleClick(element, event) {
    if (await handleInvoiceActions(element)) return true;
    if (await handleLedgerActions(element, event)) return true;
    return handleFinanceUtilities(element);
  }

  return { handleClick, handleInput, handleBlur, handleChange };
}

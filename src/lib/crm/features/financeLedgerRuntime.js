/* Finance ledger validation, row persistence, and inline autosave runtime. */

export function createFinanceLedgerRuntime({
  state,
  portal,
  toast,
  render,
  bindActions,
  normalizePayload,
  validateWorkspacePayload,
  crmCacheKey,
  initAccountingFeature,
  expenseRows,
  incomeRows,
}) {
      function ledgerStateKey(resource, id) {
        return `${resource}:${id}`;
      }

      function setLedgerState(resource, id, status) {
        const key = ledgerStateKey(resource, id);
        if (!status || status === 'idle') state.rowSaveStates.delete(key);
        else state.rowSaveStates.set(key, status);
      }

      function ledgerState(resource, id) {
        return state.rowSaveStates.get(ledgerStateKey(resource, id)) || 'idle';
      }




      function ledgerFieldError(row, input) {
        const field = input.dataset.field;
        const value = String(input.value || '').trim();
        const resource = row.dataset.resource;
        if (resource === 'finances') {
          if (field === 'transaction_date' && !value) return 'Date is required.';
          if (field === 'amount' && (value === '' || Number(value) < 0 || Number.isNaN(Number(value)))) return 'Amount must be 0 or more.';
          if (state.financeSheet === 'salary' && field === 'title' && !value) return 'Employee name is required.';
        }
        if (resource === 'invoices') {
          if (['invoice_date', 'invoice_number', 'customer_name', 'service_title'].includes(field) && !value) return 'This field is required.';
        }
        return '';
      }

      function validateLedgerInput(input) {
        const row = input.closest('[data-row-id]');
        if (!row || !['finances', 'invoices'].includes(row.dataset.resource || '')) return true;
        const message = ledgerFieldError(row, input);
        input.classList.toggle('crm-cell-invalid', Boolean(message));
        if (message) input.setAttribute('title', message);
        else input.removeAttribute('title');
        return !message;
      }

      function validateLedgerRow(row) {
        if (!row || !['finances', 'invoices'].includes(row.dataset.resource || '')) return true;
        const inputs = Array.from(row.querySelectorAll('[data-field]'));
        const valid = inputs.every((input) => validateLedgerInput(input));
        if (!valid) {
          setLedgerState(row.dataset.resource, row.dataset.rowId, 'invalid');
          applyLedgerStateToRow(row, 'invalid');
        }
        return valid;
      }

      function moveLedgerFocus(current, step) {
        const cells = Array.from(document.querySelectorAll('.crm-table--ledger [data-field]'));
        const index = cells.indexOf(current);
        if (index === -1) return;
        const target = cells[index + step];
        if (target) {
          target.focus();
          if (target.select) target.select();
        }
      }


      function applyLedgerStateToRow(row, status) {
        if (!row) return;
        row.classList.remove('crm-ledger-row--dirty', 'crm-ledger-row--saving', 'crm-ledger-row--saved', 'crm-ledger-row--invalid');
        if (status && status !== 'idle') row.classList.add(`crm-ledger-row--${status}`);
        const indicator = row.querySelector(`[data-ledger-state="${row.dataset.resource}:${row.dataset.rowId}"]`);
        if (!indicator) return;
        indicator.className = 'crm-ledger-state';
        if (!state.financeEditMode) {
          indicator.classList.add('crm-ledger-state--locked');
          indicator.textContent = 'Locked';
          return;
        }
        if (status === 'dirty') {
          indicator.classList.add('crm-ledger-state--dirty');
          indicator.textContent = 'Pending';
        } else if (status === 'saving') {
          indicator.classList.add('crm-ledger-state--saving');
          indicator.textContent = 'Saving';
        } else if (status === 'saved') {
          indicator.classList.add('crm-ledger-state--saved');
          indicator.textContent = 'Saved';
        } else if (status === 'invalid') {
          indicator.classList.add('crm-ledger-state--invalid');
          indicator.textContent = 'Fix row';
        } else {
          indicator.textContent = 'Ready';
        }
      }




      function inlineFinanceRowKey(row) {
        return `inline-finance:${row.dataset.inlineFinanceId || 'new'}`;
      }

      function inlineFinancePayload(row) {
        const raw = Object.fromEntries(Array.from(row.querySelectorAll('[data-inline-field]')).map((field) => [field.dataset.inlineField, field.value]));
        return normalizePayload('finances', { ...raw, source: 'manual' });
      }

      function setInlineFinanceState(row, stateName, message) {
        const indicator = row?.querySelector('[data-inline-save-state]');
        if (!indicator) return;
        indicator.className = `acc-inline-save-state acc-inline-save-state--${stateName}`;
        indicator.textContent = message;
      }

      function upsertFinanceRecord(record) {
        const index = state.data.finances.findIndex((item) => String(item.id) === String(record.id));
        if (index === -1) state.data.finances.unshift(record);
        else state.data.finances[index] = { ...state.data.finances[index], ...record };
        try {
          sessionStorage.setItem(crmCacheKey('data'), JSON.stringify(state.data));
        } catch (error) {
          console.warn('Finance cache write failed:', error);
        }
      }

      function upsertInvoiceRecord(record) {
        if (!record?.id) return;
        const index = state.data.invoices.findIndex((item) => String(item.id) === String(record.id));
        if (index === -1) state.data.invoices.unshift(record);
        else state.data.invoices[index] = { ...state.data.invoices[index], ...record };
        try {
          sessionStorage.setItem(crmCacheKey('data'), JSON.stringify(state.data));
        } catch (error) {
          console.warn('Invoice cache write failed:', error);
        }
      }

      function scheduleInlineFinanceSave(row) {
        if (!row) return;
        const key = inlineFinanceRowKey(row);
        clearTimeout(state.saveTimers.get(key));
        if (row.dataset.inlineSaving === 'true') row.dataset.inlineSaveQueued = 'true';
        const payload = inlineFinancePayload(row);
        const hasDescription = Boolean(String(payload.title || '').trim());
        const hasAmount = payload.amount !== undefined && payload.amount !== null && String(payload.amount).trim() !== '';
        if (!hasDescription || !hasAmount) {
          setInlineFinanceState(row, 'draft', 'Draft · complete required fields');
          return;
        }
        setInlineFinanceState(row, 'dirty', 'Changes pending');
        state.saveTimers.set(key, setTimeout(() => saveInlineFinanceRow(row), 700));
      }

      async function saveInlineFinanceRow(row) {
        if (!row?.isConnected) return;
        if (row.dataset.inlineSaving === 'true') {
          row.dataset.inlineSaveQueued = 'true';
          return;
        }
        const body = inlineFinancePayload(row);
        const validationError = validateWorkspacePayload('finances', body);
        if (validationError) {
          setInlineFinanceState(row, 'error', validationError);
          return;
        }
        const id = row.dataset.inlineFinanceId;
        row.dataset.inlineSaving = 'true';
        setInlineFinanceState(row, 'saving', 'Saving…');
        try {
          const response = await portal(id ? `/api/portal/finances/${id}` : '/api/portal/finances', {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify(body),
          });
          const savedRecord = response.item || { ...body, id };
          if (!savedRecord.id) throw new Error('Finance record was not returned after saving.');
          upsertFinanceRecord(savedRecord);
          if (!id) {
            state.accInlineFinanceId = String(savedRecord.id);
            render();
            const renderedRow = document.querySelector(`[data-inline-finance-id="${savedRecord.id}"]`);
            setInlineFinanceState(renderedRow, 'saved', 'Saved · auto-save on');
          } else {
            setInlineFinanceState(row, 'saved', 'Saved just now');
          }
        } catch (error) {
          setInlineFinanceState(row, 'error', error instanceof Error ? error.message : 'Save failed');
          toast(error instanceof Error ? error.message : 'Could not save transaction');
        } finally {
          delete row.dataset.inlineSaving;
          if (row.dataset.inlineSaveQueued === 'true') {
            delete row.dataset.inlineSaveQueued;
            scheduleInlineFinanceSave(row);
          }
        }
      }

      function initAccounting() {
        return initAccountingFeature({ bindActions, expenseRows, incomeRows });
      }



      function rowPayload(row, resource) {
        const body = {};
        const fields = row.matches?.('[data-field]') ? [row] : Array.from(row.querySelectorAll('[data-field]'));
        fields.forEach((input) => { body[input.dataset.field] = input.value; });
        return normalizePayload(resource, body);
      }

      function scheduleSave(input) {
        const row = input.closest('[data-row-id]');
        if (!row) return;
        if (!validateLedgerInput(input) || !validateLedgerRow(row)) return;
        row.classList.add('crm-dirty');
        setLedgerState(row.dataset.resource, row.dataset.rowId, 'dirty');
        applyLedgerStateToRow(row, 'dirty');
        const key = `${row.dataset.resource}:${row.dataset.rowId}`;
        clearTimeout(state.saveTimers.get(key));
        state.saveTimers.set(key, setTimeout(() => saveRow(row), 850));
      }

      async function saveRow(row) {
        const body = rowPayload(row, row.dataset.resource);
        if (!Object.keys(body).length) return;
        setLedgerState(row.dataset.resource, row.dataset.rowId, 'saving');
        applyLedgerStateToRow(row, 'saving');
        try {
          await portal(`/api/portal/${row.dataset.resource}/${row.dataset.rowId}`, { method: 'PATCH', body: JSON.stringify(body) });
          row.classList.remove('crm-dirty');
          setLedgerState(row.dataset.resource, row.dataset.rowId, 'saved');
          applyLedgerStateToRow(row, 'saved');
          setTimeout(() => {
            if (ledgerState(row.dataset.resource, row.dataset.rowId) === 'saved') {
              setLedgerState(row.dataset.resource, row.dataset.rowId, 'idle');
              applyLedgerStateToRow(row, 'idle');
            }
          }, 1400);
          toast('Saved to Supabase');
        } catch (error) {
          setLedgerState(row.dataset.resource, row.dataset.rowId, 'dirty');
          applyLedgerStateToRow(row, 'dirty');
          toast(error instanceof Error ? error.message : 'Save failed');
        }
      }

  return {
    ledgerStateKey,
    setLedgerState,
    ledgerState,
    validateLedgerInput,
    validateLedgerRow,
    moveLedgerFocus,
    applyLedgerStateToRow,
    inlineFinanceRowKey,
    inlineFinancePayload,
    setInlineFinanceState,
    upsertFinanceRecord,
    upsertInvoiceRecord,
    scheduleInlineFinanceSave,
    saveInlineFinanceRow,
    initAccounting,
    rowPayload,
    scheduleSave,
    saveRow,
  };
}

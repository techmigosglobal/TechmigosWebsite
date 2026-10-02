/**
 * Shared record actions used by the company workspace tables.
 *
 * Keeping these actions outside the browser controller makes the mutation,
 * selection, and export contracts reusable by every feature renderer while
 * leaving authorization and Firebase requests at the controller boundary.
 */
export function createRecordActions({
  state,
  els,
  canWrite,
  canUpdate,
  canDelete,
  isCompanyAdmin,
  toast,
  portal,
  loadData,
  findRecord,
  normalizePayload,
}) {
  async function duplicateRecord(resource, id) {
    if (!canWrite(resource)) return toast('You do not have permission to duplicate this record.');
    if (resource === 'profiles' && !isCompanyAdmin()) return toast('Only company admins can duplicate user records.');
    const item = findRecord(resource, id);
    if (!item) return toast('Record not found');
    const body = { ...item };
    ['id', 'created_at', 'updated_at', 'sent_at', 'viewed_at', 'paid_at'].forEach((key) => delete body[key]);
    if (body.name) body.name = `${body.name} Copy`;
    if (body.subject) body.subject = `${body.subject} Copy`;
    if (body.reference_id) body.reference_id = `${body.reference_id}-COPY`;
    if (body.invoice_number) delete body.invoice_number;
    try {
      await portal(`/api/portal/${resource}`, { method: 'POST', body: JSON.stringify(normalizePayload(resource, body)) });
      toast('Duplicated');
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Duplicate failed');
    }
  }

  async function deleteRecord(resource, id) {
    if (!canDelete(resource)) return toast('You do not have permission to delete this record.');
    if (resource === 'profiles' && !isCompanyAdmin()) return toast('Only company admins can delete user records.');
    const label = resource === 'profiles' ? 'user account' : resource.slice(0, -1) || resource;
    if (!id || !confirm(`Permanently delete this ${label}? Sign-in access will be removed and this cannot be undone.`)) return;
    try {
      await portal(`/api/portal/${resource}/${id}`, { method: 'DELETE' });
      toast('Deleted');
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  async function quickPatch(button) {
    if (!canUpdate(button.dataset.quickPatch)) return toast('You do not have permission to update this record.');
    try {
      await portal(`/api/portal/${button.dataset.quickPatch}/${button.dataset.quickId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [button.dataset.quickField]: button.dataset.quickValue }),
      });
      toast('Updated');
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Update failed');
    }
  }

  function selectedRows() {
    return Array.from(document.querySelectorAll('[data-row-select]:checked'))
      .map((input) => input.closest('[data-row-id]'))
      .filter(Boolean);
  }

  function updateSelectionBar() {
    const rows = selectedRows();
    els.selectedCount.textContent = `${rows.length} selected`;
    els.actionbar.classList.toggle('show', rows.length > 0);
    document.querySelectorAll('[data-select-all]').forEach((control) => {
      const table = control.closest('table');
      const checkboxes = Array.from(table?.querySelectorAll('[data-row-select]') || []);
      const checked = checkboxes.filter((input) => input.checked).length;
      control.checked = checkboxes.length > 0 && checked === checkboxes.length;
      control.indeterminate = checked > 0 && checked < checkboxes.length;
      control.disabled = checkboxes.length === 0;
    });
  }

  function clearSelection() {
    document.querySelectorAll('[data-row-select]').forEach((input) => { input.checked = false; });
    updateSelectionBar();
  }

  async function bulkDelete() {
    const rows = selectedRows();
    const profileCount = rows.filter((row) => row.dataset.resource === 'profiles').length;
    const label = profileCount === rows.length ? 'user accounts' : 'selected records';
    if (!rows.length || !confirm(`Permanently delete ${rows.length} selected ${label}? Sign-in access for selected accounts will be removed and this cannot be undone.`)) return;
    if (rows.some((row) => row.dataset.resource === 'profiles') && !isCompanyAdmin()) {
      return toast('Only company admins can bulk delete user records.');
    }
    const failed = [];
    let deleted = 0;
    for (const row of rows) {
      try {
        await portal(`/api/portal/${row.dataset.resource}/${encodeURIComponent(row.dataset.rowId)}`, { method: 'DELETE' });
        deleted += 1;
      } catch (error) {
        failed.push(`${row.dataset.resource}/${row.dataset.rowId}: ${error instanceof Error ? error.message : 'delete failed'}`);
      }
    }
    clearSelection();
    await loadData({ skipCache: true });
    if (failed.length) {
      toast(`${deleted} deleted; ${failed.length} failed. ${failed[0]}`);
    } else {
      toast(`Deleted ${deleted} records`);
    }
  }

  function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function bulkExport() {
    const rows = selectedRows().map((row) => findRecord(row.dataset.resource, row.dataset.rowId)).filter(Boolean);
    if (!rows.length) return;
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
      .filter((key) => !String(key).endsWith('_at'));
    const csv = [
      keys.join(','),
      ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    downloadCsv(csv, 'techmigos-selected-records.csv');
  }

  function exportRows(kind) {
    const configs = {
      projects: { rows: state.data.projects, keys: ['external_project_id', 'name', 'client_name', 'project_manager', 'status', 'budget', 'progress'] },
      finance: { rows: state.data.finances, keys: ['transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'status', 'amount'] },
      finances: { rows: state.data.finances, keys: ['transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'status', 'amount'] },
      tickets: { rows: state.data.tickets, keys: ['id', 'subject', 'client_id', 'project_id', 'priority', 'assigned_to', 'status'] },
      clients: { rows: state.data.clients, keys: ['name', 'company', 'email', 'phone', 'status'] },
      employees: { rows: state.data.profiles.filter((profile) => profile.role !== 'client'), keys: ['name', 'email', 'role', 'status'] },
      users: { rows: state.data.profiles, keys: ['name', 'email', 'role', 'status', 'client_id'] },
    };
    const config = configs[kind] || configs.finance;
    const csv = [
      config.keys.join(','),
      ...config.rows.map((row) => config.keys.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    downloadCsv(csv, `techmigos-${kind}.csv`);
  }

  return {
    duplicateRecord,
    deleteRecord,
    quickPatch,
    selectedRows,
    updateSelectionBar,
    clearSelection,
    bulkDelete,
    bulkExport,
    exportRows,
    downloadCsv,
  };
}

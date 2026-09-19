import { companyRouteEntries } from '../routePolicy.js';
import {
  canDelete as canDeleteResourceRole,
  canUpdate as canUpdateResourceRole,
  canWrite as canWriteResourceRole,
} from '../permissions.js';
import {
  expenseRows as selectExpenseRows,
  incomeRows as selectIncomeRows,
  invoiceLedgerEntryRows as selectInvoiceLedgerEntryRows,
  normalizedStatus,
  outstandingExpenseAmount as selectOutstandingExpenseAmount,
  outstandingExpenseRows as selectOutstandingExpenseRows,
  outstandingInvoiceAmount as selectOutstandingInvoiceAmount,
  outstandingInvoiceRows as selectOutstandingInvoiceRows,
} from '../finance.js';

/**
 * Runtime context shared by the active CRM shell and feature renderers.
 * This keeps browser/session plumbing out of individual resource renderers.
 */
export function createWorkspaceContext({
  state,
  els,
  findClientName,
  findProjectName,
  filterWorkspaceRows,
  renderRowActions,
  workspaceRoleLabel,
  invoiceBranding,
}) {
  function proofIconMarkup(kind = 'file', size = 18) {
    const paths = {
      file: '<path d="M6 2.75h7l5 5V21.25H6z"></path><path d="M13 2.75v5h5"></path><path d="M9 12h6"></path><path d="M9 16h6"></path>',
      paperclip: '<path d="m8.5 12.5 5.8-5.8a3.18 3.18 0 0 1 4.5 4.5l-7.6 7.6a5 5 0 0 1-7.1-7.1l7.6-7.6a1.9 1.9 0 0 1 2.7 2.7l-7.2 7.2a.65.65 0 0 0 .9.9l6.5-6.5"></path>',
      upload: '<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>',
      pending: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3 2"></path>',
    };
    return `<svg class="acc-proof-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.file}</svg>`;
  }

  function outstandingInvoiceRows(invoices = state.data.invoices, finances = state.data.finances) {
    return selectOutstandingInvoiceRows(invoices, finances);
  }

  function outstandingInvoiceAmount(invoices = state.data.invoices, finances = state.data.finances) {
    return selectOutstandingInvoiceAmount(invoices, finances);
  }

  function outstandingExpenseRows(finances = state.data.finances) {
    return selectOutstandingExpenseRows(finances);
  }

  function outstandingExpenseAmount(finances = state.data.finances) {
    return selectOutstandingExpenseAmount(finances);
  }

  function invoicePaymentProfile(invoice = null) {
    const branding = invoiceBranding(invoice);
    const configuredId = branding.upi_id || branding.upiId || state.invoiceSettings?.upi_id || state.invoiceSettings?.upiId || '';
    const configuredMerchant = branding.upi_merchant_name || branding.upiMerchantName || state.invoiceSettings?.upi_merchant_name || state.invoiceSettings?.upiMerchantName || state.companySettings?.company_name || 'TechMigos';
    return {
      id: String(configuredId).trim(),
      merchant: String(configuredMerchant).trim() || 'TechMigos',
    };
  }

  function invoiceLedgerRecord(invoice, finances = state.data.finances) {
    const invoiceId = String(invoice?.id || '');
    if (!invoiceId) return null;
    return finances.find((item) => normalizedStatus(item.transaction_type) === 'invoice' && String(item.invoice_id || '') === invoiceId) || null;
  }

  function invoiceLedgerEntryRows(finances = state.data.finances) {
    return selectInvoiceLedgerEntryRows(finances);
  }

  function clientName(id) {
    return findClientName(state.data.clients, id);
  }

  function projectName(id) {
    return findProjectName(state.data.projects, id);
  }

  function incomeRows(finances = state.data.finances, invoices = state.data.invoices) {
    return selectIncomeRows(finances, invoices, { clientName, projectName });
  }

  function expenseRows(finances = state.data.finances) {
    return selectExpenseRows(finances);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function showToast(message) {
    toast(message);
  }

  function setStatus(message, tone = 'neutral') {
    els.status.textContent = message;
    els.status.style.color = tone === 'error' ? 'var(--crm-red)' : tone === 'success' ? 'var(--crm-green)' : '#667599';
    let retry = document.getElementById('crm-retry-load');
    if (tone === 'error') {
      if (!retry) {
        retry = document.createElement('button');
        retry.id = 'crm-retry-load';
        retry.type = 'button';
        retry.className = 'crm-button';
        retry.textContent = 'Retry';
        els.status.insertAdjacentElement('afterend', retry);
      }
      retry.style.display = 'inline-flex';
    } else if (retry) {
      retry.style.display = 'none';
    }
  }

  function isCompanyAdmin() {
    return state.profile?.role === 'company_admin';
  }

  function canWrite(resource) {
    return canWriteResourceRole(state.profile?.role, resource);
  }

  function isEmployee() {
    return state.profile?.role === 'company_member';
  }

  function canUpdate(resource) {
    return canUpdateResourceRole(state.profile?.role, resource);
  }

  function canDelete(resource) {
    return canDeleteResourceRole(state.profile?.role, resource);
  }

  async function portal(path, options = {}) {
    if (globalThis.window?.tmCrmReady) await globalThis.window.tmCrmReady;
    if (globalThis.window?.tmCrm?.repository) return globalThis.window.tmCrm.repository.request(path, options);
    throw new Error('Operations repository is unavailable. Please refresh the page.');
  }

  function logout() {
    globalThis.window?.tmCrm?.repository?.clearSession?.();
    const userId = state.cacheUserId || state.profile?.auth_user_id;
    if (userId) {
      Object.keys(globalThis.sessionStorage || {}).filter((key) => key.includes(`_${userId}_`)).forEach((key) => globalThis.sessionStorage.removeItem(key));
      globalThis.sessionStorage?.removeItem(`tm_crm_profile_${userId}`);
    }
    ['tm_crm_profile', 'tm_crm_data'].forEach((key) => globalThis.sessionStorage?.removeItem(key));
    globalThis.window?.tmSupabase?.auth?.signOut?.();
    globalThis.location.href = '/login';
  }

  function filtered(rows, keys) {
    return filterWorkspaceRows(rows, state.search, keys);
  }

  function rowActions(resource, id, options = {}) {
    return renderRowActions(resource, id, options, { canUpdate, canDelete });
  }

  function syncNavVisibility() {
    const visibleRoutes = new Set(companyRouteEntries(state.profile?.role).map((route) => route.key));
    document.querySelectorAll('[data-nav-key]').forEach((link) => {
      const key = link.getAttribute('data-nav-key');
      link.style.display = visibleRoutes.has(key) ? '' : 'none';
    });
    document.querySelectorAll('.crm-nav-group').forEach((group) => {
      const links = [...group.querySelectorAll('[data-nav-key]')];
      group.hidden = links.length > 0 && links.every((link) => link.style.display === 'none');
    });
  }

  function roleLabel(role) {
    return workspaceRoleLabel(role);
  }

  function syncIdentity(profile) {
    const displayName = profile?.name || 'TechMigos';
    const initials = displayName.split(' ').filter(Boolean).map((word) => word[0].toUpperCase()).slice(0, 2).join('');
    const label = roleLabel(profile?.role);
    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    setText('crm-user-name', displayName);
    setText('crm-avatar', initials || 'TM');
    setText('crm-user-role', label);
    setText('crm-sidebar-name', displayName);
    setText('crm-sidebar-avatar', initials || 'TM');
    setText('crm-sidebar-role', label);
  }

  return {
    proofIconMarkup,
    outstandingInvoiceRows,
    outstandingInvoiceAmount,
    outstandingExpenseRows,
    outstandingExpenseAmount,
    invoicePaymentProfile,
    invoiceLedgerRecord,
    invoiceLedgerEntryRows,
    incomeRows,
    expenseRows,
    toast,
    showToast,
    setStatus,
    isCompanyAdmin,
    canWrite,
    isEmployee,
    canUpdate,
    canDelete,
    portal,
    logout,
    clientName,
    projectName,
    filtered,
    rowActions,
    syncNavVisibility,
    syncIdentity,
  };
}

import { replaceSafeMarkup } from '../safeMarkup.js';

/**
 * Administrative and status overlays for the authenticated workspace.
 *
 * These render modal content and coordinate explicit cleanup confirmation;
 * authorization and persistence are injected from the workspace boundary.
 */
export function createOperationsOverlays({
  state,
  els,
  escapeHtml,
  badge,
  compactMoney,
  invoiceBalance,
  invoiceEffectiveStatus,
  nice,
  statusTone,
  canAccessCrmRoute,
  isCompanyAdmin,
  bindActions,
  toast,
  loadData,
  repository,
}) {
  function showCreatedLoginDialog(profile, temporaryPassword) {
    if (!temporaryPassword) return;
    const roleLabel = String(profile.role || 'company_member').replace(/_/g, ' ');
    els.modalTitle.textContent = 'Login Created';
    replaceSafeMarkup(els.modalBody, `<div class="crm-list">
      <div class="crm-list-row"><span>Name</span><strong>${escapeHtml(profile.name || '')}</strong></div>
      <div class="crm-list-row"><span>Email</span><strong>${escapeHtml(profile.email || '')}</strong></div>
      <div class="crm-list-row"><span>Role</span><strong>${escapeHtml(roleLabel)}</strong></div>
      <div class="crm-list-row"><span>Temporary password</span><strong id="generated-login-password" style="font-family:monospace;">${escapeHtml(temporaryPassword)}</strong></div>
    </div>
    <p class="crm-help" style="padding:12px 0 0;">Share this temporary password with the user. They will be asked to change it after first login.</p>
    <div class="crm-toolbar" style="padding:12px 0 0;"><button class="crm-button primary" id="copy-generated-login-password" type="button">Copy password</button><button class="crm-button" id="close-generated-login" type="button">Done</button></div>`);
    els.modal.classList.add('open');
  }

  function openDataReview() {
    const resources = [
      ['clients', 'Clients', state.data.clients, (item) => item.company || item.name || `Client #${item.id}`],
      ['tickets', 'Tickets', state.data.tickets, (item) => `#TIC-${item.id} ${item.subject || 'Untitled ticket'}`],
    ];
    const rows = resources.flatMap(([resource, label, items, describe]) => items.map((item) => `<label class="crm-list-row" style="align-items:flex-start;gap:10px;"><input type="checkbox" name="record" value="${resource}:${item.id}" /><span><strong>${escapeHtml(label)}</strong><br><small>${escapeHtml(describe(item))} · ID ${item.id}</small></span></label>`)).join('');
    els.modalTitle.textContent = 'Review persisted Operations & Management data';
    replaceSafeMarkup(els.modalBody, `<form id="crm-data-review-form" class="grid gap-3"><p class="text-sm text-slate-600">These are real persisted client and ticket records. Select only rows you have confirmed are demo data. Client deletion unlinks related records; ticket deletion removes its messages. This cannot be undone.</p>${rows || '<p class="crm-empty">There are no client or ticket records to review.</p>'}<label class="grid gap-1 text-sm font-bold text-slate-700">Type DELETE to confirm<input class="crm-input" name="confirmation" autocomplete="off" /></label><button class="crm-button danger" type="submit">Delete selected records</button></form>`);
    els.modal.classList.add('open');
  }

  async function submitDataReview(form) {
    const values = new FormData(form);
    const selected = values.getAll('record').map(String);
    if (!selected.length) return toast('Select at least one confirmed demo record.');
    if (String(values.get('confirmation') || '') !== 'DELETE') return toast('Type DELETE to confirm permanent removal.');
    try {
      const records = selected.map((entry) => {
        const [resource, id] = entry.split(':');
        return { resource, id };
      });
      await repository.purgeConfirmedRecords(records, 'Confirmed legacy or demo data review');
      els.modal.classList.remove('open');
      toast(`${selected.length} confirmed record${selected.length === 1 ? '' : 's'} deleted.`);
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete the selected records.');
    }
  }

  function openNotifications() {
    const items = [
      ...state.data.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).slice(0, 4).map((ticket) => ({ title: ticket.subject, meta: `Ticket #TIC-${ticket.id} is ${nice(ticket.status)}`, tone: statusTone(ticket.priority) })),
      ...state.data.invoices.filter((invoice) => invoiceBalance(invoice) > 0 && ['sent', 'overdue'].includes(invoiceEffectiveStatus(invoice))).slice(0, 3).map((invoice) => ({ title: invoice.invoice_number || 'Invoice', meta: `${compactMoney(invoiceBalance(invoice))} ${nice(invoiceEffectiveStatus(invoice))}`, tone: statusTone(invoiceEffectiveStatus(invoice)) })),
    ];
    const financeButton = canAccessCrmRoute(state.profile?.role, 'finance')
      ? '<button class="crm-button" data-jump="finance" type="button">Open Finance</button>'
      : '';
    els.modalTitle.textContent = 'Notifications';
    replaceSafeMarkup(els.modalBody, `<div class="crm-list">${items.map((item) => `<div class="crm-list-row"><span>${escapeHtml(item.title || 'Notification')}</span>${badge(item.meta || 'new', item.tone)}</div>`).join('') || '<p class="p-4 text-sm font-bold text-slate-500">No pending notifications.</p>'}</div><div class="crm-toolbar p-5 pt-0"><button class="crm-button primary" data-jump="tickets" type="button">Open Tickets</button>${financeButton}</div>`);
    els.modal.classList.add('open');
    bindActions();
  }

  function openProfileManagement() {
    const profile = state.profile || {};
    const canEditProfile = isCompanyAdmin();
    els.modalTitle.textContent = 'Profile Management';
    replaceSafeMarkup(els.modalBody, `<form id="crm-profile-form" class="crm-form-grid">
      <label>Name<input name="name" value="${escapeHtml(profile.name || '')}" ${canEditProfile ? '' : 'disabled'} /></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(profile.email || '')}" ${canEditProfile ? '' : 'disabled'} /></label>
      <label>Role<input value="${escapeHtml(profile.role || '')}" disabled /></label>
      <label>Status<input value="${escapeHtml(profile.status || 'active')}" disabled /></label>
      ${canEditProfile ? '<button class="crm-button primary wide" type="submit">Update Profile</button>' : '<p class="crm-help wide">Employee profiles are managed by a company admin.</p>'}
    </form>`);
    els.modal.classList.add('open');
  }

  return {
    showCreatedLoginDialog,
    openDataReview,
    submitDataReview,
    openNotifications,
    openProfileManagement,
  };
}

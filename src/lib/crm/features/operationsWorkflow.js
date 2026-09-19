import { replaceSafeMarkup } from '../safeMarkup.js';

/**
 * Authenticated operations modal workflow.
 *
 * This coordinates form lifecycle and refresh behavior. It deliberately does
 * not own persistence or authorization rules; those are injected from the
 * repository/controller boundary.
 */
export function createOperationsWorkflow({
  state,
  els,
  escapeHtml,
  employeesFromState,
  formMarkup,
  selectOpts,
  projectPayloadFromForm,
  projectMemberIds,
  bindOperationsDrawerSections,
  bindLinkedClientProjectFields,
  bindFinanceProofField,
  bindProfileClientLinkFields,
  portal,
  toast,
  loadData,
  render,
  canWrite,
  isCompanyAdmin,
  isEmployee,
  canUpdate,
  findRecord,
  normalizePayload,
  validateWorkspacePayload,
  generateProfileUsername,
  createTemporaryPassword,
  nice,
  showCreatedLoginDialog,
  openInvoiceCreateIntegrated,
  openInvoiceEditIntegrated,
  repository,
  documentRef = typeof document !== 'undefined' ? document : null,
}) {
  function configureCrmEditForm({ resource, sourceResource = '', mode = 'create', id = '', invite = false, ticketCreate = false, employeeEdit = false } = {}) {
    const form = documentRef?.getElementById('crm-edit-form');
    if (!form) return;
    form.dataset.crmResource = resource;
    form.dataset.crmSourceResource = sourceResource;
    form.dataset.crmFormMode = mode;
    form.dataset.crmFormId = String(id || '');
    form.dataset.crmInvite = invite ? 'true' : 'false';
    form.dataset.crmTicketCreate = ticketCreate ? 'true' : 'false';
    form.dataset.crmEmployeeEdit = employeeEdit ? 'true' : 'false';
  }

  function openTicketCreate() {
    const clientOpts = state.data.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.company || client.name)}</option>`).join('');
    const projectOpts = state.data.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('');
    const employeeOpts = employeesFromState().filter((employee) => employee.status === 'active')
      .map((employee) => `<option value="${escapeHtml(employee.auth_user_id)}">${escapeHtml(employee.name || employee.email)}</option>`).join('');
    els.modalTitle.textContent = 'Create Support Ticket';
    replaceSafeMarkup(els.modalBody, `<form id="crm-edit-form" class="crm-form-grid">
      <label>Client *<select name="client_id" required><option value="">— Select client —</option>${clientOpts}</select></label>
      <label>Project<select name="project_id"><option value="">— None —</option>${projectOpts}</select></label>
      <label>Priority<select name="priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label class="wide">Subject *<input name="subject" required placeholder="Brief description of the issue" /></label>
      <label class="wide">Description<textarea name="description" rows="3" placeholder="Detailed description..."></textarea></label>
      <label>Assigned To<select name="assigned_user_id"><option value="">Unassigned</option>${employeeOpts}</select></label>
      <label>Status<select name="status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="waiting">Waiting</option></select></label>
      <button class="crm-button primary wide" type="submit">Create Ticket</button>
    </form>`);
    els.modal.classList.add('open');
    configureCrmEditForm({ resource: 'tickets', mode: 'create', ticketCreate: true });
  }

  function smartDefaults(resource) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      projects: { status: 'planning', budget: 0, due_date: today },
      tickets: { priority: 'medium', status: 'open' },
      finances: { transaction_date: today, transaction_type: 'expense', status: 'pending', amount: 0, source: 'manual' },
      income: { transaction_date: today, transaction_type: 'income', status: 'received', amount: 0, source: 'manual' },
      expense: { transaction_date: today, transaction_type: 'expense', status: 'paid', amount: 0, source: 'manual' },
      salary: { transaction_date: today, transaction_type: 'salary', status: 'pending', amount: 0, source: 'manual' },
      clients: { status: 'active' },
      profiles: { role: state.userCreateClientId ? 'client' : 'company_member', client_id: state.userCreateClientId || '', status: 'active' },
      ticket_messages: { ticket_id: state.selectedTicketId || '', visibility: 'external' },
    }[resource] || {};
  }

  function openCreate(resource, { invite = false } = {}) {
    const financeSubresource = ['salary', 'income', 'expense'].includes(resource);
    const actualResource = financeSubresource ? 'finances' : resource;
    if (!canWrite(actualResource)) return toast('You do not have permission to create this record.');
    if (resource === 'profiles' && !isCompanyAdmin()) return toast('Only company admins can create new logins.');
    if (resource === 'invoices') return openInvoiceCreateIntegrated();
    if (resource === 'tickets') return openTicketCreate();
    const defaults = smartDefaults(resource);
    const titleMap = { salary: 'Add Salary', income: 'Add Income', expense: 'Add Expense', finances: 'Add Transaction' };
    els.modalTitle.textContent = invite
      ? 'Invite User'
      : actualResource === 'projects'
        ? 'Create / Edit Project'
        : actualResource === 'profiles'
          ? 'Create / Edit User'
          : titleMap[resource] || `Create ${resource.replace(/_/g, ' ')}`;
    const createLabel = invite
      ? 'Send Invitation'
      : actualResource === 'projects'
        ? 'Create Project'
        : actualResource === 'profiles'
          ? 'Create User'
          : titleMap[resource] || 'Create';
    replaceSafeMarkup(els.modalBody, formMarkup(financeSubresource ? resource : actualResource, defaults, createLabel, { invite }));
    els.modal.classList.add('open');
    bindOperationsDrawerSections();
    const form = documentRef?.getElementById('crm-edit-form');
    if (actualResource === 'finances') bindLinkedClientProjectFields(form);
    if (actualResource === 'finances') bindFinanceProofField();
    if (actualResource === 'profiles') bindProfileClientLinkFields(form);
    configureCrmEditForm({ resource: actualResource, sourceResource: financeSubresource ? resource : '', mode: 'create', invite });
  }

  function employeeDeliveryForm(resource, item) {
    const fields = resource === 'projects'
      ? `<label>Status<select name="status">${selectOpts([['planning', 'Planning'], ['active', 'Active'], ['review', 'Review'], ['on_hold', 'On hold'], ['completed', 'Completed']], item.status)}</select></label><label>Health<select name="health">${selectOpts([['on_track', 'On track'], ['watch', 'Watch'], ['at_risk', 'At risk'], ['breached', 'Breached']], item.health)}</select></label><label>Progress %<input name="progress" type="number" min="0" max="100" value="${escapeHtml(item.progress)}" /></label><label class="wide">Delivery summary<textarea name="summary">${escapeHtml(item.summary || '')}</textarea></label><label class="wide">Internal notes<textarea name="notes">${escapeHtml(item.notes || '')}</textarea></label>`
      : `<label>Status<select name="status">${selectOpts([['open', 'Open'], ['in_progress', 'In progress'], ['waiting', 'Waiting'], ['resolved', 'Resolved'], ['closed', 'Closed']], item.status)}</select></label><label>Priority<select name="priority">${selectOpts([['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['urgent', 'Urgent']], item.priority)}</select></label><label class="wide">Work update<textarea name="description">${escapeHtml(item.description || '')}</textarea></label>`;
    return `<form id="crm-edit-form" class="crm-form-grid">${fields}<div class="wide"><button class="crm-button primary" type="submit">Save delivery update</button></div></form>`;
  }

  function openEdit(resource, id) {
    if (!canUpdate(resource)) return toast('You do not have permission to update this record.');
    if (resource === 'profiles' && !isCompanyAdmin()) return toast('Only company admins can update user roles and access.');
    if (resource === 'invoices') return openInvoiceEditIntegrated(id);
    const item = findRecord(resource, id);
    if (!item) return toast('Record not found');
    els.modalTitle.textContent = resource === 'projects' ? 'Create / Edit Project' : resource === 'profiles' ? 'Create / Edit User' : `Edit ${resource.replace(/_/g, ' ')}`;
    const employeeEdit = isEmployee() && ['projects', 'tickets'].includes(resource);
    replaceSafeMarkup(els.modalBody, employeeEdit ? employeeDeliveryForm(resource, item) : formMarkup(resource, item, 'Save Changes'));
    els.modal.classList.add('open');
    bindOperationsDrawerSections();
    const form = documentRef?.getElementById('crm-edit-form');
    if (resource === 'finances') bindLinkedClientProjectFields(form);
    if (resource === 'finances') bindFinanceProofField();
    if (resource === 'profiles') bindProfileClientLinkFields(form);
    configureCrmEditForm({ resource, mode: 'edit', id, employeeEdit });
  }

  async function handleCrmEditSubmit(form) {
    const resource = form.dataset.crmResource;
    const sourceResource = form.dataset.crmSourceResource || '';
    const mode = form.dataset.crmFormMode || 'create';
    const id = form.dataset.crmFormId || '';
    const invite = form.dataset.crmInvite === 'true';
    const employeeEdit = form.dataset.crmEmployeeEdit === 'true';
    const formStatus = form.querySelector('[data-form-submit-status]');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalSubmitLabel = submitButton?.textContent || (mode === 'edit' ? 'Save Changes' : 'Create');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = invite ? 'Sending…' : mode === 'edit' ? 'Saving…' : 'Creating…';
    }
    if (formStatus) formStatus.textContent = '';
    try {
      const formData = new FormData(form);
      const raw = Object.fromEntries(formData.entries());
      if (resource === 'tickets' && form.dataset.crmTicketCreate === 'true') {
        const assignee = state.data.profiles.find((profile) => String(profile.auth_user_id) === String(raw.assigned_user_id));
        if (assignee) raw.assigned_to = assignee.name || assignee.email || '';
      }
      if (sourceResource) raw.transaction_type = sourceResource;
      if (resource === 'finances' && !raw.transaction_type) raw.transaction_type = 'expense';
      if (resource === 'profiles' && !String(raw.username || '').trim()) raw.username = generateProfileUsername(raw);
      let generatedPassword = '';
      if (resource === 'profiles' && mode === 'create' && !invite && !String(raw.password || '').trim()) {
        generatedPassword = createTemporaryPassword();
        raw.password = generatedPassword;
      }
      const body = resource === 'projects' && !employeeEdit ? projectPayloadFromForm(raw) : normalizePayload(resource, raw);
      if (resource === 'profiles' && mode === 'create') body.operation = invite ? 'invite' : 'provision';
      const validationError = validateWorkspacePayload(resource, body, { creating: resource === 'profiles' && mode === 'create' && !invite });
      if (validationError) {
        if (formStatus) formStatus.textContent = validationError;
        toast(validationError);
        return;
      }
      const path = mode === 'edit' ? `/api/portal/${resource}/${encodeURIComponent(id)}` : `/api/portal/${resource}`;
      const result = await portal(path, { method: mode === 'edit' ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      if (resource === 'projects' && !employeeEdit && result?.item?.id && isCompanyAdmin()) {
        await repository.setProjectMembers(Number(result.item.id), projectMemberIds(formData, raw));
      }
      els.modal.classList.remove('open');
      toast(mode === 'edit' ? 'Saved' : resource === 'profiles' ? 'Login created successfully' : `${nice(sourceResource || resource)} created successfully`);
      await loadData();
      render();
      if (resource === 'profiles' && generatedPassword) showCreatedLoginDialog(body, generatedPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : mode === 'edit' ? 'Update failed' : 'Create failed';
      if (formStatus) formStatus.textContent = message;
      toast(message);
    } finally {
      if (submitButton?.isConnected) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitLabel;
      }
    }
  }

  return {
    openCreate,
    openEdit,
    handleCrmEditSubmit,
  };
}

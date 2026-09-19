/**
 * Relationship-aware forms used by the authenticated operations workspace.
 *
 * This module owns form markup and local form state only. Persistence remains
 * in the workspace controller/repository boundary.
 */
export function createOperationsForms({
  state,
  escapeHtml,
  financeProofFieldMarkup,
  crmProjectIcon,
  normalizePayload,
  employeesFromState,
  selectOpts,
  documentRef = typeof document !== 'undefined' ? document : null,
}) {
  const projectDeliveryPeople = () => state.data.profiles
    .filter((profile) => ['company_admin', 'company_member'].includes(profile.role)
      && (profile.status || 'active') === 'active'
      && profile.id)
    .sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || '')));

  const projectTeamMarkup = (values = {}) => {
    const current = new Set(state.data.project_members
      .filter((member) => String(member.project_id) === String(values.id))
      .map((member) => String(member.profile_id)));
    const people = projectDeliveryPeople();
    if (!people.length) return '<p class="crm-help wide">No active delivery people are available to assign yet. Create an active admin or employee login first.</p>';
    return `<fieldset class="wide project-team-field"><legend>Delivery people</legend><div class="project-team-intro"><span>Choose everyone who should work on this project.</span><strong>${current.size} selected</strong></div><div class="project-team-picker">${people.map((person) => {
      const roleLabel = person.role === 'company_admin' ? 'Admin' : 'Employee';
      const details = [roleLabel, person.department, person.email || person.username].filter(Boolean).join(' · ');
      return `<label class="project-team-option"><input type="checkbox" name="project_member_id" value="${person.id}"${current.has(String(person.id)) ? ' checked' : ''} /><span class="project-team-option-copy"><strong>${escapeHtml(person.name || person.email || 'Unnamed user')}</strong><small>${escapeHtml(details)}</small></span></label>`;
    }).join('')}</div></fieldset>`;
  };

  const createFields = (resource, values = {}) => {
    const clientOpts = (emptyLabel = '— Select client —') => `<option value="">${emptyLabel}</option>${state.data.clients.map((client) => `<option value="${client.id}"${String(values.client_id) === String(client.id) ? ' selected' : ''}>${escapeHtml(client.company || client.name)}</option>`).join('')}`;
    const projectOpts = () => `<option value="">— None —</option>${state.data.projects.map((project) => `<option value="${project.id}"${String(values.project_id) === String(project.id) ? ' selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}`;
    const employeeOpts = () => `<option value="">— Unassigned —</option>${employeesFromState().map((employee) => `<option value="${escapeHtml(employee.name)}"${values.assigned_to === employee.name || values.project_manager === employee.name ? ' selected' : ''}>${escapeHtml(employee.name)}</option>`).join('')}`;
    const employeeIdOpts = () => `<option value="">— Unassigned —</option>${employeesFromState().map((employee) => `<option value="${escapeHtml(employee.auth_user_id)}"${String(values.assigned_user_id) === String(employee.auth_user_id) ? ' selected' : ''}>${escapeHtml(employee.name || employee.email)}</option>`).join('')}`;
    const projectManagerOpts = () => `<option value="">— Set later —</option>${projectDeliveryPeople().map((employee) => `<option value="${employee.id}"${String(values.project_manager_profile_id) === String(employee.id) || values.project_manager === employee.name ? ' selected' : ''}>${escapeHtml(employee.name || employee.email)}${employee.department ? ` · ${escapeHtml(employee.department)}` : ''}</option>`).join('')}`;

    const configs = {
      projects: [
        { name: 'name', label: 'Project Name *', type: 'text', required: true, wide: true, placeholder: 'e.g. Website Redesign' },
        { name: 'client_id', label: 'Client account', type: 'select', html: `<select name="client_id" aria-describedby="project-client-help">${clientOpts('— Internal project (no client) —')}</select><small id="project-client-help" class="crm-field-hint">Select a client to show this project in that client’s portal.</small>` },
        { name: 'project_manager_profile_id', label: 'Project Manager', type: 'select', html: `<select name="project_manager_profile_id">${projectManagerOpts()}</select>` },
        { name: 'budget', label: 'Budget (₹)', type: 'number', min: '0', step: 'any', placeholder: '0' },
        { name: 'expenses', label: 'Expenses (₹)', type: 'number', min: '0', step: 'any', placeholder: '0' },
        { name: 'revenue', label: 'Revenue (₹)', type: 'number', min: '0', step: 'any', placeholder: '0' },
        { name: 'progress', label: 'Progress %', type: 'number', min: '0', max: '100', step: '1', placeholder: '0' },
        { name: 'due_date', label: 'Deadline', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', html: `<select name="status">${selectOpts([['planning', 'Planning'], ['active', 'Active'], ['review', 'Review'], ['on_hold', 'On Hold'], ['completed', 'Completed'], ['cancelled', 'Cancelled']], values.status || 'planning')}</select>` },
        { name: 'health', label: 'Health', type: 'select', html: `<select name="health">${selectOpts([['on_track', 'On Track'], ['watch', 'Watch'], ['at_risk', 'At Risk'], ['breached', 'Breached']], values.health || 'on_track')}</select>` },
        { name: 'summary', label: 'Summary', type: 'textarea', wide: true, placeholder: 'Brief project overview...' },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Internal notes...' },
      ],
      tickets: [
        { name: 'client_id', label: 'Client *', type: 'select', required: true, html: `<select name="client_id" required>${clientOpts()}</select>` },
        { name: 'project_id', label: 'Project', type: 'select', html: `<select name="project_id">${projectOpts()}</select>` },
        { name: 'subject', label: 'Subject *', type: 'text', required: true, wide: true, placeholder: 'Brief issue title' },
        { name: 'description', label: 'Description', type: 'textarea', wide: true, placeholder: 'Detailed issue description...' },
        { name: 'assigned_user_id', label: 'Assigned user', type: 'select', html: `<select name="assigned_user_id">${employeeIdOpts()}</select>` },
        { name: 'priority', label: 'Priority', type: 'select', html: `<select name="priority">${selectOpts([['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['urgent', 'Urgent']], values.priority || 'medium')}</select>` },
        { name: 'assigned_to', label: 'Assigned To', type: 'select', html: `<select name="assigned_to">${employeeOpts()}</select>` },
        { name: 'status', label: 'Status', type: 'select', html: `<select name="status">${selectOpts([['open', 'Open'], ['in_progress', 'In Progress'], ['waiting', 'Waiting'], ['resolved', 'Resolved'], ['closed', 'Closed']], values.status || 'open')}</select>` },
      ],
      finances: [
        { name: 'transaction_date', label: 'Date *', type: 'date', required: true },
        { name: 'transaction_type', label: 'Category *', type: 'select', required: true, html: `<select name="transaction_type" required>${selectOpts([['income', 'Income'], ['expense', 'Expense'], ['revenue', 'Revenue'], ['salary', 'Salary']], values.transaction_type || 'expense')}</select>` },
        { name: 'title', label: 'Description *', type: 'text', required: true, placeholder: 'Description of transaction' },
        { name: 'amount', label: 'Amount (₹) *', type: 'number', required: true, min: '0', step: 'any', placeholder: '0' },
        { name: 'status', label: 'Status *', type: 'select', required: true, html: `<select name="status" required>${selectOpts([['pending', 'Pending'], ['paid', 'Paid'], ['received', 'Received'], ['half_payment', 'Half Payment'], ['cancelled', 'Cancelled']], values.status || 'pending')}</select>` },
        { name: 'reference_id', label: 'Reference ID', type: 'text', placeholder: 'e.g. EXP-001' },
        { name: 'client_id', label: 'Client', type: 'select', html: `<select name="client_id">${clientOpts('— Company expense / no client —')}</select>` },
        { name: 'project_id', label: 'Project', type: 'select', html: `<select name="project_id">${projectOpts()}</select>` },
        { name: 'paid_by', label: 'Paid By', type: 'text', placeholder: 'Person/account' },
        { name: 'received_by', label: 'Received By', type: 'text', placeholder: 'Person/account' },
        { name: 'payment_method', label: 'Payment Method', type: 'text', placeholder: 'UPI / Bank / Cash' },
        { name: 'department', label: 'Department', type: 'text', placeholder: 'Optional department' },
        { name: 'source', label: 'Source', type: 'text', placeholder: 'manual' },
        { name: 'proof_url', label: 'Proof Attachment', type: 'html', html: financeProofFieldMarkup(values) },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Additional notes...' },
      ],
      income: [
        { name: 'transaction_date', label: 'Date *', type: 'date', required: true },
        { name: 'title', label: 'Description *', type: 'text', required: true, placeholder: 'e.g. Payment for Milestone 1' },
        { name: 'amount', label: 'Income Amount (₹) *', type: 'number', required: true, min: '0', step: 'any', placeholder: '0' },
        { name: 'status', label: 'Status *', type: 'select', required: true, html: `<select name="status" required>${selectOpts([['received', 'Received'], ['pending', 'Pending'], ['half_payment', 'Half Payment'], ['cancelled', 'Cancelled']], values.status || 'received')}</select>` },
        { name: 'client', label: 'Client Name', type: 'text', placeholder: 'Client name' },
        { name: 'project', label: 'Project Name', type: 'text', placeholder: 'Project name' },
        { name: 'payment_method', label: 'Payment Method', type: 'text', placeholder: 'UPI / Bank / Cash' },
        { name: 'proof_url', label: 'Proof Attachment', type: 'html', html: financeProofFieldMarkup(values) },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Additional income notes...' },
      ],
      expense: [
        { name: 'transaction_date', label: 'Date *', type: 'date', required: true },
        { name: 'title', label: 'Description *', type: 'text', required: true, placeholder: 'e.g. Server hosting renewal' },
        { name: 'amount', label: 'Expense Amount (₹) *', type: 'number', required: true, min: '0', step: 'any', placeholder: '0' },
        { name: 'status', label: 'Status *', type: 'select', required: true, html: `<select name="status" required>${selectOpts([['paid', 'Paid'], ['pending', 'Pending'], ['cancelled', 'Cancelled']], values.status || 'paid')}</select>` },
        { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Infrastructure' },
        { name: 'paid_by', label: 'Paid By', type: 'text', placeholder: 'Person or account' },
        { name: 'payment_method', label: 'Payment Method', type: 'text', placeholder: 'Credit Card / UPI / NetBanking' },
        { name: 'proof_url', label: 'Proof Attachment', type: 'html', html: financeProofFieldMarkup(values) },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Additional expense notes...' },
      ],
      salary: [
        { name: 'transaction_date', label: 'Date *', type: 'date', required: true },
        { name: 'title', label: 'Employee Name *', type: 'text', required: true, placeholder: 'Full name' },
        { name: 'amount', label: 'Salary Amount (₹) *', type: 'number', required: true, min: '0', step: 'any', placeholder: '0' },
        { name: 'status', label: 'Status *', type: 'select', required: true, html: `<select name="status" required>${selectOpts([['pending', 'Pending'], ['paid', 'Paid'], ['cancelled', 'Cancelled']], values.status || 'pending')}</select>` },
        { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Engineering' },
        { name: 'paid_by', label: 'Role', type: 'text', placeholder: 'e.g. Developer' },
        { name: 'received_by', label: 'Bank Name', type: 'text', placeholder: 'e.g. HDFC Bank' },
        { name: 'payment_method', label: 'Account No.', type: 'text', placeholder: 'Last 4 digits' },
      ],
      clients: [
        { name: 'company', label: 'Company Name *', type: 'text', required: true, wide: true, placeholder: 'e.g. Acme Corp' },
        { name: 'name', label: 'Contact Name *', type: 'text', required: true, placeholder: 'Full name' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'contact@example.com' },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9XXXXXXXXX' },
        { name: 'status', label: 'Status', type: 'select', html: `<select name="status">${selectOpts([['active', 'Active'], ['inactive', 'Inactive'], ['archived', 'Archived']], values.status || 'active')}</select>` },
        { name: 'marketing_opt_in', label: 'Marketing Opt In', type: 'select', html: `<select name="marketing_opt_in">${selectOpts([['false', 'No'], ['true', 'Yes']], String(Boolean(values.marketing_opt_in)))}</select>` },
        { name: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Optional notes...' },
      ],
      profiles: [
        { name: 'name', label: 'Full Name *', type: 'text', required: true, placeholder: 'Full name' },
        { name: 'username', label: 'Username', type: 'text', placeholder: 'Optional — generated from email' },
        { name: 'email', label: 'Email *', type: 'email', required: true, placeholder: 'user@example.com' },
        { name: 'password', label: 'Initial password', type: 'password', placeholder: 'Optional - auto-generates if blank' },
        { name: 'role', label: 'Role *', type: 'select', required: true, html: `<select name="role" required>${selectOpts([['company_admin', 'Company Admin'], ['company_member', 'Company Member'], ['client', 'Client']], values.role || 'company_member')}</select>` },
        { name: 'client_id', label: 'Linked client account', type: 'select', html: `<select name="client_id" aria-describedby="profile-client-help"><option value="">— Select client —</option>${state.data.clients.map((client) => `<option value="${client.id}"${String(values.client_id) === String(client.id) ? ' selected' : ''}>${escapeHtml(client.company || client.name)}</option>`).join('')}</select><small id="profile-client-help" class="crm-field-hint">Required for Client role. This login will see projects linked to this client.</small>` },
        { name: 'department', label: 'Department', type: 'text', placeholder: 'Operations / Sales / Engineering' },
        { name: 'status', label: 'Status', type: 'select', html: `<select name="status">${selectOpts([['active', 'Active'], ['inactive', 'Inactive'], ['pending', 'Pending']], values.status || 'active')}</select>` },
      ],
      ticket_messages: [
        { name: 'body', label: 'Reply *', type: 'textarea', required: true, wide: true, placeholder: 'Type your reply...' },
        { name: 'visibility', label: 'Visibility', type: 'select', html: `<select name="visibility">${selectOpts([['external', 'External (visible to client)'], ['internal', 'Internal (team only)']], values.visibility || 'external')}</select>` },
      ],
    };
    return configs[resource] || configs.clients;
  };

  const fieldMarkup = (field, values = {}, resource, { invite = false } = {}) => {
    if (!field) return '';
    const wide = field.wide ? 'wide' : '';
    const required = field.required ? ' required' : '';
    let input;
    if (field.type === 'html' || field.html) input = field.html;
    else if (field.type === 'textarea') input = `<textarea name="${field.name}"${required} placeholder="${field.placeholder || ''}">${escapeHtml(values[field.name] ?? '')}</textarea>`;
    else {
      const extra = [field.min !== undefined ? `min="${field.min}"` : '', field.max !== undefined ? `max="${field.max}"` : '', field.step ? `step="${field.step}"` : '', field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''].filter(Boolean).join(' ');
      input = `<input name="${field.name}" type="${field.type}"${required} value="${escapeHtml(values[field.name] ?? '')}" ${extra} />`;
    }
    const hint = resource === 'profiles' && !values.id && field.name === 'password'
      ? `<small class="operations-field-hint">${invite ? 'Optional: leave blank to send an email invitation.' : 'Optional: leave blank to auto-generate a temporary password.'}</small>`
      : '';
    return `<label class="${wide}">${field.label}${hint}${input}</label>`;
  };

  const chevron = (open = true) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${open ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'}"></path></svg>`;
  const drawerSection = (title, iconName, content, sectionId) => `<section class="operations-drawer-section" data-drawer-section="${sectionId}"><header class="operations-drawer-section-head"><span class="operations-drawer-section-icon">${crmProjectIcon(iconName)}</span><h3>${title}</h3><button class="operations-drawer-section-toggle" data-drawer-section-toggle="${sectionId}" type="button" aria-label="Toggle ${title}" aria-expanded="true">${chevron(true)}</button></header><div class="operations-drawer-section-body" data-drawer-section-body="${sectionId}">${content}</div></section>`;

  const profilePermissions = (values = {}) => {
    const permissionItems = [
      ['projects', 'Projects', 'folder', 'company_admin,company_member,client'],
      ['operations', 'Operations', 'layers', 'company_admin'],
      ['files', 'Files', 'reports', 'company_admin,company_member'],
      ['support', 'Support', 'tickets', 'company_admin,client'],
    ];
    const currentRole = values.role || 'company_member';
    const cards = permissionItems.map(([key, label, iconName, allowedRoles]) => {
      const allowed = allowedRoles.split(',').includes(currentRole);
      return `<label class="operations-permission-card"><input type="checkbox" disabled data-permission-key="${key}" data-permission-roles="${allowedRoles}"${allowed ? ' checked' : ''} aria-label="${label} permission" /><span class="operations-permission-icon">${crmProjectIcon(iconName)}</span><strong>${label}</strong></label>`;
    }).join('');
    return `<div class="operations-permission-note" data-permission-role-note>Preview for the selected role. Access is enforced by the live Operations &amp; Management permission contract.</div><div class="operations-permission-grid">${cards}</div>`;
  };

  const projectFormMarkup = (values = {}, submitLabel = 'Save', { invite = false } = {}) => {
    const fields = createFields('projects', values);
    const field = (name) => fieldMarkup(fields.find((item) => item.name === name), values, 'projects', { invite });
    return `<form id="crm-edit-form" class="operations-drawer-form" autocomplete="off">
      ${drawerSection('Basic Information', 'folder', `<div class="operations-drawer-grid">${field('name')}${field('client_id')}${field('project_manager_profile_id')}</div>`, 'project-basic')}
      ${drawerSection('Timeline & Status', 'calendar', `<div class="operations-drawer-grid">${field('due_date')}${field('status')}${field('health')}${field('progress')}</div>`, 'project-timeline')}
      ${drawerSection('Financials', 'currency', `<div class="operations-drawer-grid">${field('budget')}${field('expenses')}${field('revenue')}</div>`, 'project-financials')}
      ${drawerSection('Team & Resources', 'clients', `<div class="operations-drawer-grid">${projectTeamMarkup(values)}</div>`, 'project-team')}
      ${drawerSection('Additional Details', 'reports', `<div class="operations-drawer-grid">${field('summary')}${field('notes')}</div>`, 'project-details')}
      <p class="crm-form-submit-status operations-drawer-status" data-form-submit-status role="status" aria-live="polite"></p>
      <footer class="operations-drawer-footer"><button class="crm-button" data-drawer-cancel type="button">Cancel</button><button class="crm-button primary" type="submit">${submitLabel}</button></footer>
    </form>`;
  };

  const profileFormMarkup = (values = {}, submitLabel = 'Save', { invite = false } = {}) => {
    const fields = createFields('profiles', values);
    const field = (name) => fieldMarkup(fields.find((item) => item.name === name), values, 'profiles', { invite });
    const validation = !values.id && !invite ? ' novalidate' : '';
    return `<form id="crm-edit-form" class="operations-drawer-form" autocomplete="off"${validation}>
      ${drawerSection('Basic Information', 'clients', `<div class="operations-drawer-grid">${field('name')}${field('email')}${field('role')}${field('status')}</div>`, 'profile-basic')}
      ${drawerSection('Organization', 'folder', `<div class="operations-drawer-grid">${field('client_id')}${field('department')}${field('username')}</div>`, 'profile-organization')}
      ${drawerSection('Permissions', 'lock', `<div class="operations-drawer-grid operations-drawer-grid--single">${profilePermissions(values)}</div>`, 'profile-permissions')}
      ${drawerSection('Security', 'lock', `<div class="operations-drawer-grid operations-drawer-grid--single">${field('password')}<p class="operations-drawer-help">Passwords and invitations are handled by the existing Supabase admin-user operation.</p></div>`, 'profile-security')}
      <p class="crm-form-submit-status operations-drawer-status" data-form-submit-status role="status" aria-live="polite"></p>
      <footer class="operations-drawer-footer"><button class="crm-button" data-drawer-cancel type="button">Cancel</button><button class="crm-button primary" type="submit">${submitLabel}</button></footer>
    </form>`;
  };

  const syncDrawerState = (form = documentRef?.getElementById('crm-edit-form')) => {
    const roleSelect = form?.querySelector('[name="role"]');
    const permissionNote = form?.querySelector('[data-permission-role-note]');
    if (!roleSelect) return;
    const role = roleSelect.value || 'company_member';
    form.querySelectorAll('[data-permission-key]').forEach((control) => {
      control.checked = String(control.dataset.permissionRoles || '').split(',').includes(role);
    });
    if (permissionNote) permissionNote.textContent = `Preview for ${role === 'company_admin' ? 'Admin' : role === 'client' ? 'Client' : 'Employee'}. Access is enforced by the live Operations & Management permission contract.`;
  };

  const bindDrawerSections = (form = documentRef?.getElementById('crm-edit-form')) => syncDrawerState(form);

  const formMarkup = (resource, values = {}, submitLabel = 'Save', { invite = false } = {}) => {
    if (resource === 'projects') return projectFormMarkup(values, submitLabel, { invite });
    if (resource === 'profiles') return profileFormMarkup(values, submitLabel, { invite });
    const fields = createFields(resource, values);
    const rows = fields.map((field) => fieldMarkup(field, values, resource, { invite })).join('');
    const validation = resource === 'profiles' && !values.id && !invite ? ' novalidate' : '';
    return `<form id="crm-edit-form" class="crm-form-grid" autocomplete="off"${validation}>${rows}${resource === 'projects' ? projectTeamMarkup(values) : ''}<p class="crm-form-submit-status wide" data-form-submit-status role="status" aria-live="polite"></p><button class="crm-button primary wide" type="submit">${submitLabel}</button></form>`;
  };

  const projectPayloadFromForm = (raw) => {
    const payload = { ...raw };
    const client = state.data.clients.find((item) => String(item.id) === String(raw.client_id));
    payload.client_id = client ? client.id : null;
    payload.client_name = client ? client.company || client.name || '' : null;
    const manager = state.data.profiles.find((profile) => String(profile.id) === String(raw.project_manager_profile_id)
      && ['company_admin', 'company_member'].includes(profile.role) && profile.status === 'active');
    if (manager) {
      payload.project_manager = manager.name || manager.email || '';
      payload.owner_user_id = manager.auth_user_id || '';
    }
    return normalizePayload('projects', payload);
  };

  const syncProfileClientLinkFields = (form) => {
    const roleSelect = form?.querySelector('[name="role"]');
    const clientSelect = form?.querySelector('[name="client_id"]');
    if (!roleSelect || !clientSelect) return;
    const isClient = roleSelect.value === 'client';
    if (!isClient) clientSelect.value = '';
    clientSelect.required = isClient;
    clientSelect.setCustomValidity(isClient && !clientSelect.value ? 'Select the client account this login belongs to.' : '');
    clientSelect.closest('label')?.classList.toggle('profile-client-link-required', isClient);
  };

  const projectMemberIds = (formData, raw) => {
    const selected = formData.getAll('project_member_id').map(Number).filter((id) => Number.isInteger(id) && id > 0);
    const managerId = raw.project_manager_profile_id ? Number(raw.project_manager_profile_id) : null;
    if (Number.isInteger(managerId) && managerId > 0) selected.push(managerId);
    return [...new Set(selected)];
  };

  const refreshLinkedClientProjectFields = (form) => {
    const clientSelect = form?.querySelector('[name="client_id"]');
    const projectSelect = form?.querySelector('[name="project_id"]');
    if (!clientSelect || !projectSelect) return;
    const selectedClientId = String(clientSelect.value || '');
    const previous = String(projectSelect.value || '');
    const allowed = state.data.projects.filter((project) => !selectedClientId || !project.client_id || String(project.client_id) === selectedClientId);
    const documentRef = projectSelect.ownerDocument;
    projectSelect.replaceChildren();
    const emptyOption = documentRef.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '— None —';
    projectSelect.append(emptyOption);
    allowed.forEach((project) => {
      const option = documentRef.createElement('option');
      option.value = String(project.id);
      option.textContent = project.name || '';
      projectSelect.append(option);
    });
    projectSelect.value = allowed.some((project) => String(project.id) === previous) ? previous : '';
  };

  return {
    createFields,
    formMarkup,
    chevron,
    projectDeliveryPeople,
    projectPayloadFromForm,
    projectMemberIds,
    projectTeamMarkup,
    bindDrawerSections,
    syncDrawerState,
    syncProfileClientLinkFields,
    refreshLinkedClientProjectFields,
  };
}

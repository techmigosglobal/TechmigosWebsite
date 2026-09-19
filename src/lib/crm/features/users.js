import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderUsers(context) {
  const { state, els, employeeProjects, clientName, rowActions, usersAdminTabs, pageHead, metric, badge, crmProjectIcon, table, escapeHtml, nice, renderEmployees, renderClients } = context;
  if (state.usersSection === 'employees') return renderEmployees({ embeddedInUsers: true });
  if (state.usersSection === 'clients') return renderClients({ embeddedInUsers: true });

  const profiles = state.data.profiles || [];
  const linkedClientIds = new Set(profiles.filter((profile) => profile.role === 'client' && profile.client_id).map((profile) => String(profile.client_id)));
  const entries = [
    ...profiles.map((profile) => ({ ...profile, entryKind: 'login', recordId: profile.id, company: clientName(profile.client_id) })),
    ...state.data.clients
      .filter((client) => !linkedClientIds.has(String(client.id)))
      .map((client) => ({
        id: `client-record-${client.id}`,
        recordId: client.id,
        entryKind: 'client-record',
        name: client.name || client.company || `Client #${client.id}`,
        email: client.email || '',
        role: 'client',
        status: client.status || 'active',
        client_id: client.id,
        company: client.company || client.name || `Client #${client.id}`,
      })),
  ];
  const roleLabel = (role) => ({ company_admin: 'Admin', company_member: 'Employee', client: 'Client' }[role] || nice(role));
  const roleTone = (role) => role === 'company_admin' ? 'purple' : role === 'client' ? 'green' : 'blue';
  const projectScope = (entry) => {
    if (entry.role === 'company_admin') return { title: 'All projects', detail: `${state.data.projects.length} company projects visible` };
    const projects = entry.role === 'company_member'
      ? employeeProjects(entry)
      : state.data.projects.filter((project) => String(project.client_id) === String(entry.client_id));
    const names = projects.slice(0, 2).map((project) => project.name).filter(Boolean).join(', ');
    return {
      title: entry.role === 'client' ? 'Own projects only' : 'Assigned projects only',
      detail: `${projects.length} project${projects.length === 1 ? '' : 's'}${names ? ` · ${names}` : ''}`,
    };
  };
  const roleFilter = state.usersRoleFilter || 'all';
  const statusFilter = state.usersStatusFilter || 'all';
  const searchQuery = (state.usersSearch || '').trim().toLowerCase();
  const visibleEntries = entries.filter((entry) => {
    if (roleFilter !== 'all' && entry.role !== roleFilter) return false;
    if (statusFilter !== 'all' && (entry.entryKind === 'client-record' || (entry.status || 'active') !== statusFilter)) return false;
    if (!searchQuery) return true;
    return [entry.name, entry.email, entry.company, entry.department, roleLabel(entry.role)].some((value) => String(value || '').toLowerCase().includes(searchQuery));
  });
  const adminCount = profiles.filter((profile) => profile.role === 'company_admin').length;
  const employeeCount = profiles.filter((profile) => profile.role === 'company_member').length;
  const clientCount = entries.filter((entry) => entry.role === 'client').length;
  const activeUserCount = profiles.filter((profile) => !profile.status || profile.status === 'active').length;
  const inactiveUserCount = profiles.filter((profile) => profile.status === 'inactive').length;
  const pendingCount = profiles.filter((profile) => profile.status === 'pending').length;
  const rows = visibleEntries.map((entry) => {
    const scope = projectScope(entry);
    const isClientRecord = entry.entryKind === 'client-record';
    const status = isClientRecord
      ? '<span class="crm-status orange">No login</span>'
      : badge(entry.status || 'active', entry.status === 'inactive' ? 'red' : 'green');
    const actions = isClientRecord
      ? `<div class="crm-row-actions"><button class="crm-mini-action" data-create-profile-client="${entry.client_id}" type="button">Add login</button>${rowActions('clients', entry.recordId)}</div>`
      : rowActions('profiles', entry.recordId);
    return `<tr data-resource="${isClientRecord ? 'clients' : 'profiles'}" data-row-id="${entry.recordId || ''}">
      <td><input type="checkbox" data-row-select aria-label="Select ${escapeHtml(roleLabel(entry.role))} ${escapeHtml(entry.name || entry.email)}" /></td>
      <td><strong>${escapeHtml(entry.name || entry.email)}</strong><br><small style="color:#64748b;">${escapeHtml(entry.email || (isClientRecord ? 'Client record without login' : ''))}</small></td>
      <td>${badge(roleLabel(entry.role), roleTone(entry.role))}</td>
      <td><strong>${escapeHtml(entry.company || (entry.role === 'client' ? clientName(entry.client_id) : 'TechMigos') || 'TechMigos')}</strong><br><small style="color:#64748b;">${escapeHtml(entry.department || (entry.role === 'client' ? 'Client account' : entry.role === 'company_admin' ? 'Company administration' : 'Project delivery'))}</small></td>
      <td><strong>${escapeHtml(scope.title)}</strong><br><small style="color:#64748b;">${escapeHtml(scope.detail)}</small></td>
      <td>${status}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
  const accessMatrix = [
    ['Projects', 'All projects', 'Assigned projects only', 'Own linked projects only'],
    ['Other operations modules', 'Full access', 'No access', 'Client portal scope'],
    ['User management', 'Manage users', 'No access', 'No access'],
  ];
  const matrixHtml = `<div class="crm-table-wrap users-matrix-wrap"><table class="crm-table users-matrix"><thead><tr><th>AREA</th><th>ADMIN</th><th>EMPLOYEE</th><th>CLIENT</th></tr></thead><tbody>${accessMatrix.map(([area, ...values]) => `<tr><td><strong>${area}</strong></td>${values.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const statusTabs = [
    ['all', 'All Users', profiles.length],
    ['active', 'Active', activeUserCount],
    ['inactive', 'Inactive', inactiveUserCount],
    ['pending', 'Pending', pendingCount],
  ].map(([key, label, count]) => `<button class="users-reference-tab${statusFilter === key ? ' active' : ''}" type="button" data-users-status-filter="${key}" aria-current="${statusFilter === key ? 'page' : 'false'}">${label}<small>${count}</small></button>`).join('');

  replaceSafeMarkup(els.view, `${pageHead('User Management', 'Manage admin, employee, and client access from one directory.', '<button class="crm-button primary" data-create="profiles" type="button">+ Create Login</button><button class="crm-button" id="btn-invite-user" type="button">Invite User</button><button class="crm-button" id="btn-data-review" type="button">Review data</button><button class="crm-button" data-export="users" type="button">Export</button>')}
    ${usersAdminTabs('directory')}
    <nav class="users-reference-tabs" aria-label="User status filters">${statusTabs}</nav>
    <section class="users-reference-kpis" aria-label="User overview">
      ${metric('Total Users', profiles.length, crmProjectIcon('clients'), 'blue', 'registered logins')}
      ${metric('Active', activeUserCount, crmProjectIcon('reports'), 'green', 'available accounts')}
      ${metric('Inactive', inactiveUserCount, crmProjectIcon('lock'), 'red', 'disabled accounts')}
      ${metric('Pending', pendingCount, crmProjectIcon('tickets'), 'orange', 'awaiting activation')}
      ${metric('Admins', adminCount, crmProjectIcon('clients'), 'purple', 'full access accounts')}
    </section>
    <section class="crm-card users-directory-card">
      <div class="crm-card-head users-directory-head"><div><h2 class="crm-card-title">People &amp; access</h2><p class="users-directory-subtitle">Admins, employees, and clients with their project visibility.</p></div><div class="crm-toolbar"><select class="crm-select" id="users-role-filter" aria-label="Filter users by role"><option value="all" ${roleFilter === 'all' ? 'selected' : ''}>All roles</option><option value="company_admin" ${roleFilter === 'company_admin' ? 'selected' : ''}>Admins</option><option value="company_member" ${roleFilter === 'company_member' ? 'selected' : ''}>Employees</option><option value="client" ${roleFilter === 'client' ? 'selected' : ''}>Clients</option></select><input class="crm-input" id="users-search" placeholder="Search people..." value="${escapeHtml(state.usersSearch || '')}" /></div></div>
      ${table(['', 'Person', 'Role', 'Company / team', 'Project visibility', 'Status', 'Actions'], rows, 'No people found.', 'users-directory-table')}
    </section>
    <div class="crm-two-col users-access-grid">
      <section class="crm-card users-access-card"><div class="crm-card-head"><h2 class="crm-card-title">Access rules</h2><span class="users-access-note">Role-based access</span></div>${matrixHtml}</section>
      <section class="crm-card users-security-card"><div class="crm-card-head"><h2 class="crm-card-title">Account overview</h2></div><div class="crm-list"><div class="crm-list-row"><span>Total people</span><strong>${entries.length}</strong></div><div class="crm-list-row"><span>Admin accounts</span><strong>${adminCount}</strong></div><div class="crm-list-row"><span>Employee accounts</span><strong>${employeeCount}</strong></div><div class="crm-list-row"><span>Client records</span><strong>${clientCount}</strong></div><div class="crm-list-row"><span>Pending logins</span><strong>${pendingCount}</strong></div></div><div class="crm-toolbar" style="padding:12px 18px;"><a class="crm-button" href="/reset-password" style="text-decoration:none;">Reset Password</a></div></section>
    </div>`);
}

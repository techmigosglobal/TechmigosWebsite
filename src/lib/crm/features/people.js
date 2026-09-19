import { replaceSafeMarkup } from '../safeMarkup.js';

export function createPeopleSelectionActions({ state, renderUsers, renderClients, renderEmployees }) {
  function handleInput(element) {
    if (element?.matches?.('#users-search')) {
      state.usersSearch = element.value;
      renderUsers();
      return true;
    }
    if (element?.matches?.('#clients-search')) {
      state.search = element.value;
      state.usersSection === 'clients' ? renderUsers() : renderClients();
      return true;
    }
    if (!element?.matches?.('#employees-search')) return false;
    state.search = element.value;
    state.usersSection === 'employees' ? renderUsers() : renderEmployees();
    return true;
  }

  function handleChange(element) {
    if (element?.matches?.('#users-role-filter')) {
      state.usersRoleFilter = element.value;
      renderUsers();
      return true;
    }
    if (!element?.matches?.('#clients-status-filter')) return false;
    state.clientStatusFilter = element.value;
    state.usersSection === 'clients' ? renderUsers() : renderClients();
    return true;
  }

  function handleClick(element, event) {
    if (element.matches('[data-client-detail]')) {
      if (event.target?.closest?.('[data-row-select],[data-edit-resource],[data-delete-resource],[data-duplicate-resource]')) return true;
      state.selectedClientId = element.dataset.clientDetail;
      state.usersSection === 'clients' ? renderUsers() : renderClients();
      return true;
    }
    if (element.matches('[data-employee-detail]')) {
      if (event.target?.closest?.('[data-row-select],[data-edit-resource],[data-delete-resource],[data-duplicate-resource]')) return true;
      const id = element.dataset.employeeDetail;
      if (!id) return true;
      state.selectedEmployeeId = id;
      state.usersSection === 'employees' ? renderUsers() : renderEmployees();
      return true;
    }
    return false;
  }

  return { handleClick, handleInput, handleChange };
}

export function createPeopleFeatures(context) {
  const {
    state,
    els,
    filtered,
    invoiceBalance,
    invoiceTotal,
    invoiceEffectiveStatus,
    compactMoney,
    badge,
    escapeHtml,
    crmProjectIcon,
    canWrite,
    rowActions,
    pageHead,
    metric,
    table,
    nice,
    isCompanyAdmin,
  } = context;

function usersAdminTabs(active = state.usersSection || 'directory') {
  const tabs = [
    ['directory', 'Access Directory', state.data.profiles.length],
    ['employees', 'Employees', employeesFromState().length],
    ['clients', 'Clients', state.data.clients.length],
  ];
  return `<nav class="users-admin-tabs" aria-label="User management sections">${tabs.map(([key, label, count]) => `<button class="users-admin-tab${active === key ? ' active' : ''}" type="button" data-users-section="${key}" aria-current="${active === key ? 'page' : 'false'}">${label}<small>${count}</small></button>`).join('')}</nav>`;
}

function renderClients(options = {}) {
  const embeddedInUsers = options.embeddedInUsers === true;
  const statusFilter = state.clientStatusFilter || '';
  const allClients = statusFilter
    ? state.data.clients.filter((c) => c.status === statusFilter)
    : state.data.clients;
  const selected = allClients.find((item) => String(item.id) === String(state.selectedClientId)) || allClients[0] || state.data.clients[0];
  state.selectedClientId = selected?.id || null;
  const rows = filtered(allClients, ['name', 'company', 'email', 'phone', 'status']).map((client) => {
    const projects = state.data.projects.filter((item) => String(item.client_id) === String(client.id) || item.client_name === client.company);
    const invoices = state.data.invoices.filter((item) => String(item.client_id) === String(client.id));
    const outstandingInvoices = invoices.filter((item) => invoiceBalance(item) > 0);
    return `<tr data-resource="clients" data-row-id="${client.id}" style="cursor:pointer;" data-client-detail="${client.id}">
      <td><input type="checkbox" data-row-select aria-label="Select client ${escapeHtml(client.company || client.name)}" /></td>
      <td><strong>${escapeHtml(client.company || client.name || '')}</strong><br><small style="color:#64748b;">${escapeHtml(client.name || '')}</small></td>
      <td>${escapeHtml(client.email || '—')}</td>
      <td><strong>${projects.length}</strong></td>
      <td><strong>${compactMoney(projects.reduce((sum, item) => sum + Number(item.revenue || item.budget || 0), 0))}</strong></td>
      <td>${outstandingInvoices.length ? `<strong style="color:#d97706">${compactMoney(outstandingInvoices.reduce((sum, item) => sum + invoiceBalance(item), 0))}</strong>` : '<span style="color:#059669">Settled</span>'}</td>
      <td>${badge(client.status || 'active')}</td>
      <td>${rowActions('clients', client.id, { view: false })}</td>
    </tr>`;
  }).join('');
  const activeCount = state.data.clients.filter((c) => c.status === 'active' || !c.status).length;
  const engagedClientCount = state.data.clients.filter((client) => state.data.projects.some((project) => String(project.client_id) === String(client.id))).length;
  const atRiskCount = state.data.projects.filter((p) => p.health === 'at_risk').length;
  const totalRevenue = state.data.invoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  replaceSafeMarkup(els.view, `
    ${pageHead(embeddedInUsers ? 'User Management' : 'Client Management', embeddedInUsers ? 'Client details, linked projects, billing health, and portal access for administrators.' : 'Manage client companies, relationships, project portfolio, billing health, and portal access.', `${canWrite('clients') ? '<button class="crm-button primary" data-create="clients" type="button">+ Add Client</button>' : ''}<button class="crm-button" data-export="clients" type="button">Export</button>`)}
    ${embeddedInUsers ? usersAdminTabs('clients') : ''}
    <div class="crm-grid crm-kpis">
      ${metric('Total Clients', state.data.clients.length, crmProjectIcon('clients'), 'blue', `${activeCount} active`)}
      ${metric('Active Projects', state.data.projects.filter((p) => ['active','review','planning'].includes(p.status)).length, crmProjectIcon('folder'), 'green', 'across all clients')}
      ${metric('Client Billing', compactMoney(totalRevenue), crmProjectIcon('currency'), 'purple', 'from linked invoices')}
      ${metric('At-Risk Accounts', atRiskCount, crmProjectIcon('tickets'), 'orange', atRiskCount ? 'need attention' : 'all healthy')}
    </div>
    <div class="crm-two-col mt-5">
      <section class="crm-card">
        <div class="crm-card-head">
          <h2 class="crm-card-title">Clients</h2>
          <div class="crm-toolbar">
            <select class="crm-select" id="clients-status-filter">
              <option value="">All Statuses</option>
              <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="archived" ${statusFilter === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
            <input class="crm-input" id="clients-search" placeholder="Search clients..." value="${escapeHtml(state.search)}" />
          </div>
        </div>
        ${table(['', 'Company', 'Email', 'Projects', 'Revenue', 'Outstanding', 'Status', 'Actions'], rows, 'No clients found.')}
      </section>
      <aside class="crm-card crm-detail">${clientDetail(selected)}</aside>
    </div>
    <div class="crm-three-col mt-5">
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">Client Retention</h2></div><div class="crm-list"><div class="crm-list-row"><span>Active clients</span><strong>${activeCount}</strong></div><div class="crm-list-row"><span>Clients with projects</span><strong>${engagedClientCount}</strong></div><div class="crm-list-row"><span>At-risk projects</span><strong>${atRiskCount}</strong></div></div></section>
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">Recent Activity</h2></div><div class="crm-list">${state.data.activities.slice(0, 5).map((item) => `<div class="crm-list-row"><span>${escapeHtml(item.summary || item.action)}</span><small>${escapeHtml(String(item.created_at || '').slice(0, 10))}</small></div>`).join('') || '<p class="crm-empty">No activity yet.</p>'}</div></section>
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">Outstanding Invoices</h2></div><div class="crm-list">${state.data.invoices.filter((i) => invoiceBalance(i) > 0).slice(0, 5).map((i) => `<div class="crm-list-row"><span>${escapeHtml(i.invoice_number || '-')} ${badge(invoiceEffectiveStatus(i))}</span><strong>${compactMoney(invoiceBalance(i))}</strong></div>`).join('') || '<p class="crm-empty">No outstanding invoices.</p>'}</div></section>
    </div>`);
}

function clientDetail(client) {
  if (!client) return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:8px;"><div style="font-size:32px;">&#9711;</div><p style="color:#94a3b8;font-weight:600;">Select a client to view details</p></div>`;
  const projects = state.data.projects.filter((item) => String(item.client_id) === String(client.id) || item.client_name === client.company);
  const invoices = state.data.invoices.filter((item) => String(item.client_id) === String(client.id));
  const outstanding = invoices.filter((i) => invoiceBalance(i) > 0);
  const totalBilling = invoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const initials = (client.company || client.name || 'C').slice(0, 2).toUpperCase();
  return `
    <div class="pm-detail">
      <div class="pm-detail-hero">
        <div class="pm-detail-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);font-size:14px;font-weight:900;">${escapeHtml(initials)}</div>
        <div style="flex:1;min-width:0;">
          <h2 class="pm-detail-title">${escapeHtml(client.company || client.name)}</h2>
          <p class="pm-detail-client">${escapeHtml(client.name || '')} &bull; ${badge(client.status || 'active')}</p>
        </div>
      </div>
      <div class="pm-detail-section">
        <div class="pm-detail-label">CONTACT INFO</div>
        <div class="pm-info-grid">
          <div class="pm-info-row"><span>Email</span><strong>${client.email ? `<a href="mailto:${escapeHtml(client.email)}" style="color:#6366f1;">${escapeHtml(client.email)}</a>` : '—'}</strong></div>
          <div class="pm-info-row"><span>Phone</span><strong>${escapeHtml(client.phone || '—')}</strong></div>
          <div class="pm-info-row"><span>Projects</span><strong>${projects.length}</strong></div>
          <div class="pm-info-row"><span>Invoices</span><strong>${invoices.length}</strong></div>
          <div class="pm-info-row"><span>Billed</span><strong style="color:#6366f1;">${compactMoney(totalBilling)}</strong></div>
          <div class="pm-info-row"><span>Outstanding</span><strong style="color:${outstanding.length ? '#f59e0b' : '#22c55e'};">${outstanding.length ? compactMoney(outstanding.reduce((s, i) => s + invoiceBalance(i), 0)) : 'Settled'}</strong></div>
        </div>
      </div>
      ${projects.length ? `<div class="pm-detail-section"><div class="pm-detail-label">PROJECTS (${projects.length})</div>${projects.slice(0, 3).map((p) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;font-weight:700;">${escapeHtml(p.name)}</span>${badge(p.status)}</div>`).join('')}</div>` : ''}
      ${invoices.length ? `<div class="pm-detail-section"><div class="pm-detail-label">RECENT INVOICES</div>${invoices.slice(0, 3).map((i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:11px;font-weight:700;">${escapeHtml(i.invoice_number || '-')}&nbsp;${badge(invoiceEffectiveStatus(i))}</span><strong style="font-size:11px;">${invoiceBalance(i) > 0 ? `${compactMoney(invoiceBalance(i))} due` : 'Paid'}</strong></div>`).join('')}</div>` : ''}
      <div class="pm-detail-actions">
        ${canWrite('clients') ? `<button class="crm-button" data-create="invoices" type="button">+ Invoice</button>` : ''}
        ${canWrite('clients') ? `<button class="crm-button primary" data-edit-resource="clients" data-edit-id="${client.id}" type="button">Edit</button>` : ''}
      </div>
    </div>`;
}

function employeesFromState() {
  return state.data.profiles.filter((item) => item.role === 'company_member');
}

function employeeProjects(employee) {
  const projectIds = new Set(state.data.project_members
    .filter((member) => String(member.profile_id) === String(employee.id))
    .map((member) => String(member.project_id)));
  return state.data.projects.filter((project) => projectIds.has(String(project.id)) || String(project.owner_user_id) === String(employee.auth_user_id));
}

function employeeTickets(employee, includeClosed = true) {
  return state.data.tickets.filter((ticket) => String(ticket.assigned_user_id) === String(employee.auth_user_id)
    && (includeClosed || !['resolved', 'closed'].includes(ticket.status)));
}

function assignedUserName(ticket) {
  const profile = state.data.profiles.find((item) => String(item.auth_user_id) === String(ticket.assigned_user_id));
  return profile?.name || profile?.email || ticket.assigned_to || 'Unassigned';
}

function renderEmployees(options = {}) {
  const embeddedInUsers = options.embeddedInUsers === true;
  const allEmployees = employeesFromState();
  const searchQuery = state.search.trim().toLowerCase();
  const employees = searchQuery
    ? allEmployees.filter((e) => ['name','email','department','role'].some((k) => String(e[k] || '').toLowerCase().includes(searchQuery)))
    : allEmployees;
  const selected = employees.find((item) => String(item.id) === String(state.selectedEmployeeId)) || employees[0] || allEmployees[0];
  state.selectedEmployeeId = selected?.id || null;
  const rows = employees.map((employee) => {
    const assignedProjects = employeeProjects(employee);
    const assignedTickets = employeeTickets(employee);
    return `<tr data-resource="profiles" data-row-id="${employee.id || ''}" style="cursor:pointer;" data-employee-detail="${employee.id || ''}">
      <td><input type="checkbox" data-row-select aria-label="Select employee ${escapeHtml(employee.name || '')}" /></td>
      <td><strong>${escapeHtml(employee.name || employee.email)}</strong><br><small style="color:#64748b;">${escapeHtml(employee.email || '')}</small></td>
      <td>${escapeHtml(employee.department || '—')}</td>
      <td>${badge(employee.role || 'company_member')}</td>
      <td><strong>${assignedProjects.length}</strong></td>
      <td><strong>${assignedTickets.length}</strong></td>
      <td>${badge(employee.status || 'active', 'green')}</td>
      <td>${employee.id ? rowActions('profiles', employee.id) : '<span style="color:#94a3b8;font-size:11px;">Session</span>'}</td>
    </tr>`;
  }).join('');
  const depts = [...new Set(allEmployees.map((e) => e.department || 'Operations').filter(Boolean))];
  replaceSafeMarkup(els.view, `
    ${pageHead(embeddedInUsers ? 'User Management' : 'Employee Management', embeddedInUsers ? 'Employee details, project assignments, delivery workload, and access status for administrators.' : 'Manage team members, departments, utilization, and access status.', `${isCompanyAdmin() ? '<button class="crm-button primary" data-create="profiles" type="button">+ Add Employee</button>' : ''}<button class="crm-button" data-export="employees" type="button">Export</button>`)}
    ${embeddedInUsers ? usersAdminTabs('employees') : ''}
    <div class="crm-grid crm-kpis">
      ${metric('Total Employees', allEmployees.length, crmProjectIcon('clients'), 'blue', `${allEmployees.filter((e) => e.status === 'active' || !e.status).length} active`)}
      ${metric('Avg. Projects / Person', allEmployees.length ? (allEmployees.reduce((sum, employee) => sum + employeeProjects(employee).length, 0) / allEmployees.length).toFixed(1) : '0', crmProjectIcon('folder'), 'green', 'assigned projects')}
      ${metric('Open Tickets', state.data.tickets.filter((t) => !['resolved','closed'].includes(t.status)).length, crmProjectIcon('tickets'), 'orange', 'across team')}
      ${metric('Departments', depts.length, crmProjectIcon('layers'), 'purple', depts.slice(0,2).join(', ') || 'No depts set')}
    </div>
    <div class="crm-two-col mt-5">
      <section class="crm-card">
        <div class="crm-card-head">
          <h2 class="crm-card-title">Team Directory</h2>
          <div class="crm-toolbar">
            <input class="crm-input" id="employees-search" placeholder="Search employees..." value="${escapeHtml(state.search)}" />
          </div>
        </div>
        ${table(['', 'Employee', 'Department', 'Role', 'Projects', 'Tickets', 'Status', 'Actions'], rows, 'No employees found.')}
      </section>
      <aside class="crm-card crm-detail">${employeeDetail(selected)}</aside>
    </div>
    <div class="crm-three-col mt-5">
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">By Department</h2></div><div class="crm-list">${depts.map((d) => `<div class="crm-list-row"><span>${escapeHtml(d)}</span><strong>${allEmployees.filter((e) => (e.department || 'Operations') === d).length} people</strong></div>`).join('') || '<p class="crm-empty">No departments set.</p>'}</div></section>
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">Workload Overview</h2></div><div class="crm-list">${allEmployees.slice(0,5).map((e) => { const p = employeeProjects(e).length; const t = employeeTickets(e, false).length; return `<div class="crm-list-row"><span>${escapeHtml(e.name||e.email)}</span><strong>${p} projects, ${t} open tickets</strong></div>`; }).join('') || '<p class="crm-empty">No delivery assignments yet.</p>'}</div></section>
      <section class="crm-card"><div class="crm-card-head"><h2 class="crm-card-title">Recent Activity</h2></div><div class="crm-list">${state.data.activities.slice(0, 5).map((item) => `<div class="crm-list-row"><span>${escapeHtml(item.summary || item.action)}</span><small>${escapeHtml(String(item.created_at || '').slice(0, 10))}</small></div>`).join('') || '<p class="crm-empty">No activity yet.</p>'}</div></section>
    </div>`);
}

function employeeDetail(employee) {
  if (!employee) return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:8px;"><div style="font-size:32px;">&#9816;</div><p style="color:#94a3b8;font-weight:600;">Select a team member</p></div>`;
  const assignedProjects = employeeProjects(employee);
  const assignedTickets = employeeTickets(employee, false);
  const editBtn = employee.id && isCompanyAdmin() ? `<button class="crm-button primary" data-edit-resource="profiles" data-edit-id="${employee.id}" type="button">Edit Profile</button>` : '';
  const emailLink = employee.email ? `<a href="mailto:${escapeHtml(employee.email)}" class="crm-button" style="text-decoration:none;">&#9993; Email</a>` : '';
  const initials = (employee.name || employee.email || 'E').slice(0, 2).toUpperCase();
  const roleColor = employee.role === 'company_admin' ? '#6366f1' : '#10b981';
  return `
    <div class="pm-detail">
      <div class="pm-detail-hero">
        <div class="pm-detail-icon" style="background:linear-gradient(135deg,${roleColor},${roleColor}99);font-size:13px;font-weight:900;">${escapeHtml(initials)}</div>
        <div style="flex:1;min-width:0;">
          <h2 class="pm-detail-title">${escapeHtml(employee.name || employee.email)}</h2>
          <p class="pm-detail-client">${nice(employee.role || 'company_member')} &bull; ${escapeHtml(employee.department || 'No dept')}</p>
        </div>
      </div>
      <div class="pm-detail-badges">${badge(employee.status || 'active')}</div>
      <div class="pm-detail-section">
        <div class="pm-detail-label">INFO</div>
        <div class="pm-info-grid">
          <div class="pm-info-row"><span>Email</span><strong style="font-size:11px;">${escapeHtml(employee.email || '—')}</strong></div>
          <div class="pm-info-row"><span>Department</span><strong>${escapeHtml(employee.department || '—')}</strong></div>
          <div class="pm-info-row"><span>Projects</span><strong>${assignedProjects.length}</strong></div>
          <div class="pm-info-row"><span>Open Tickets</span><strong style="color:${assignedTickets.length ? '#f59e0b' : '#22c55e'};">${assignedTickets.length}</strong></div>
        </div>
      </div>
      <div class="pm-detail-section"><div class="pm-detail-label">DELIVERY ASSIGNMENTS</div><p style="font-size:12px;color:#475569;margin-top:6px;">${assignedProjects.length} assigned projects and ${assignedTickets.length} open tickets.</p></div>
      ${assignedProjects.length ? `<div class="pm-detail-section"><div class="pm-detail-label">ASSIGNED PROJECTS</div>${assignedProjects.slice(0, 3).map((p) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;font-weight:700;">${escapeHtml(p.name)}</span>${badge(p.status)}</div>`).join('')}</div>` : ''}
      <div class="pm-detail-actions">${emailLink}${editBtn}</div>
    </div>`;
}



  return {
    usersAdminTabs,
    renderClients,
    renderEmployees,
    employeesFromState,
    employeeProjects,
    employeeTickets,
    assignedUserName,
  };
}

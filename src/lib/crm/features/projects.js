import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderProjects(context) {
  const { state, els, canWrite, canUpdate, isEmployee, crmProjectIcon, escapeHtml, clientName, compactMoney, nice, statusTone } = context;
  const allProjects = state.data.projects;
  const isActiveProject = (project) => ['planning', 'active', 'review'].includes(project.status);
  const isAtRiskProject = (project) => ['watch', 'at_risk', 'breached'].includes(project.health);
  const statusFilter = state.projectStatusFilter || '';
  const searchQ = state.projectSearch || '';
  const searchLower = searchQ.trim().toLowerCase();
  const activeProjectCount = allProjects.filter(isActiveProject).length;
  const atRiskCount = allProjects.filter(isAtRiskProject).length;
  const completedCount = allProjects.filter((project) => project.status === 'completed').length;
  const milestoneCount = allProjects.reduce((total, project) => total + (Array.isArray(project.milestones) ? project.milestones.length : 0), 0);
  const filteredProjects = allProjects.filter((project) => {
    const statusMatch = !statusFilter
      || (statusFilter === 'active' ? isActiveProject(project) : statusFilter === 'at_risk' ? isAtRiskProject(project) : project.status === statusFilter);
    const searchMatch = !searchLower || ['name', 'client_name', 'project_manager', 'status', 'health'].some((key) => String(project[key] || '').toLowerCase().includes(searchLower));
    return statusMatch && searchMatch;
  });
  const statusLabel = (status) => ({ planning: 'Planning', active: 'Active', review: 'In Review', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' }[status] || nice(status));
  const dateLabel = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const projectTeam = (project) => {
    const memberIds = new Set(state.data.project_members.filter((member) => String(member.project_id) === String(project.id)).map((member) => String(member.profile_id)));
    const people = state.data.profiles.filter((profile) => memberIds.has(String(profile.id)) || String(profile.auth_user_id) === String(project.owner_user_id));
    const names = people.map((person) => person.name || person.email).filter(Boolean);
    return names.length ? names : (project.project_manager ? [project.project_manager] : []);
  };
  const stat = (label, value, icon, tone, note) => `<article class="project-reference-stat ${tone}"><span class="project-reference-stat-icon">${crmProjectIcon(icon)}</span><div class="project-reference-stat-content"><p>${label}</p><strong>${value}</strong><div class="project-reference-stat-notes"><span><i></i>${note}</span></div></div></article>`;
  const rows = filteredProjects.map((project) => {
    const progressValue = Math.max(0, Math.min(100, Number(project.progress || 0)));
    const budget = Number(project.budget || 0);
    const client = project.client_name || clientName(project.client_id) || 'Internal project';
    const team = projectTeam(project);
    const teamLabel = team.length ? team.slice(0, 2).join(', ') : 'Unassigned';
    const teamExtra = team.length > 2 ? ` +${team.length - 2}` : '';
    const statusToneClass = isAtRiskProject(project) ? 'red' : statusTone(project.status);
    const menuId = `project-menu-${project.id}`;
    return `<tr class="project-reference-row" data-resource="projects" data-row-id="${project.id}">
      <td class="project-reference-select-cell" data-label="Select"><input type="checkbox" data-row-select aria-label="Select ${escapeHtml(project.name)}" /></td>
      <td data-label="Project"><div class="project-reference-name"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.summary || 'No summary added yet.')}</small></div></td>
      <td data-label="Client"><div class="project-reference-client"><span>${crmProjectIcon('clients')}</span><strong>${escapeHtml(client)}</strong></div></td>
      <td data-label="Progress"><div class="project-reference-progress"><strong>${progressValue}%</strong><span><i style="width:${progressValue}%"></i></span></div></td>
      <td data-label="Status"><span class="project-reference-status ${statusToneClass}"><i></i>${escapeHtml(statusLabel(project.status))}</span></td>
      <td data-label="Team"><div class="project-reference-team"><span class="project-reference-team-avatars">${team.slice(0, 3).map((person) => `<i title="${escapeHtml(person)}">${escapeHtml(String(person).trim().slice(0, 1).toUpperCase())}</i>`).join('') || '<i class="is-empty">—</i>'}</span><strong>${escapeHtml(teamLabel)}${teamExtra}</strong></div></td>
      ${isEmployee() ? '' : `<td data-label="Budget"><div class="project-reference-budget"><strong>${compactMoney(budget)}</strong><small>${Number(project.expenses || 0) ? `${compactMoney(project.expenses)} spent` : 'No spend recorded'}</small></div></td>`}
      <td data-label="Due date" class="project-reference-due">${dateLabel(project.due_date)}</td>
      <td data-label="Actions"><div class="project-reference-actions"><button class="project-reference-more" data-project-menu-trigger="${project.id}" type="button" aria-controls="${menuId}" aria-label="Actions for ${escapeHtml(project.name)}" aria-expanded="false">${crmProjectIcon('more')}</button><div class="project-reference-menu" id="${menuId}" data-project-menu-panel="${project.id}"><button data-project-detail="${project.id}" type="button">View details</button><button data-project-files-open="${project.id}" type="button">Open files</button>${canUpdate('projects') ? `<button data-edit-resource="projects" data-edit-id="${project.id}" type="button">Edit project</button>` : ''}${canWrite('projects') ? `<button class="danger" data-delete-resource="projects" data-delete-id="${project.id}" type="button">Delete</button>` : ''}</div></div></td>
    </tr>`;
  }).join('');
  const tabs = [['', 'All Projects', allProjects.length], ['active', 'Active', activeProjectCount], ['at_risk', 'At Risk', atRiskCount], ['completed', 'Completed', completedCount]].map(([key, label, count]) => `<button type="button" class="project-reference-tab${statusFilter === key ? ' active' : ''}" data-project-status-tab="${key}" role="tab" aria-selected="${statusFilter === key ? 'true' : 'false'}">${label}<small>${count}</small></button>`).join('');

  replaceSafeMarkup(els.view, `<section class="project-reference-header"><div><h1>Project Management</h1><p>Plan. Track. Collaborate. Deliver.</p></div>${canWrite('projects') ? '<button class="project-reference-header-action crm-button primary" data-create="projects" type="button">+ New Project</button>' : ''}</section>
    <section class="project-reference-stats" aria-label="Project overview">${stat('Total Projects', allProjects.length, 'folder', 'blue', 'Live workspace total')}${stat('Active Projects', activeProjectCount, 'layers', 'green', 'Planning, active, and review')}${stat('At Risk', atRiskCount, 'tickets', 'red', atRiskCount ? 'Needs attention' : 'No risk flags')}${stat('Completed', completedCount, 'reports', 'green', 'Delivered projects')}${stat('Milestones', milestoneCount, 'calendar', 'purple', 'From linked milestone data')}</section>
    <nav class="project-reference-tabs" aria-label="Project status filters">${tabs}</nav>
    <section class="project-reference-table-card"><header class="project-reference-table-head"><div class="project-reference-table-title"><span>${crmProjectIcon('folder')}</span><div><h2>All Projects</h2><p>Every project at a glance</p></div></div><div class="project-reference-table-tools"><label><span class="sr-only">Search projects</span><b>${crmProjectIcon('reports')}</b><input id="pm-search" type="search" placeholder="Search projects..." value="${escapeHtml(searchQ)}" /></label><select id="project-status-filter" aria-label="Filter projects by status"><option value="">All Statuses</option><option value="planning" ${statusFilter === 'planning' ? 'selected' : ''}>Planning</option><option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option><option value="review" ${statusFilter === 'review' ? 'selected' : ''}>In Review</option><option value="on_hold" ${statusFilter === 'on_hold' ? 'selected' : ''}>On Hold</option><option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed</option><option value="at_risk" ${statusFilter === 'at_risk' ? 'selected' : ''}>At Risk</option></select><button class="project-reference-filter-button" type="button" data-project-clear-filters ${!statusFilter && !searchQ ? 'disabled' : ''}>Clear filters</button></div></header><div class="project-reference-table-wrap"><table class="project-reference-table"><thead><tr><th aria-label="Select"></th><th>PROJECT</th><th>CLIENT</th><th>PROGRESS</th><th>STATUS</th><th>TEAM</th>${isEmployee() ? '' : '<th>BUDGET</th>'}<th>DUE DATE</th><th>ACTIONS</th></tr></thead><tbody>${rows || `<tr><td colspan="${isEmployee() ? '8' : '9'}"><p class="crm-empty">No projects found.</p></td></tr>`}</tbody></table></div></section>`);

}

export function renderProjectDetail(project, context) {
  const {
    state,
    canWrite,
    canUpdate,
    isEmployee,
    crmProjectIcon,
    escapeHtml,
    clientName,
    compactMoney,
    daysUntil,
    dueBadge,
    badge,
    statusTone,
  } = context;
  if (!project) return '<div class="crm-empty">Select a project to view details.</div>';
  const budget = Number(project.budget || 0);
  const spent = Number(project.expenses || 0);
  const revenue = Number(project.revenue || 0);
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
  const pctColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  const tickets = state.data.tickets.filter((ticket) => String(ticket.project_id) === String(project.id));
  const openTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status));
  const days = daysUntil(project.due_date);
  const healthMap = { on_track: { label: 'On Track', color: '#22c55e' }, watch: { label: 'Watch', color: '#f59e0b' }, at_risk: { label: 'At Risk', color: '#ef4444' }, breached: { label: 'Breached', color: '#dc2626' } };
  const health = healthMap[project.health] || { label: project.health || 'Unknown', color: '#94a3b8' };
  const assignedPeople = [...new Set(state.data.project_members
    .filter((member) => String(member.project_id) === String(project.id))
    .map((member) => String(member.profile_id)))]
    .map((profileId) => state.data.profiles.find((profile) => String(profile.id) === profileId))
    .filter(Boolean);
  return `<div class="pm-detail">
    <div class="pm-detail-hero"><div class="pm-detail-icon">${crmProjectIcon('folder')}</div><div style="flex:1;min-width:0;"><h2 class="pm-detail-title">${escapeHtml(project.name)}</h2><p class="pm-detail-client">${escapeHtml(project.client_name || clientName(project.client_id) || '—')}</p></div><span style="width:10px;height:10px;border-radius:50%;background:${health.color};flex-shrink:0;margin-top:6px;" title="${escapeHtml(health.label)}"></span></div>
    <div class="pm-detail-badges">${badge(project.status)}<span style="font-size:11px;font-weight:700;background:${health.color}18;color:${health.color};padding:2px 8px;border-radius:99px;">${escapeHtml(health.label)}</span>${days !== null ? dueBadge(project.due_date) : ''}</div>
    <div class="pm-detail-section"><div class="pm-detail-label">DELIVERY PROGRESS</div><div style="display:flex;align-items:center;gap:10px;margin-top:6px;"><div style="flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;"><div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:5px;"></div></div><span style="font-size:13px;font-weight:800;color:#1e293b;">${progress}%</span></div></div>
    ${isEmployee() ? '' : `<div class="pm-detail-section"><div class="pm-detail-label">BUDGET BURN</div><div style="display:flex;justify-content:space-between;margin-top:4px;margin-bottom:6px;"><span style="font-size:12px;color:#64748b;">Spent: <strong style="color:#1e293b;">${compactMoney(spent)}</strong></span><span style="font-size:12px;color:#64748b;">Budget: <strong style="color:#1e293b;">${compactMoney(budget)}</strong></span></div><div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pctColor};border-radius:4px;"></div></div><div style="display:flex;justify-content:space-between;margin-top:4px;"><span style="font-size:10px;color:#94a3b8;">${pct}% consumed</span><span style="font-size:10px;color:${revenue > 0 ? '#22c55e' : '#94a3b8'};">Revenue: ${compactMoney(revenue)}</span></div></div>`}
    <div class="pm-detail-section"><div class="pm-detail-label">PROJECT INFO</div><div class="pm-info-grid"><div class="pm-info-row"><span>Manager</span><strong>${escapeHtml(project.project_manager || '—')}</strong></div><div class="pm-info-row"><span>Deadline</span><strong>${project.due_date ? new Date(project.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></div><div class="pm-info-row"><span>Open Tickets</span><strong style="color:${openTickets.length ? '#ef4444' : '#22c55e'}">${openTickets.length} / ${tickets.length}</strong></div><div class="pm-info-row"><span>Health</span><strong style="color:${health.color}">${escapeHtml(health.label)}</strong></div></div></div>
    <div class="pm-detail-section"><div class="pm-detail-label">DELIVERY PEOPLE (${assignedPeople.length})</div><div class="pm-assigned-people">${assignedPeople.map((person) => `<div class="pm-assigned-person"><span class="pm-assigned-avatar">${escapeHtml((person.name || person.email || '?').slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(person.name || person.email || 'Unnamed user')}</strong><small>${escapeHtml([person.role === 'company_admin' ? 'Admin' : 'Employee', person.department, person.email].filter(Boolean).join(' · '))}</small></span></div>`).join('') || '<p class="pm-assigned-empty">No delivery people assigned yet.</p>'}</div></div>
    ${project.summary || project.notes ? `<div class="pm-detail-section"><div class="pm-detail-label">OVERVIEW</div><p style="font-size:12px;line-height:1.7;color:#475569;margin-top:6px;">${escapeHtml(project.summary || project.notes)}</p></div>` : ''}
    ${openTickets.length ? `<div class="pm-detail-section"><div class="pm-detail-label">OPEN TICKETS</div>${openTickets.slice(0, 3).map((ticket) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:12px;color:#1e293b;">#TIC-${ticket.id} — ${escapeHtml((ticket.subject || '').slice(0, 40))}</span>${badge(ticket.priority, statusTone(ticket.priority))}</div>`).join('')}</div>` : ''}
    <div class="pm-detail-actions">${canUpdate('projects') ? `<button class="crm-button primary" data-edit-resource="projects" data-edit-id="${project.id}" type="button">${isEmployee() ? 'Update Delivery' : 'Edit Project'}</button>` : ''}<button class="crm-button" data-jump="${isEmployee() ? 'files' : 'tickets'}" type="button">${isEmployee() ? 'Project Files' : 'View Tickets'}</button>${canWrite('projects') ? '<button class="crm-button" data-create="invoices" type="button">New Invoice</button>' : ''}</div>
  </div>`;
}

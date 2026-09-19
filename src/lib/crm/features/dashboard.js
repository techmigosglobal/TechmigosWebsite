import { replaceSafeMarkup } from '../safeMarkup.js';

function clampProgress(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function renderDashboard({
  state,
  els,
  isEmployee,
  pageHead,
  metric,
  canWrite,
  crmProjectIcon,
  escapeHtml,
  clientName,
  incomeRows,
  expenseRows,
  sumAmounts,
  outstandingInvoiceRows,
  compactMoney,
}) {
  if (isEmployee()) {
    return renderEmployeeDashboard({ state, els, pageHead, crmProjectIcon, escapeHtml, clientName });
  }

  const projects = state.data.projects || [];
  const tickets = state.data.tickets || [];
  const collectedIncome = incomeRows();
  const settledExpenses = expenseRows();
  const income = sumAmounts(collectedIncome);
  const expenses = sumAmounts(settledExpenses);
  const openTickets = tickets.filter((item) => !['resolved', 'closed'].includes(item.status));
  const receivableRows = outstandingInvoiceRows();
  const receivable = sumAmounts(receivableRows);
  const activeProjects = projects.filter((project) => ['active', 'review', 'planning'].includes(project.status));
  const monthTrend = { months: [], incomeByMonth: [], expenseByMonth: [] };

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthTrend.months.push(date.toLocaleString('en-IN', { month: 'short', year: '2-digit' }));
    monthTrend.incomeByMonth.push(collectedIncome
      .filter((item) => String(item.transaction_date || item.created_at || '').startsWith(key))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0));
    monthTrend.expenseByMonth.push(settledExpenses
      .filter((item) => String(item.transaction_date || item.created_at || '').startsWith(key))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0));
  }

  replaceSafeMarkup(els.view, `${pageHead(
    'Operations Dashboard',
    `${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — Welcome back, ${state.profile?.name || 'Team'}.`,
    `<div class="dashboard-welcome-note"><span class="dashboard-welcome-icon">${crmProjectIcon('layers')}</span><span>Great things happen with<br />focused teams.</span></div>`,
  )}
    <div class="crm-grid crm-kpis dashboard-reference-kpis">
      ${metric('Active Projects', activeProjects.length, crmProjectIcon('folder'), 'blue', `${projects.filter((project) => project.status === 'completed').length} completed`)}
      ${metric('Open Tickets', openTickets.length, crmProjectIcon('tickets'), openTickets.length ? 'red' : 'green', openTickets.length ? `${openTickets.length} in queue` : 'Queue clear')}
      ${metric('Revenue Collected', compactMoney(income), crmProjectIcon('currency'), 'green', `${compactMoney(expenses)} expenses`)}
      ${metric('Receivables', compactMoney(receivable), crmProjectIcon('reports'), receivable > 0 ? 'orange' : 'green', receivable > 0 ? `${receivableRows.length} outstanding invoices` : 'All invoices settled')}
    </div>
    <div class="dashboard-reference-main">
      <section class="crm-card dashboard-reference-card dashboard-revenue-card"><div class="crm-card-head"><h2 class="crm-card-title">Revenue vs Expenses (6 months)</h2><button class="crm-link dashboard-period-link" data-jump="finance" type="button">Last 6 months <span aria-hidden="true">⌄</span></button></div><div class="dashboard-reference-chart-wrap"><canvas id="dash-revenue-chart"></canvas></div></section>
      <section class="crm-card dashboard-reference-card dashboard-focus-card"><div class="dashboard-focus-heading"><span class="dashboard-focus-icon" aria-hidden="true">${crmProjectIcon('layers')}</span><div><h2 class="crm-card-title">Today's Focus</h2><p>Quick actions to keep things moving.</p></div></div><div class="dashboard-focus-actions">${canWrite('projects') ? `<button class="dashboard-focus-action primary" data-create="projects" type="button"><span aria-hidden="true">${crmProjectIcon('folder')}</span>New Project</button>` : ''}${canWrite('tickets') ? `<button class="dashboard-focus-action" data-create="tickets" type="button"><span aria-hidden="true">${crmProjectIcon('tickets')}</span>New Ticket</button>` : ''}${canWrite('clients') ? `<button class="dashboard-focus-action" data-create="clients" type="button"><span aria-hidden="true">${crmProjectIcon('clients')}</span>Add Client</button>` : ''}<button class="dashboard-focus-action" data-jump="reports" type="button"><span aria-hidden="true">${crmProjectIcon('reports')}</span>Open Reports</button></div></section>
    </div>`);

  requestAnimationFrame(() => {
    const context = document.getElementById('dash-revenue-chart')?.getContext('2d');
    if (!context || !window.Chart) return;
    new window.Chart(context, {
      type: 'line',
      data: { labels: monthTrend.months, datasets: [
        { label: 'Revenue', data: monthTrend.incomeByMonth, borderColor: '#22c55e', backgroundColor: '#22c55e22', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#22c55e', borderWidth: 2 },
        { label: 'Expenses', data: monthTrend.expenseByMonth, borderColor: '#ef4444', backgroundColor: '#ef444422', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ef4444', borderWidth: 2 },
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } } }, scales: { y: { ticks: { font: { size: 10 }, callback: (value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}` }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } } },
    });
  });
}

export function renderEmployeeDashboard(context) {
  return renderEmployeeProjectView(context);
}

export function renderEmployeeProjectView({ state, els, pageHead, crmProjectIcon, escapeHtml, clientName }) {
  els.view.classList.remove('employee-projects-view');
  const projects = state.data.projects || [];
  const activeProjects = projects.filter((project) => ['planning', 'active', 'review'].includes(project.status));
  const assignedFiles = (state.data.project_files || []).length;
  const employeeMetric = (label, value, icon, tone, note) => `<article class="crm-card employee-summary-card"><span class="employee-summary-icon ${tone}">${crmProjectIcon(icon)}</span><div><p>${label}</p><strong>${value}</strong><small>${note}</small></div></article>`;
  const rows = projects.map((project) => {
    const value = clampProgress(project.progress);
    return `<div class="employee-project-row"><button class="employee-project-main" data-jump="projects" type="button"><span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.client_name || clientName(project.client_id) || 'Internal project')}</small></span></button><div class="employee-project-progress"><span><i style="width:${value}%"></i></span><strong>${value}%</strong></div><button class="employee-project-files" data-project-files-open="${project.id}" type="button">Project files</button></div>`;
  }).join('');

  replaceSafeMarkup(els.view, `<div class="employee-workspace-view">
    ${pageHead('My project workspace', 'View the project details and documents assigned to your employee account.', '')}
    <div class="employee-summary-grid" aria-label="Employee workspace summary">
      ${employeeMetric('Assigned projects', projects.length, 'folder', 'green', `${activeProjects.length} active`)}
      ${employeeMetric('Project files', assignedFiles, 'reports', 'blue', 'Assigned documents')}
    </div>
    <section class="crm-card employee-assigned-projects"><div class="crm-card-head"><h2 class="crm-card-title">My assigned projects</h2><span class="employee-projects-note">Project details and files only</span></div><div class="employee-project-list">${rows || '<p class="crm-empty">No projects are assigned yet.</p>'}</div></section>
  </div>`);
}

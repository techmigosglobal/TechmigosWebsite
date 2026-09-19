import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderAnalytics(context) {
  const { state, els, isEmployee, incomeRows, expenseRows, sumAmounts, groupCount, escapeHtml, nice, compactMoney, invoiceBalance, metric, crmProjectIcon, pageHead, currentWeekLabel, employeesFromState } = context;
  const employeeWorkspace = isEmployee();
  const collectedIncome = employeeWorkspace ? [] : incomeRows();
  const settledExpenses = employeeWorkspace ? [] : expenseRows();
  const tickets = state.data.tickets;
  const projects = state.data.projects;
  const employees = employeeWorkspace ? [] : employeesFromState();

  const income = sumAmounts(collectedIncome);
  const expenses = sumAmounts(settledExpenses);
  const openTickets = tickets.filter((t) => !['resolved','closed'].includes(t.status)).length;
  const resolvedTickets = tickets.filter((t) => ['resolved','closed'].includes(t.status)).length;
  const resolutionRate = tickets.length ? Math.round((resolvedTickets / tickets.length) * 100) : 0;
  const activeProjects = projects.filter((p) => ['planning','active','review'].includes(p.status)).length;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length)
    : 0;
  const assignedFiles = (state.data.project_files || []).length;

  // Build monthly revenue/expense data (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('en', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });
  const monthlyRevenue = months.map(({ year, month }) =>
    collectedIncome.filter((f) => { const d = new Date(f.transaction_date || f.created_at || ''); return d.getFullYear() === year && d.getMonth() === month; }).reduce((s, f) => s + Number(f.amount || 0), 0)
  );
  const monthlyExpense = months.map(({ year, month }) =>
    settledExpenses.filter((f) => { const d = new Date(f.transaction_date || f.created_at || ''); return d.getFullYear() === year && d.getMonth() === month; }).reduce((s, f) => s + Number(f.amount || 0), 0)
  );

  // Project status breakdown
  const projectGroups = groupCount(projects, 'status');
  const ticketGroups = { Open: openTickets, Resolved: resolvedTickets, 'In Progress': tickets.filter((t) => t.status === 'in_progress').length, Waiting: tickets.filter((t) => t.status === 'waiting').length };
  const projectLegendColors = ['#f59e0b', '#6366f1', '#10b981', '#94a3b8', '#14b8a6'];
  const projectLegend = Object.entries(projectGroups).map(([key, value], index) => `<div class="analytics-project-legend-row"><span class="analytics-project-legend-dot" style="background:${projectLegendColors[index % projectLegendColors.length]}"></span><span>${escapeHtml(nice(key))}</span><strong>${value}</strong></div>`).join('');
  const teamRows = employees.map((employee) => {
    const projectCount = projects.filter((project) => project.project_manager === employee.name || project.owner_user_id === employee.auth_user_id).length;
    const ticketCount = tickets.filter((ticket) => ticket.assigned_to === employee.name).length;
    return `<div class="analytics-team-row"><div class="analytics-team-row-head"><strong>${escapeHtml(employee.name || employee.email)}</strong><span>${projectCount} ${projectCount === 1 ? 'project' : 'projects'} · ${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}</span></div></div>`;
  }).join('');
  const ticketStatusBody = tickets.length
    ? `<div class="analytics-ticket-chart"><canvas id="analytics-tickets-chart"></canvas></div><div class="analytics-ticket-legend">${Object.entries(ticketGroups).filter(([, value]) => value > 0).map(([key, value], index) => `<div><span class="analytics-ticket-legend-dot" style="background:${['#6366f1', '#22c55e', '#f59e0b', '#ef4444'][index % 4]}"></span><span>${key}</span><strong>${value}</strong></div>`).join('')}</div>`
    : `<div class="analytics-ticket-empty"><span class="analytics-ticket-empty-icon">${crmProjectIcon('tickets')}</span><strong>No active support tickets</strong><span>All caught up! Great work!</span></div>`;
  const primaryAnalyticsCard = employeeWorkspace
    ? `<section class="crm-card analytics-card analytics-revenue-card"><div class="crm-card-head"><h2 class="crm-card-title">Delivery Progress</h2><span class="analytics-card-note">Assigned projects</span></div><div class="analytics-delivery-progress-list">${projects.map((project) => `<div class="analytics-delivery-progress-row"><div><strong>${escapeHtml(project.name || 'Untitled project')}</strong><span>${escapeHtml(project.status || 'unclassified')}</span></div><div class="analytics-team-track"><i style="width:${Math.max(0, Math.min(100, Number(project.progress || 0)))}%;background:#6366f1"></i></div><b>${Math.max(0, Math.min(100, Number(project.progress || 0)))}%</b></div>`).join('') || '<p class="crm-empty">No assigned projects yet.</p>'}</div></section>`
    : `<section class="crm-card analytics-card analytics-revenue-card"><div class="crm-card-head"><h2 class="crm-card-title">Revenue vs Expenses</h2><span class="analytics-card-note">Last 6 months</span></div><div class="analytics-chart-area analytics-revenue-chart-area"><canvas id="analytics-revenue-chart"></canvas></div></section>`;
  const financeAnalyticsCard = employeeWorkspace ? '' : `<section class="crm-card analytics-card analytics-finance-card"><div class="crm-card-head"><h2 class="crm-card-title">Finance Breakdown</h2></div><div class="analytics-finance-list"><div><span>Total Income</span><strong class="is-positive">${compactMoney(income)}</strong></div><div><span>Total Expenses</span><strong class="is-negative">${compactMoney(expenses)}</strong></div><div><span>Net Profit</span><strong class="${income >= expenses ? 'is-positive' : 'is-negative'}">${compactMoney(income - expenses)}</strong></div><div><span>Pending Invoices</span><strong class="is-warning">${state.data.invoices.filter((i) => invoiceBalance(i) > 0).length}</strong></div><div><span>Settled Transactions</span><strong>${collectedIncome.length + settledExpenses.length}</strong></div></div></section>`;
  const teamAnalyticsCard = employeeWorkspace ? '' : `<section class="crm-card analytics-card analytics-team-card"><div class="crm-card-head"><h2 class="crm-card-title">Team Assignments</h2></div><div class="analytics-team-list">${teamRows || '<p class="crm-empty">No team members.</p>'}</div></section>`;
  const analyticsKpis = employeeWorkspace
    ? `${metric('Assigned Projects', projects.length, crmProjectIcon('folder'), 'blue', `${activeProjects} active`)}${metric('Average Delivery', `${averageProgress}%`, crmProjectIcon('chart'), averageProgress >= 70 ? 'green' : 'orange', 'Across assigned projects')}${metric('Open Tickets', openTickets, crmProjectIcon('tickets'), openTickets ? 'orange' : 'green', openTickets ? 'Needs attention' : 'Queue clear')}${metric('Project Files', assignedFiles, crmProjectIcon('reports'), 'blue', 'Assigned documents')}`
    : `${metric('Total Revenue', compactMoney(income), crmProjectIcon('currency'), 'green', `${compactMoney(expenses)} in expenses`)}${metric('Net Profit', compactMoney(income - expenses), crmProjectIcon('reports'), income >= expenses ? 'green' : 'red', income >= expenses ? 'profitable' : 'expenses exceed income')}${metric('Ticket Resolution', resolutionRate + '%', crmProjectIcon('tickets'), resolutionRate >= 80 ? 'green' : 'orange', `${openTickets} still open`)}${metric('Active Projects', activeProjects, crmProjectIcon('folder'), 'blue', `${projects.filter((p) => p.health === 'at_risk').length} at risk`)}`;

  replaceSafeMarkup(els.view, `
    <div class="crm-analytics-page">
      ${pageHead(employeeWorkspace ? 'Delivery Analytics' : 'Analytics Dashboard', employeeWorkspace ? 'Live insights for projects, files, and support work assigned to your employee account.' : 'Live performance insights across projects, support, finance, and team.', `<button class="crm-button" id="analytics-period" type="button">${currentWeekLabel()}</button>`)}
      <div class="crm-grid crm-kpis analytics-kpis">
        ${analyticsKpis}
      </div>
      <div class="analytics-reference-middle">
        ${primaryAnalyticsCard}
        <section class="crm-card analytics-card analytics-project-health-card">
          <div class="crm-card-head"><h2 class="crm-card-title">Project Health</h2></div>
          <div class="analytics-project-chart"><canvas id="analytics-projects-chart"></canvas><div class="analytics-donut-center"><strong>${projects.length}</strong><span>Total Projects</span></div></div>
          <div class="analytics-project-legend">${projectLegend || '<p class="crm-empty">No projects.</p>'}</div>
        </section>
        ${financeAnalyticsCard}
      </div>
      <div class="analytics-reference-bottom">
        ${teamAnalyticsCard}
        <section class="crm-card analytics-card analytics-ticket-card">
          <div class="crm-card-head"><h2 class="crm-card-title">Ticket Status</h2></div>
          ${ticketStatusBody}
        </section>
      </div>
    </div>`);

  // Render Chart.js charts
  requestAnimationFrame(() => {
    const chartColors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#10b981','#8b5cf6'];
    // Revenue vs Expenses Bar chart
    const rCtx = document.getElementById('analytics-revenue-chart')?.getContext('2d');
    if (rCtx && window.Chart) {
      new window.Chart(rCtx, {
        type: 'bar',
        data: { labels: months.map((m) => m.label), datasets: [{ label: 'Revenue', data: monthlyRevenue, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 }, { label: 'Expenses', data: monthlyExpense, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { y: { ticks: { font: { size: 10 }, callback: (v) => '&#8377;' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } } },
      });
    }
    // Tickets donut
    const tCtx = document.getElementById('analytics-tickets-chart')?.getContext('2d');
    if (tCtx && window.Chart) {
      const tEntries = Object.entries(ticketGroups).filter(([,v]) => v > 0);
      new window.Chart(tCtx, {
        type: 'doughnut',
        data: { labels: tEntries.map(([k]) => k), datasets: [{ data: tEntries.map(([,v]) => v), backgroundColor: chartColors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } },
      });
    }
    // Projects donut
    const pCtx = document.getElementById('analytics-projects-chart')?.getContext('2d');
    if (pCtx && window.Chart) {
      const pEntries = Object.entries(projectGroups);
      new window.Chart(pCtx, {
        type: 'doughnut',
        data: { labels: pEntries.map(([k]) => nice(k)), datasets: [{ data: pEntries.map(([,v]) => v), backgroundColor: projectLegendColors, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } },
      });
    }
  });
}

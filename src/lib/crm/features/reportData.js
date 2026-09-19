function reportDate(row, keys) {
  for (const key of keys) {
    if (row[key]) return String(row[key]).slice(0, 10);
  }
  return '';
}

function inReportRange(row, state, keys = ['created_at']) {
  const date = reportDate(row, keys);
  if (!date) return true;
  return (!state.reportFrom || date >= state.reportFrom) && (!state.reportTo || date <= state.reportTo);
}

export function buildReportDefinitions({
  state,
  isEmployee,
  incomeRows,
  expenseRows,
  sumAmounts,
  outstandingInvoiceAmount,
  compactMoney,
  clientName,
  ensureReportDates,
}) {
  ensureReportDates();
  const employeeWorkspace = isEmployee();
  // Route policy and repository scope already keep these collections out of an
  // employee snapshot. Keep the selector defensive as well so a stale cache or
  // an injected browser state can never become an exported finance report.
  const finances = employeeWorkspace ? [] : state.data.finances.filter((row) => inReportRange(row, state, ['transaction_date', 'created_at']));
  const invoices = employeeWorkspace ? [] : state.data.invoices.filter((row) => inReportRange(row, state, ['invoice_date', 'created_at']));
  const projects = state.data.projects.filter((row) => inReportRange(row, state, ['created_at', 'due_date']));
  const tickets = state.data.tickets.filter((row) => inReportRange(row, state));
  const clients = employeeWorkspace ? [] : state.data.clients.filter((row) => inReportRange(row, state));
  const collectedIncome = incomeRows(finances, invoices);
  const settledExpenses = expenseRows(finances);
  const income = sumAmounts(collectedIncome);
  const expenses = sumAmounts(settledExpenses);
  const invoiceTotal = invoices.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const invoiceOutstanding = outstandingInvoiceAmount(invoices, finances);
  const openTickets = tickets.filter((item) => !['resolved', 'closed'].includes(item.status));
  const resolvedTickets = tickets.filter((item) => ['resolved', 'closed'].includes(item.status));
  const highPriorityTickets = tickets.filter((item) => ['urgent', 'high'].includes(item.priority));

  return {
    executive: {
      title: employeeWorkspace ? 'Assigned Work Summary Report' : 'Executive Summary Report',
      subtitle: employeeWorkspace ? 'Assigned projects and support activity for the selected period.' : 'Company-wide snapshot across projects, support, finance, and clients.',
      metrics: employeeWorkspace
        ? [
          ['Assigned Projects', projects.length, 'folder', 'blue'],
          ['Average Progress', `${projects.length ? Math.round(projects.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projects.length) : 0}%`, 'chart', 'green'],
          ['Open Tickets', openTickets.length, 'tickets', 'orange'],
          ['Project Files', state.data.project_files.length, 'reports', 'blue'],
        ]
        : [
          ['Revenue', compactMoney(income), 'currency', 'green'],
          ['Expenses', compactMoney(expenses), 'reports', 'red'],
          ['Open Tickets', openTickets.length, 'tickets', 'orange'],
          ['Active Projects', state.data.projects.filter((item) => ['planning', 'active', 'review'].includes(item.status)).length, 'folder', 'blue'],
        ],
      columns: [['area', 'Area'], ['value', 'Value'], ['notes', 'Notes']],
      rows: employeeWorkspace
        ? [
          { area: 'Assigned projects', value: projects.length, notes: `${projects.filter((item) => item.health === 'at_risk').length} need attention` },
          { area: 'Delivery progress', value: `${projects.length ? Math.round(projects.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projects.length) : 0}%`, notes: 'Average across assigned projects' },
          { area: 'Support tickets', value: tickets.length, notes: `${highPriorityTickets.length} high priority` },
          { area: 'Project files', value: state.data.project_files.length, notes: 'Documents available in assigned projects' },
        ]
        : [
          { area: 'Projects', value: state.data.projects.length, notes: `${state.data.projects.filter((item) => item.health === 'at_risk').length} at risk` },
          { area: 'Finance', value: compactMoney(income - expenses), notes: 'Net after settled transactions' },
          { area: 'Invoices', value: compactMoney(invoiceOutstanding), notes: 'Outstanding balance' },
          { area: 'Tickets', value: tickets.length, notes: `${highPriorityTickets.length} high priority` },
          { area: 'Clients', value: clients.length, notes: `${clients.filter((item) => item.status === 'active').length} active` },
        ],
    },
    finance: {
      title: 'Finance Report',
      subtitle: 'Invoices, income, expense, salary, and payment status in the selected period.',
      metrics: [
        ['Income', compactMoney(income), 'currency', 'green'],
        ['Expenses', compactMoney(expenses), 'reports', 'red'],
        ['Invoice Total', compactMoney(invoiceTotal), 'folder', 'blue'],
        ['Outstanding', compactMoney(invoiceOutstanding), 'tickets', 'orange'],
      ],
      columns: [['date', 'Date'], ['type', 'Type'], ['title', 'Title'], ['client', 'Client'], ['amount', 'Amount'], ['status', 'Status'], ['proof', 'Proof']],
      rows: [
        ...finances.map((item) => ({
          date: item.transaction_date || String(item.created_at || '').slice(0, 10),
          type: item.transaction_type,
          title: item.title || item.reference_id || '-',
          client: item.client || '-',
          amount: compactMoney(item.amount),
          status: item.status || '-',
          proof: item.proof_url ? 'Attached' : '-',
        })),
        ...invoices.map((item) => ({
          date: item.invoice_date || String(item.created_at || '').slice(0, 10),
          type: 'invoice',
          title: item.invoice_number || item.service_title || '-',
          client: item.customer_name || clientName(item.client_id),
          amount: compactMoney(item.total_amount),
          status: item.status || '-',
          proof: item.sign_url ? 'Signed' : '-',
        })),
      ],
    },
    projects: {
      title: 'Projects Report',
      subtitle: employeeWorkspace ? 'Assigned project status, progress, and delivery health.' : 'Project status, owner, budget, progress, and delivery health.',
      metrics: employeeWorkspace
        ? [
          ['Assigned Projects', projects.length, 'folder', 'blue'],
          ['Completed', projects.filter((item) => item.status === 'completed').length, 'reports', 'green'],
          ['At Risk', projects.filter((item) => ['watch', 'at_risk', 'breached'].includes(item.health)).length, 'tickets', 'orange'],
          ['Average Progress', `${projects.length ? Math.round(projects.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projects.length) : 0}%`, 'chart', 'blue'],
        ]
        : [
          ['Total Projects', projects.length, 'folder', 'blue'],
          ['Completed', projects.filter((item) => item.status === 'completed').length, 'reports', 'green'],
          ['At Risk', projects.filter((item) => ['watch', 'at_risk', 'breached'].includes(item.health)).length, 'tickets', 'orange'],
          ['Budget', compactMoney(projects.reduce((sum, item) => sum + Number(item.budget || 0), 0)), 'currency', 'blue'],
        ],
      columns: employeeWorkspace
        ? [['name', 'Project'], ['client', 'Client'], ['status', 'Status'], ['health', 'Health'], ['progress', 'Progress']]
        : [['name', 'Project'], ['client', 'Client'], ['manager', 'Manager'], ['status', 'Status'], ['health', 'Health'], ['progress', 'Progress'], ['budget', 'Budget']],
      rows: projects.map((item) => ({
        name: item.name,
        client: item.client_name || clientName(item.client_id),
        ...(employeeWorkspace ? {} : { manager: item.project_manager || '-' }),
        status: item.status,
        health: item.health,
        progress: `${Number(item.progress || 0)}%`,
        ...(employeeWorkspace ? {} : { budget: compactMoney(item.budget) }),
      })),
    },
    tickets: {
      title: 'Support Tickets Report',
      subtitle: 'Ticket load, priorities, assignments, and resolution status.',
      metrics: [
        ['Tickets', tickets.length, 'tickets', 'blue'],
        ['Open', openTickets.length, 'tickets', 'orange'],
        ['Resolved', resolvedTickets.length, 'reports', 'green'],
        ['Urgent', tickets.filter((item) => item.priority === 'urgent').length, 'tickets', 'red'],
      ],
      columns: [['id', 'Ticket'], ['subject', 'Subject'], ['client', 'Client'], ['priority', 'Priority'], ['assigned_to', 'Assigned To'], ['status', 'Status']],
      rows: tickets.map((item) => ({
        id: `TIC-${item.id}`,
        subject: item.subject,
        client: clientName(item.client_id),
        priority: item.priority,
        assigned_to: item.assigned_to || 'Unassigned',
        status: item.status,
      })),
    },
    clients: {
      title: 'Clients Report',
      subtitle: 'Client records, contacts, project count, and billing total.',
      metrics: [
        ['Clients', clients.length, 'clients', 'blue'],
        ['Active', clients.filter((item) => item.status === 'active').length, 'reports', 'green'],
        ['Engaged Clients', clients.filter((client) => projects.some((project) => String(project.client_id) === String(client.id))).length, 'clients', 'orange'],
        ['Archived', clients.filter((item) => item.status === 'archived').length, 'clients', 'red'],
      ],
      columns: [['company', 'Company'], ['name', 'Contact'], ['email', 'Email'], ['phone', 'Phone'], ['status', 'Status'], ['projects', 'Projects'], ['billing', 'Billing']],
      rows: clients.map((item) => ({
        company: item.company || item.name,
        name: item.name || '-',
        email: item.email || '-',
        phone: item.phone || '-',
        status: item.status || 'active',
        projects: state.data.projects.filter((project) => String(project.client_id) === String(item.id)).length,
        billing: compactMoney(state.data.invoices.filter((invoice) => String(invoice.client_id) === String(item.id)).reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)),
      })),
    },
  };
}

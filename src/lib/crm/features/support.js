import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderTickets(context) {
  const { state, els, assignedUserName, clientName, projectName, crmProjectIcon, canWrite, escapeHtml, renderTicketKanban = (tickets) => renderTicketKanbanView(tickets, context), renderTicketTable = (tickets) => renderTicketTableView(tickets, context) } = context;
  const view = state.ticketView || 'list';
  const ticketStatusFilter = state.ticketStatusFilter || '';
  const ticketPriorityFilter = state.ticketPriorityFilter || '';
  const ticketSearch = state.ticketSearch || '';
  const tickets = Array.isArray(state.data.tickets) ? state.data.tickets : [];
  const searchLower = ticketSearch.trim().toLowerCase();
  const isClosed = (ticket) => ['resolved', 'closed'].includes(String(ticket.status || '').toLowerCase());
  const filteredTickets = tickets.filter((ticket) => {
    if (ticketStatusFilter && ticket.status !== ticketStatusFilter) return false;
    if (ticketPriorityFilter && ticket.priority !== ticketPriorityFilter) return false;
    if (!searchLower) return true;
    return [ticket.subject, ticket.description, ticket.priority, ticket.status, assignedUserName(ticket), clientName(ticket.client_id), projectName(ticket.project_id)]
      .some((value) => String(value || '').toLowerCase().includes(searchLower));
  });

  const openTickets = tickets.filter((ticket) => !isClosed(ticket));
  const resolvedTickets = tickets.filter(isClosed);
  const unassignedTickets = openTickets.filter((ticket) => !ticket.assigned_user_id && !ticket.assigned_to);
  const icon = (name) => crmProjectIcon(name);
  const clockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3 2"></path></svg>';
  const alertIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 3.5 19h17L12 4Z"></path><path d="M12 9v4"></path><path d="M12 16h.01"></path></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"></path></svg>';
  const unassignedIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5M12 16h.01"></path></svg>';
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 4.3 4.3"></path></svg>';
  const metricCard = (title, value, note, tone, metricIcon) => `<article class="ticket-reference-kpi ticket-reference-kpi--${tone}">
    <div class="ticket-reference-kpi-icon">${metricIcon}</div>
    <div class="ticket-reference-kpi-content">
      <span class="ticket-reference-kpi-title">${title}</span>
      <strong class="ticket-reference-kpi-value">${value}</strong>
      <span class="ticket-reference-kpi-note">${note}</span>
    </div>
  </article>`;
  const emptyState = filteredTickets.length ? '' : `<div class="ticket-reference-empty">
    <div class="ticket-reference-empty-icon">${icon('tickets')}</div>
    <h3>${tickets.length ? 'No tickets match these filters' : 'No support tickets yet'}</h3>
    <p>${tickets.length ? 'Try changing the filters or search.' : 'All clear — new tickets will appear here.'}</p>
    ${canWrite('tickets') ? '<button class="ticket-reference-toolbar-button primary" data-create="tickets" type="button">+&nbsp; New Ticket</button>' : ''}
  </div>`;
  const ticketBody = filteredTickets.length
    ? (view === 'board'
      ? `<div class="ticket-reference-board">${renderTicketKanban(filteredTickets)}</div>`
      : `<div class="ticket-reference-table">${renderTicketTable(filteredTickets)}</div>`)
    : emptyState;
  replaceSafeMarkup(els.view, `
    <section class="ticket-reference-header">
      <h1>Support Tickets</h1>
      <p>Track, triage, assign, and resolve client support requests across all projects.</p>
    </section>
    <section class="ticket-reference-toolbar" aria-label="Ticket controls">
      <div class="ticket-reference-view-toggle">
        <button class="ticket-reference-view-button ${view === 'board' ? 'active' : ''}" id="tic-view-board" type="button" aria-pressed="${view === 'board'}">${icon('layers')}<span>Board</span></button>
        <button class="ticket-reference-view-button ${view === 'list' ? 'active' : ''}" id="tic-view-list" type="button" aria-pressed="${view === 'list'}">${icon('tickets')}<span>List</span></button>
      </div>
      <select class="ticket-reference-filter" id="tic-status-filter" aria-label="Filter by status">
        <option value="">All Statuses</option>
        <option value="open" ${ticketStatusFilter === 'open' ? 'selected' : ''}>Open</option>
        <option value="in_progress" ${ticketStatusFilter === 'in_progress' ? 'selected' : ''}>In Progress</option>
        <option value="waiting" ${ticketStatusFilter === 'waiting' ? 'selected' : ''}>Waiting</option>
        <option value="resolved" ${ticketStatusFilter === 'resolved' ? 'selected' : ''}>Resolved</option>
        <option value="closed" ${ticketStatusFilter === 'closed' ? 'selected' : ''}>Closed</option>
      </select>
      <select class="ticket-reference-filter" id="tic-priority-filter" aria-label="Filter by priority">
        <option value="">All Priorities</option>
        <option value="urgent" ${ticketPriorityFilter === 'urgent' ? 'selected' : ''}>Urgent</option>
        <option value="high" ${ticketPriorityFilter === 'high' ? 'selected' : ''}>High</option>
        <option value="medium" ${ticketPriorityFilter === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="low" ${ticketPriorityFilter === 'low' ? 'selected' : ''}>Low</option>
      </select>
      <label class="ticket-reference-search">
        ${searchIcon}
        <input id="tic-search" type="search" placeholder="Search tickets..." value="${escapeHtml(ticketSearch)}" aria-label="Search tickets" />
      </label>
      <button class="ticket-reference-toolbar-button" data-export="tickets" type="button">${icon('reports')}<span>Export</span></button>
      ${canWrite('tickets') ? '<button class="ticket-reference-toolbar-button primary" data-create="tickets" type="button">+&nbsp; New Ticket</button>' : ''}
    </section>
    <section class="ticket-reference-kpis" aria-label="Ticket metrics">
      ${metricCard('Total Tickets', tickets.length, `${openTickets.length} open`, 'green', clockIcon)}
      ${metricCard('Open Tickets', openTickets.length, `${openTickets.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length} high priority`, 'orange', alertIcon)}
      ${metricCard('Resolved', resolvedTickets.length, `${resolvedTickets.length ? tickets.length - resolvedTickets.length : 0} remaining`, 'green', checkIcon)}
      ${metricCard('Unassigned', unassignedTickets.length, unassignedTickets.length ? 'needs triage' : 'Queue is assigned', 'red', unassignedIcon)}
    </section>
    <section class="ticket-reference-main">
      <article class="ticket-reference-card ticket-reference-list-card">
        <header class="ticket-reference-card-head">
          <span class="ticket-reference-card-icon">${icon('tickets')}</span>
          <div><h2>Support Tickets</h2><p>Latest support tickets across all projects.</p></div>
        </header>
        ${ticketBody}
      </article>
      <aside class="ticket-reference-aside ticket-reference-aside--shortcuts">
        <article class="ticket-reference-card ticket-reference-side-card">
          <header class="ticket-reference-shortcut-head">
            <span class="ticket-reference-side-icon">${icon('layers')}</span>
            <div><h2>Support Shortcuts</h2><p>Quick actions to stay productive.</p></div>
          </header>
          <div class="ticket-reference-shortcuts">
            ${canWrite('tickets') ? '<button class="ticket-reference-shortcut ticket-reference-shortcut--green" data-create="tickets" type="button"><span class="ticket-reference-shortcut-icon">+</span><span><strong>New Ticket</strong><span>Create a support ticket</span></span></button>' : ''}
            <button class="ticket-reference-shortcut ticket-reference-shortcut--purple" data-jump="reports" type="button"><span class="ticket-reference-shortcut-icon">${icon('reports')}</span><span><strong>View Reports</strong><span>Ticket analytics</span></span></button>
          </div>
        </article>
      </aside>
    </section>`);

}

const TIC_PRIORITY_COLORS = { urgent: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' };
const TIC_PRIORITY_BG = { urgent: '#fee2e2', high: '#ffedd5', medium: '#fef3c7', low: '#dcfce7' };

function renderTicketKanbanView(allTickets, context) {
  const { state, assignedUserName, clientName, canUpdate, escapeHtml, nice } = context;
  const stages = [{ key: 'open', label: 'Open', color: '#ef4444' }, { key: 'in_progress', label: 'In Progress', color: '#f59e0b' }, { key: 'waiting', label: 'Waiting', color: '#6366f1' }, { key: 'resolved', label: 'Resolved', color: '#22c55e' }];
  const card = (ticket) => {
    const selected = String(ticket.id) === String(state.selectedTicketId);
    const color = TIC_PRIORITY_COLORS[ticket.priority] || '#94a3b8';
    const background = TIC_PRIORITY_BG[ticket.priority] || '#f1f5f9';
    return `<div class="tic-card ${selected ? 'tic-card--selected' : ''}" data-ticket-detail="${ticket.id}" data-resource="tickets" tabindex="0" role="button"><div class="tic-card-top"><span style="font-size:10px;font-weight:700;background:${background};color:${color};padding:2px 7px;border-radius:99px;">${nice(ticket.priority || 'low')}</span><span style="font-size:10px;color:#94a3b8;font-weight:600;">#${ticket.id}</span></div><div class="tic-card-subject">${escapeHtml(ticket.subject || 'Untitled')}</div><div class="tic-card-meta"><span>${escapeHtml(clientName(ticket.client_id) || '—')}</span>${ticket.assigned_user_id || ticket.assigned_to ? `<span style="color:#6366f1;font-weight:700;">@${escapeHtml(assignedUserName(ticket))}</span>` : '<span style="color:#94a3b8;">Unassigned</span>'}</div><div class="tic-card-actions">${canUpdate('tickets') ? `<button class="pm-btn-sm" data-quick-patch="tickets" data-quick-id="${ticket.id}" data-quick-field="status" data-quick-value="resolved" type="button" title="Resolve">✓</button>` : ''}${canUpdate('tickets') ? `<button class="pm-btn-sm" data-edit-resource="tickets" data-edit-id="${ticket.id}" type="button" title="Edit">✎</button>` : ''}</div></div>`;
  };
  return `<div class="pm-board">${stages.map(({ key, label, color }) => { const column = allTickets.filter((ticket) => ticket.status === key); return `<div class="pm-column"><div class="pm-col-head"><span class="pm-col-dot" style="background:${color}"></span><span class="pm-col-label">${label}</span><span class="pm-col-count">${column.length}</span></div><div class="pm-col-body" data-dnd-col="${key}" style="min-height:60px;">${column.map(card).join('') || '<div class="pm-empty-col">Empty</div>'}</div></div>`; }).join('')}</div>`;
}

function renderTicketTableView(allTickets, context) {
  const { state, clientName, assignedUserName, escapeHtml, table, rowActions, badge, nice } = context;
  const rows = allTickets.map((ticket) => { const selected = String(ticket.id) === String(state.selectedTicketId); const color = TIC_PRIORITY_COLORS[ticket.priority] || '#94a3b8'; return `<tr data-ticket-detail="${ticket.id}" data-resource="tickets" data-row-id="${ticket.id}" style="cursor:pointer;${selected ? 'background:#fafafe;' : ''}" tabindex="0"><td><input type="checkbox" data-row-select aria-label="Select ticket ${ticket.id}" /></td><td><span style="font-size:11px;font-weight:700;color:#94a3b8;">#${ticket.id}</span></td><td><strong>${escapeHtml(ticket.subject || '')}</strong></td><td><span style="font-size:11px;">${escapeHtml(clientName(ticket.client_id) || '—')}</span></td><td><span style="font-size:11px;font-weight:700;color:${color};padding:2px 7px;background:${TIC_PRIORITY_BG[ticket.priority] || '#f1f5f9'};border-radius:99px;">${nice(ticket.priority || 'low')}</span></td><td><span style="font-size:11px;color:#6366f1;">${escapeHtml(assignedUserName(ticket))}</span></td><td>${badge(ticket.status)}</td><td>${rowActions('tickets', ticket.id)}</td></tr>`; }).join('');
  return table(['', 'ID', 'Subject', 'Client', 'Priority', 'Assigned To', 'Status', 'Actions'], rows, 'No tickets found.');
}

export function renderTicketDetail(ticket, context) {
  const { state, assignedUserName, clientName, projectName, crmProjectIcon, canCreate, canUpdate, isEmployee, isCompanyAdmin, escapeHtml, badge, nice } = context;
  if (!ticket) return '<div class="crm-empty">Select a ticket to view details.</div>';
  const color = TIC_PRIORITY_COLORS[ticket.priority] || '#94a3b8';
  const messages = (state.data.ticket_messages || []).filter((message) => String(message.ticket_id) === String(ticket.id));
  const conversation = [ticket.description ? { author_name: clientName(ticket.client_id) || 'Requester', author_role: 'client', body: ticket.description, created_at: ticket.created_at, visibility: 'external' } : null, ...messages].filter(Boolean);
  const conversationHtml = conversation.length ? conversation.map((message) => `<article class="ticket-reference-message${message.author_role === 'client' ? ' ticket-reference-message--client' : ''}"><div class="ticket-reference-message-head"><strong>${escapeHtml(message.author_name || (message.author_role === 'client' ? 'Client' : 'Operations team'))}</strong><time>${escapeHtml(String(message.created_at || '').slice(0, 16).replace('T', ' '))}</time></div><p>${escapeHtml(message.body || '')}</p><small>${message.visibility === 'internal' ? 'Internal note' : 'External reply'}</small></article>`).join('') : '<p class="ticket-reference-conversation-empty">No conversation messages are recorded for this ticket.</p>';
  const replyForm = canCreate('ticket_messages') ? `<form class="ticket-reference-reply-form" data-ticket-message-form data-ticket-message-id="${escapeHtml(ticket.id)}"><label class="ticket-reference-reply-label" for="ticket-message-${escapeHtml(ticket.id)}">${isEmployee() ? 'Add internal note' : 'Send response'}</label><textarea id="ticket-message-${escapeHtml(ticket.id)}" name="message" required maxlength="10000" placeholder="${isEmployee() ? 'Write an internal delivery note for the team…' : 'Write a response for the client…'}"></textarea>${isCompanyAdmin() ? '<label class="ticket-reference-visibility">Visibility<select name="visibility"><option value="external">External reply (client can see)</option><option value="internal">Internal note (team only)</option></select></label>' : '<input type="hidden" name="visibility" value="internal" />'}<button class="crm-button primary" type="submit">${isEmployee() ? 'Save internal note' : 'Send message'}</button></form>` : '';
  return `<div class="pm-detail"><div class="pm-detail-hero"><div class="pm-detail-icon" style="background:linear-gradient(135deg,${color},${color}99);">${crmProjectIcon('tickets')}</div><div style="flex:1;min-width:0;"><h2 class="pm-detail-title">#TIC-${ticket.id}</h2><p class="pm-detail-client">${escapeHtml(ticket.subject || 'Untitled ticket')}</p></div></div><div class="pm-detail-badges">${badge(ticket.status)}<span style="font-size:11px;font-weight:700;color:${color};">${nice(ticket.priority || 'low')}</span></div><div class="pm-detail-section"><div class="pm-detail-label">TICKET INFO</div><div class="pm-info-grid"><div class="pm-info-row"><span>Client</span><strong>${escapeHtml(clientName(ticket.client_id) || '—')}</strong></div><div class="pm-info-row"><span>Project</span><strong>${escapeHtml(projectName(ticket.project_id) || 'Unlinked')}</strong></div><div class="pm-info-row"><span>Assigned To</span><strong style="color:#6366f1;">${escapeHtml(assignedUserName(ticket) || 'Unassigned')}</strong></div><div class="pm-info-row"><span>Status</span>${badge(ticket.status)}</div></div></div><div class="pm-detail-section ticket-reference-conversation" aria-label="Ticket conversation"><div class="pm-detail-label">CONVERSATION</div><div class="ticket-reference-conversation-list">${conversationHtml}</div>${replyForm || '<p class="ticket-reference-conversation-note">You do not have permission to send messages on this ticket.</p>'}</div><div class="pm-detail-actions">${canUpdate('tickets') ? `<button class="crm-button primary" data-quick-patch="tickets" data-quick-id="${ticket.id}" data-quick-field="status" data-quick-value="resolved" type="button">✓ Resolve</button>` : ''}${canUpdate('tickets') ? `<button class="crm-button" data-quick-patch="tickets" data-quick-id="${ticket.id}" data-quick-field="status" data-quick-value="in_progress" type="button">Set In Progress</button>` : ''}${canUpdate('tickets') ? `<button class="crm-button" data-edit-resource="tickets" data-edit-id="${ticket.id}" type="button">${isEmployee() ? 'Update' : 'Reassign'}</button>` : ''}</div></div>`;
}

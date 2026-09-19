import { invoiceBalance } from '../lib/crm/finance.js';
import { getInvoicePrintName, invoiceBranding } from '../lib/crm/invoice.js';
import { renderInvoiceHtml } from '../lib/crm/invoiceHtml.js';
import { setPopupDocument } from '../lib/crm/popup.js';
import { replaceSafeMarkup } from '../lib/crm/safeMarkup.js';
import { escapeHtml, money, statusTone } from '../lib/crm/ui.js';
import { createWorkspaceStore } from '../lib/crm/workspaceStore.js';

const workspaceStore = createWorkspaceStore();
const state = {
  profile: null,
  client: null,
  projects: [],
  invoices: [],
  tickets: [],
  activeTicketId: null,
};

const statusEl = document.getElementById('client-status');
const userEl = document.getElementById('client-user');
const kpisEl = document.getElementById('client-kpis');
const projectsEl = document.getElementById('projects-list');
const invoicesEl = document.getElementById('invoices-list');
const ticketsEl = document.getElementById('tickets-list');
const ticketForm = document.getElementById('ticket-form');
const messageForm = document.getElementById('message-form');
const conversationPanel = document.getElementById('conversation-panel');
const conversationTitle = document.getElementById('conversation-title');
const conversationMessages = document.getElementById('conversation-messages');
const invoiceModal = document.getElementById('invoice-modal');
const invoicePreview = document.getElementById('invoice-preview');
const invoicePreviewTitle = document.getElementById('invoice-preview-title');
const clientRoot = document.getElementById('client-portal-root');

async function printInvoiceMarkup(markup, filename = 'invoice') {
  const printWindow = window.open('', '_blank', 'popup,width=900,height=1100');
  if (!printWindow) {
    setStatus('Allow pop-ups to print or save the invoice as PDF.', 'error');
    return false;
  }
  setPopupDocument(printWindow, `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .invoice-print-sheet { width: 277mm; max-width: 277mm !important; margin: 0 auto; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.35; }
    .invoice-print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-print-sheet table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; }
  </style></head><body>${markup}</body></html>`);
  await Promise.all(Array.from(printWindow.document.images || []).map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  })));
  printWindow.onafterprint = () => printWindow.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 80);
  return true;
}

const badgeTones = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-700',
};

function createNode(tagName, className = '', text = null) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function appendBadge(parent, value, tone = 'slate') {
  const badgeNode = createNode('span', `inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badgeTones[tone] || badgeTones.slate}`);
  badgeNode.textContent = String(value || 'open').replace(/_/g, ' ');
  parent.append(badgeNode);
}

function replaceWithMessage(parent, message, className = 'text-sm text-slate-500') {
  parent.replaceChildren(createNode('p', className, message));
}

function setStatus(message, tone = 'neutral') {
  statusEl.textContent = message;
  statusEl.className = `mt-4 text-sm ${tone === 'error' ? 'text-red-600' : tone === 'success' ? 'text-emerald-700' : 'text-slate-600'}`;
  let retry = document.getElementById('client-retry-load');
  if (tone === 'error') {
    if (!retry) {
      retry = document.createElement('button');
      retry.id = 'client-retry-load';
      retry.type = 'button';
      retry.className = 'btn-secondary mt-2';
      retry.textContent = 'Retry loading workspace';
      statusEl.insertAdjacentElement('afterend', retry);
    }
    retry.classList.remove('hidden');
  } else if (retry) {
    retry.classList.add('hidden');
  }
}

async function portal(path, options = {}) {
  if (window.tmCrmReady) await window.tmCrmReady;
  if (window.tmCrm?.repository) return window.tmCrm.repository.request(path, options);
  throw new Error('CRM repository is unavailable. Please refresh the page.');
}

function logout() {
  window.tmSupabase?.auth?.signOut?.();
  location.href = '/login';
}

function renderKpis() {
  const openTickets = state.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length;
  const openInvoices = state.invoices.filter((invoice) => invoiceBalance(invoice) > 0);
  const outstanding = openInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const cards = [
    ['Projects', state.projects.length, 'Linked active work'],
    ['Open tickets', openTickets, 'Support in progress'],
    ['Open invoices', openInvoices.length, money(outstanding)],
    ['Project progress', `${Math.round(state.projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / Math.max(state.projects.length, 1))}%`, 'Average completion'],
  ].map(([label, value, hint]) => {
    const card = createNode('article', 'rounded-lg border border-slate-200 bg-white p-5');
    card.append(
      createNode('p', 'text-sm font-semibold text-slate-500', label),
      createNode('p', 'mt-2 text-3xl font-extrabold text-slate-950', value),
      createNode('p', 'mt-2 text-xs text-slate-400', hint),
    );
    return card;
  });
  kpisEl.replaceChildren(...cards);
}

function renderProjects() {
  const projectCards = state.projects.map((project) => {
    const card = createNode('article', 'rounded-lg border border-slate-200 p-4');
    const header = createNode('div', 'flex items-start justify-between gap-4');
    const details = createNode('div');
    details.append(
      createNode('p', 'text-xs font-bold uppercase text-slate-400', `Project #${project.id}`),
      createNode('h3', 'mt-1 text-lg font-extrabold text-slate-950', project.name),
      createNode('p', 'mt-2 text-sm text-slate-600', project.summary || 'No summary added yet.'),
    );
    header.append(details);
    // The client needs the delivery lifecycle state (planning/active/review/etc.),
    // not the internal health signal. Keep internal risk indicators out of the
    // client portal and make the linked project status explicit.
    appendBadge(header, project.status, statusTone(project.status));
    const progressTrack = createNode('div', 'mt-4 h-2 rounded-full bg-slate-100 overflow-hidden');
    const progressFill = createNode('div', 'h-full bg-primary-600');
    progressFill.style.width = `${Math.max(0, Math.min(100, Number(project.progress || 0)))}%`;
    progressTrack.append(progressFill);
    const due = project.due_date ? ` · Due ${project.due_date}` : '';
    card.append(header, progressTrack, createNode('p', 'mt-2 text-xs text-slate-500', `Progress: ${project.progress || 0}%${due}`));
    return card;
  });
  projectsEl.replaceChildren(...(projectCards.length ? projectCards : [createNode('p', 'text-sm text-slate-500', 'No projects are linked yet.')]));

  const projectSelect = document.getElementById('ticket-project');
  if (projectSelect) {
    projectSelect.replaceChildren();
    projectSelect.append(createNode('option', '', 'General support'));
    state.projects.forEach((project) => {
      const option = createNode('option', '', project.name);
      option.value = String(project.id);
      projectSelect.append(option);
    });
  }
}

function renderInvoices() {
  const invoiceCards = state.invoices.map((invoice) => {
    const card = createNode('article', 'flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between');
    const details = createNode('div');
    details.append(
      createNode('p', 'font-extrabold text-slate-950', invoice.invoice_number),
      createNode('p', 'mt-1 text-sm text-slate-500', `${money(invoice.total_amount || invoice.amount, invoice.currency)} · Due ${invoice.due_date || '-'}`),
    );
    const actions = createNode('div', 'flex items-center gap-3');
    appendBadge(actions, invoice.status, statusTone(invoice.status));
    const preview = createNode('button', 'text-sm font-bold text-primary-700', 'Preview');
    preview.type = 'button';
    preview.dataset.invoice = String(invoice.id);
    actions.append(preview);
    card.append(details, actions);
    return card;
  });
  invoicesEl.replaceChildren(...(invoiceCards.length ? invoiceCards : [createNode('p', 'text-sm text-slate-500', 'No invoices yet.')]));
}

function renderTickets() {
  const ticketCards = state.tickets.map((ticket) => {
    const card = createNode('article', 'rounded-lg border border-slate-200 p-4');
    const header = createNode('div', 'flex items-start justify-between gap-4');
    const details = createNode('div');
    details.append(
      createNode('h3', 'font-extrabold text-slate-950', ticket.subject),
      createNode('p', 'mt-1 line-clamp-2 text-sm text-slate-600', ticket.description),
    );
    header.append(details);
    appendBadge(header, ticket.status, statusTone(ticket.status));
    const footer = createNode('div', 'mt-4 flex items-center justify-between gap-3');
    footer.append(createNode('p', 'text-xs text-slate-500', `Priority: ${ticket.priority} · Created ${ticket.created_at || ''}`));
    const open = createNode('button', 'text-sm font-bold text-primary-700', 'Open conversation');
    open.type = 'button';
    open.dataset.ticket = String(ticket.id);
    footer.append(open);
    card.append(header, footer);
    return card;
  });
  ticketsEl.replaceChildren(...(ticketCards.length ? ticketCards : [createNode('p', 'text-sm text-slate-500', 'No support tickets yet.')]));
}

async function showInvoice(id) {
  try {
    setStatus('Loading invoice...', 'neutral');
    const result = await portal(`/api/portal/client/invoices/${id}`);
    const detail = await resolveInvoiceAssets(result.detail);
    invoicePreviewTitle.textContent = `Invoice ${detail.invoice.invoice_number}`;
    replaceSafeMarkup(invoicePreview, renderInvoiceHtml(detail));
    invoicePreview.dataset.invoiceNumber = detail.invoice.invoice_number || id;
    invoiceModal.classList.remove('hidden');
    setStatus('Workspace loaded.', 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not load invoice.', 'error');
  }
}

async function resolveInvoiceAssets(detail) {
  const invoice = detail?.invoice || {};
  const branding = invoiceBranding(invoice);
  const resolve = async (value, path) => {
    const candidate = String(value || '').trim();
    const objectPath = candidate || String(path || '').trim();
    if (!objectPath || !window.tmCrm?.repository?.getInvoiceAssetUrl) return '';
    try {
      return await window.tmCrm.repository.getInvoiceAssetUrl(objectPath, invoice.id);
    } catch {
      return '';
    }
  };
  const [logoUrl, qrUrl, signatureUrl] = await Promise.all([
    resolve(branding.logo_url, branding.logo_path),
    resolve(branding.qr_url, branding.qr_path),
    resolve(branding.signature_url, branding.signature_path || invoice.sign_url),
  ]);
  return {
    ...detail,
    invoice: {
      ...invoice,
      sign_url: signatureUrl,
      invoice_branding: { ...branding, logo_url: logoUrl, qr_url: qrUrl, signature_url: signatureUrl },
    },
  };
}

async function openConversation(id) {
  try {
    state.activeTicketId = id;
    const ticket = state.tickets.find((item) => String(item.id) === String(id));
    conversationTitle.textContent = ticket ? ticket.subject : 'Ticket conversation';
    conversationPanel.classList.remove('hidden');
    replaceWithMessage(conversationMessages, 'Loading conversation...');
    const result = await portal(`/api/portal/client/tickets/${id}/messages`);
    const messages = result.messages || [];
    if (!messages.length) {
      replaceWithMessage(conversationMessages, 'No replies yet.', 'rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500');
      return;
    }
    conversationMessages.replaceChildren(...messages.map((message) => {
      const article = createNode('article', `rounded-md border ${message.author_role === 'client' ? 'border-primary-100 bg-primary-50' : 'border-slate-200 bg-slate-50'} p-3`);
      article.append(
        createNode('p', 'text-sm font-bold text-slate-950', message.author_name || message.author_role),
        createNode('p', 'mt-1 text-sm text-slate-600', message.body),
        createNode('p', 'mt-2 text-xs text-slate-400', message.created_at || ''),
      );
      return article;
    }));
  } catch (error) {
    const wrapper = document.createDocumentFragment();
    const retry = createNode('button', 'btn-secondary mt-3', 'Retry conversation');
    retry.type = 'button';
    retry.dataset.clientRetryConversation = '';
    wrapper.append(
      createNode('p', 'text-sm text-red-600', error instanceof Error ? error.message : 'Could not load conversation.'),
      retry,
    );
    conversationMessages.replaceChildren(wrapper);
  }
}

async function loadOverview(showStatus = true) {
  if (showStatus) setStatus('Loading portal data...');
  const data = await portal('/api/portal/client/overview');
  state.client = data.client;
  state.projects = data.projects || [];
  state.invoices = data.invoices || [];
  state.tickets = data.tickets || [];
  workspaceStore.setProfile(state.profile);
  workspaceStore.replaceCollections({ clients: [state.client], projects: state.projects, invoices: state.invoices, tickets: state.tickets });
  userEl.textContent = `${data.client?.name || 'Client'} workspace`;
  renderKpis();
  renderProjects();
  renderInvoices();
  renderTickets();
  if (showStatus) setStatus('Workspace loaded.', 'success');
}

async function boot() {
  try {
    if (!window.tmSupabase) throw new Error('Supabase is not configured for this deployment.');
    const { data: { session } } = await window.tmSupabase.auth.getSession();
    if (!session) return logout();
    const me = await portal('/api/portal/me');
    if (me.destination !== '/client') {
      location.replace(me.destination);
      return;
    }
    state.profile = me.profile;
    workspaceStore.setProfile(me.profile);
    await loadOverview();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not load portal.', 'error');
    setTimeout(logout, 1200);
  }
}

// The client portal owns one delegated interaction boundary. Renderers can
// replace project, invoice, ticket, and retry markup without reattaching
// listeners or losing the live repository contract.
clientRoot?.addEventListener('click', async (event) => {
  const element = event.target instanceof Element
    ? event.target.closest('[data-invoice],[data-ticket],#client-retry-load,[data-client-retry-conversation],#logout-button,#close-invoice,#print-invoice')
    : null;
  if (!element || !clientRoot.contains(element)) return;
  if (element.matches('[data-invoice]')) return showInvoice(element.dataset.invoice);
  if (element.matches('[data-ticket]')) return openConversation(element.dataset.ticket);
  if (element.matches('#client-retry-load')) return loadOverview();
  if (element.matches('[data-client-retry-conversation]')) return openConversation(state.activeTicketId);
  if (element.matches('#logout-button')) return logout();
  if (element.matches('#close-invoice')) return invoiceModal.classList.add('hidden');
  if (element.matches('#print-invoice')) {
    const markup = invoicePreview?.innerHTML || '';
    if (markup) return printInvoiceMarkup(markup, getInvoicePrintName(invoicePreview.dataset.invoiceNumber || 'invoice'));
    return;
  }
});

clientRoot?.addEventListener('submit', async (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || !clientRoot.contains(form)) return;
  event.preventDefault();
  if (form === ticketForm) {
    const body = Object.fromEntries(new FormData(form).entries());
    if (!body.project_id) delete body.project_id;
    else body.project_id = Number(body.project_id);
    try {
      await portal('/api/portal/client/tickets', { method: 'POST', body: JSON.stringify(body) });
      form.reset();
      setStatus('Support ticket created.', 'success');
      await loadOverview(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create support ticket.', 'error');
    }
    return;
  }
  if (form === messageForm) {
    if (!state.activeTicketId) return;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await portal(`/api/portal/client/tickets/${state.activeTicketId}/messages`, { method: 'POST', body: JSON.stringify(body) });
      form.reset();
      await openConversation(state.activeTicketId);
      await loadOverview(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send reply.', 'error');
    }
  }
});

boot();

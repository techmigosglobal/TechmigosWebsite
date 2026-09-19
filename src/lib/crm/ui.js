export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function safeUrl(value, { fallback = '', protocols = ['http:', 'https:'] } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw, 'https://techmigos.invalid');
    return protocols.includes(parsed.protocol) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function nice(value) {
  return escapeHtml(String(value || '').replace(/_/g, ' ') || '-');
}

export function money(value, currency = 'INR') {
  return `${escapeHtml(currency)} ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function compactMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function daysUntil(dateValue) {
  if (!dateValue) return null;
  return Math.ceil((new Date(dateValue) - new Date()) / 86400000);
}

export function dueBadge(dateValue) {
  const days = daysUntil(dateValue);
  if (days === null) return '';
  if (days < 0) return `<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:99px;">Overdue ${Math.abs(days)}d</span>`;
  if (days <= 7) return `<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:99px;">Due in ${days}d</span>`;
  return `<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:99px;">${days}d left</span>`;
}

export function statusTone(status) {
  if (['paid', 'received', 'active', 'completed', 'resolved', 'closed', 'on_track'].includes(status)) return 'green';
  if (['overdue', 'urgent', 'at_risk', 'cancelled'].includes(status)) return 'red';
  if (['sent', 'viewed', 'watch', 'high', 'half_payment', 'pending', 'on_hold'].includes(status)) return 'orange';
  if (['planning', 'proposal'].includes(status)) return 'purple';
  return 'blue';
}

export function badge(value, tone = statusTone(value)) {
  return `<span class="crm-status ${tone}">${nice(value)}</span>`;
}

export function metric(label, value, icon, color = 'blue', trend = 'Updated just now') {
  return `<article class="crm-card crm-kpi">
    <div class="crm-kpi-icon ${escapeHtml(color)}-soft">${icon}</div>
    <div><p class="crm-kpi-label">${escapeHtml(label)}</p><p class="crm-kpi-value">${escapeHtml(value)}</p><p class="crm-trend ${String(trend).startsWith('down') ? 'down' : 'up'}">${escapeHtml(trend)}</p></div>
  </article>`;
}

export function progress(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="crm-progress"><div class="crm-progress-track"><div class="crm-progress-fill" style="width:${safe}%"></div></div><strong>${safe}%</strong></div>`;
}

export function currentWeekLabel(now = new Date()) {
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmtDate = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}, ${weekEnd.getFullYear()}`;
}

export function pageHead(title, subtitle, actions = '') {
  return `<div class="crm-page-head"><div><h1 class="crm-page-title">${escapeHtml(title)}</h1><p class="crm-page-subtitle">${escapeHtml(subtitle)}</p></div><div class="crm-toolbar">${actions}</div></div>`;
}

export function table(headers, rows, empty = 'No records yet.', tableClass = '') {
  table.labelIndex = 0;
  const labeledRows = rows ? rows.replace(/<td(?![^>]*data-label=)([^>]*)>/g, (_match, attrs) => {
    const index = table.labelIndex % headers.length;
    table.labelIndex += 1;
    return `<td data-label="${escapeHtml(headers[index] || '')}"${attrs}>`;
  }) : '';
  return `<div class="crm-table-wrap"><table class="crm-table ${tableClass}"><thead><tr>${headers.map((item) => `<th>${item}</th>`).join('')}</tr></thead><tbody>${labeledRows || `<tr><td data-label="" colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
}
table.labelIndex = 0;

export function rowActions(resource, id, options = {}, { canUpdate = () => false, canDelete = () => false } = {}) {
  const safeResource = escapeHtml(resource);
  const safeId = escapeHtml(id);
  const view = options.view ? `<button class="crm-mini-action" ${options.viewAttr || ''} type="button">View</button>` : '';
  const invoice = resource === 'invoices' ? `<button class="crm-mini-action" data-invoice-view="${safeId}" type="button">Invoice</button>` : '';
  const editBtn = canUpdate(resource) ? `<button class="crm-mini-action" data-edit-resource="${safeResource}" data-edit-id="${safeId}" type="button" title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '';
  const deleteBtn = canDelete(resource) ? `<button class="crm-mini-action danger" data-delete-resource="${safeResource}" data-delete-id="${safeId}" type="button" title="Delete"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>` : '';
  return `<div class="crm-row-actions">${view}${invoice}${editBtn}${deleteBtn}</div>`;
}

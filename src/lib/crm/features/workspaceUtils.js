import { CRM_BOOLEAN_FIELDS, CRM_FORM_FIELDS, CRM_NUMERIC_FIELDS } from '../contracts.js';
import { nice } from '../ui.js';

export function generateTemporaryPassword(randomSource = globalThis.crypto) {
  const bytes = new Uint8Array(10);
  if (randomSource?.getRandomValues) randomSource.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  const suffix = Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
  return `Tm@${suffix}A7!`;
}

export function generateProfileUsername(raw = {}, profiles = []) {
  const emailPrefix = String(raw.email || '').split('@')[0];
  const fallback = emailPrefix || String(raw.name || 'user');
  const base = String(fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'user';
  const safeBase = base.length >= 3 ? base : 'user';
  const used = new Set((profiles || []).map((profile) => String(profile.username || '').trim().toLowerCase()).filter(Boolean));
  if (!used.has(safeBase)) return safeBase;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${safeBase.slice(0, 64 - suffixText.length)}${suffixText}`;
    if (!used.has(candidate)) return candidate;
  }
  return `user-${Date.now().toString(36).slice(-8)}`;
}

export function validateWorkspacePayload(resource, payload = {}) {
  if (resource === 'profiles') {
    if (!payload.name || !String(payload.name).trim()) return 'Full name is required.';
    if (!payload.email || !String(payload.email).trim()) return 'Email address is required.';
    if (!payload.role) return 'Role is required.';
    if (payload.role === 'client' && !payload.client_id) return 'Select a client before creating a client login.';
    if (payload.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(payload.password))) {
      return 'Initial password must be at least 8 characters with uppercase, lowercase, number, and symbol.';
    }
  }
  if (resource === 'clients') {
    if (!payload.company || !String(payload.company).trim()) return 'Company name is required.';
    if (!payload.name || !String(payload.name).trim()) return 'Contact name is required.';
  }
  if (resource === 'projects') {
    if (!payload.name || !String(payload.name).trim()) return 'Project name is required.';
    if (String(payload.name).trim().length > 160) return 'Project names must be 160 characters or fewer.';
    for (const field of ['budget', 'expenses', 'revenue']) {
      if (payload[field] !== undefined && Number(payload[field]) < 0) return `${nice(field)} cannot be negative.`;
    }
  }
  if (resource === 'tickets') {
    if (!payload.client_id) return 'Select a client before creating the ticket.';
    if (!payload.subject || !String(payload.subject).trim()) return 'Ticket subject is required.';
  }
  if (resource === 'finances') {
    if (!payload.transaction_date) return 'Date is required for finance records.';
    if (!payload.transaction_type) return 'Category (transaction type) is required.';
    if (!['income', 'revenue', 'expense', 'salary', 'invoice'].includes(payload.transaction_type)) return 'Choose a valid finance category.';
    if (!payload.title || !String(payload.title).trim()) return 'Description is required.';
    if (payload.amount === undefined || payload.amount === null || String(payload.amount).trim() === '' || isNaN(Number(payload.amount))) return 'A valid amount is required.';
    if (!payload.status) return 'Status is required.';
    if (!['pending', 'paid', 'received', 'half_payment', 'cancelled'].includes(payload.status)) return 'Choose a valid finance status.';
  }
  return '';
}

export function sanitizeWorkspacePayload(resource, payload = {}) {
  const allowed = CRM_FORM_FIELDS[resource];
  const clean = {};
  Object.entries(payload || {}).forEach(([key, rawValue]) => {
    if (!allowed || !allowed.includes(key)) return;
    let value = rawValue;
    if (typeof value === 'string') value = value.trim();
    if (value === '' || value === undefined || value === null) {
      if (resource === 'projects' && ['client_id', 'client_name'].includes(key)) clean[key] = null;
      if (resource === 'tickets' && ['project_id', 'assigned_user_id', 'assigned_to'].includes(key)) clean[key] = null;
      return;
    }
    if (CRM_NUMERIC_FIELDS.has(key)) value = Number(value);
    if (CRM_BOOLEAN_FIELDS.has(key)) value = value === true || value === 'true' || value === 'on' || value === '1';
    clean[key] = value;
  });

  if (resource === 'projects' && clean.progress !== undefined) {
    clean.progress = Math.max(0, Math.min(100, Number(clean.progress || 0)));
  }
  return clean;
}

export function removeCachedWorkspaceRecord(state, resource, id, { storage, key } = {}) {
  if (!state?.data || !Array.isArray(state.data[resource])) return false;

  const rows = state.data[resource];
  const nextRows = rows.filter((record) => String(record.id) !== String(id));
  if (nextRows.length === rows.length) return false;
  state.data[resource] = nextRows;

  if (storage && key) {
    try {
      storage.setItem(key, JSON.stringify(state.data));
    } catch {
      try {
        storage.removeItem(key);
      } catch {
        // The in-memory result remains authoritative for this page session.
      }
    }
  }

  return true;
}

export function findClientName(clients = [], id) {
  if (id === undefined || id === null || id === '') return '';
  const client = clients.find((item) => String(item.id) === String(id));
  return client?.company || client?.name || `Client #${id}`;
}

export function filterWorkspaceRows(rows = [], query = '', keys = []) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return rows;
  return rows.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(normalizedQuery)));
}

export function workspaceRoleLabel(role) {
  return ({ company_admin: 'Admin', company_member: 'Employee', client: 'Client' }[role] || nice(role || 'Operations'));
}

export function findProjectName(projects = [], id) {
  const project = projects.find((item) => String(item.id) === String(id));
  return project?.name || 'Unlinked';
}

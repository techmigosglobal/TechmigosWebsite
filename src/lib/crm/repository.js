import { CRM_ROLES, canRead, canWrite, isAdmin, isClient } from './permissions.js';

const TABLE_MAP = Object.freeze({
  clients: 'crm_clients',
  projects: 'crm_projects',
  tickets: 'crm_tickets',
  ticket_messages: 'crm_ticket_messages',
  invoices: 'crm_invoices',
  invoice_items: 'crm_invoice_items',
  finances: 'crm_finances',
  activities: 'crm_activities',
  profiles: 'crm_profiles',
  settings: 'crm_settings',
});

const RESOURCE_FIELDS = Object.freeze({
  clients: ['id', 'name', 'company', 'email', 'phone', 'status', 'marketing_opt_in', 'notes', 'created_at', 'updated_at'],
  projects: ['id', 'client_id', 'name', 'client_name', 'project_manager', 'owner_user_id', 'budget', 'expenses', 'revenue', 'status', 'health', 'progress', 'due_date', 'summary', 'notes', 'created_at', 'updated_at'],
  tickets: ['id', 'client_id', 'project_id', 'subject', 'description', 'priority', 'status', 'assigned_to', 'created_at', 'updated_at'],
  ticket_messages: ['id', 'ticket_id', 'body', 'author_name', 'author_role', 'visibility', 'created_at'],
  invoices: ['id', 'client_id', 'project_id', 'invoice_number', 'invoice_date', 'due_date', 'currency', 'customer_name', 'customer_email', 'customer_phone', 'billing_address', 'service_title', 'discount_amount', 'tax_amount', 'total_amount', 'received_amount', 'status', 'notes', 'payment_instructions', 'terms', 'sign_url', 'project_snapshot', 'invoice_branding', 'is_recurring', 'created_at', 'updated_at'],
  invoice_items: ['id', 'invoice_id', 'description', 'quantity', 'rate', 'amount', 'unit', 'notes', 'sort_order', 'created_at'],
  finances: ['id', 'transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'paid_by', 'received_by', 'payment_method', 'department', 'amount', 'status', 'notes', 'source', 'proof_url', 'created_at', 'updated_at'],
  activities: ['id', 'action', 'entity_type', 'entity_id', 'summary', 'user_id', 'created_at'],
  profiles: ['id', 'auth_user_id', 'email', 'name', 'role', 'status', 'client_id', 'department', 'last_login', 'created_at', 'updated_at'],
  settings: ['id', 'category', 'settings', 'updated_at'],
});

const WRITE_FIELDS = Object.freeze({
  clients: ['name', 'company', 'email', 'phone', 'status', 'marketing_opt_in', 'notes'],
  projects: ['client_id', 'name', 'client_name', 'project_manager', 'owner_user_id', 'budget', 'expenses', 'revenue', 'status', 'health', 'progress', 'due_date', 'summary', 'notes'],
  tickets: ['client_id', 'project_id', 'subject', 'description', 'priority', 'status', 'assigned_to'],
  finances: ['transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'paid_by', 'received_by', 'payment_method', 'department', 'amount', 'status', 'notes', 'source', 'proof_url'],
  settings: ['settings'],
});

const NUMERIC_FIELDS = new Set(['client_id', 'project_id', 'ticket_id', 'amount', 'budget', 'expenses', 'revenue', 'progress', 'discount_amount', 'tax_amount', 'total_amount', 'received_amount', 'quantity', 'rate', 'sort_order']);
const BOOLEAN_FIELDS = new Set(['marketing_opt_in', 'is_recurring']);
const FILE_LIMIT = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const PROOF_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);

function errorFrom(error, fallback = 'Supabase request failed.') {
  const message = error?.message || fallback;
  const wrapped = new Error(message);
  wrapped.code = error?.code;
  wrapped.details = error?.details;
  wrapped.hint = error?.hint;
  return wrapped;
}

function parseBody(options) {
  if (!options?.body) return null;
  if (typeof options.body === 'string') {
    try { return JSON.parse(options.body); } catch { throw new Error('Request body is not valid JSON.'); }
  }
  return options.body;
}

function cleanPathSegment(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'file';
}

function validateFile(file, allowedTypes) {
  if (!file || typeof file.size !== 'number') throw new Error('No file provided.');
  if (!allowedTypes.has(file.type)) throw new Error('Unsupported file type. Use PNG, JPEG, WebP, or PDF.');
  if (file.size > FILE_LIMIT) throw new Error('File is too large. Maximum size is 10 MB.');
}

export function createCrmRepository(getSupabase) {
  let contextPromise;
  let context = null;

  function sb() {
    const client = getSupabase?.();
    if (!client) throw new Error('Supabase client is not ready. Please refresh the page.');
    return client;
  }

  async function getContext(force = false) {
    if (contextPromise && !force) return contextPromise;
    contextPromise = (async () => {
      const client = sb();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw errorFrom(userError, 'Could not verify your session.');
      if (!user) throw new Error('Not authenticated.');
      const { data: profile, error: profileError } = await client
        .from('crm_profiles')
        .select(RESOURCE_FIELDS.profiles.join(','))
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (profileError) throw errorFrom(profileError, 'Could not load your CRM profile.');
      if (!profile) throw new Error('Portal access is not provisioned for this account.');
      if (profile.status !== 'active') throw new Error('This account is not active. Please contact your TechMigos administrator.');
      if (![CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE, CRM_ROLES.CLIENT].includes(profile.role)) throw new Error('This account has no valid CRM role.');
      context = { user, profile, role: profile.role, clientId: profile.client_id ?? null };
      return context;
    })();
    try { return await contextPromise; } catch (error) { contextPromise = null; throw error; }
  }

  function requireResource(resource, method = 'GET') {
    if (!resource || !TABLE_MAP[resource]) throw new Error('Unknown CRM resource.');
    if (resource === 'settings' || resource === 'profiles') {
      if (!isAdmin(context?.role)) throw new Error('Only company admins can access this area.');
    }
    if (method === 'GET') {
      if (!canRead(context?.role, resource)) throw new Error('You do not have access to this CRM resource.');
    } else if (!canWrite(context?.role, resource)) {
      throw new Error('This account is read-only for CRM operations.');
    }
  }

  function sanitize(resource, input = {}) {
    const allowed = WRITE_FIELDS[resource] || [];
    const output = {};
    for (const [key, rawValue] of Object.entries(input || {})) {
      if (!allowed.includes(key)) continue;
      let value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
      if (value === '' || value == null) continue;
      if (NUMERIC_FIELDS.has(key)) {
        value = Number(value);
        if (!Number.isFinite(value)) throw new Error(`${key} must be a valid number.`);
      }
      if (BOOLEAN_FIELDS.has(key)) value = value === true || value === 'true' || value === '1' || value === 'on';
      output[key] = value;
    }
    if (resource === 'projects' && output.progress !== undefined) output.progress = Math.max(0, Math.min(100, output.progress));
    return output;
  }

  function sanitizeInvoice(invoice = {}) {
    const fields = ['id', 'client_id', 'project_id', 'invoice_number', 'invoice_date', 'due_date', 'currency', 'customer_name', 'customer_email', 'customer_phone', 'billing_address', 'service_title', 'discount_amount', 'tax_amount', 'received_amount', 'status', 'notes', 'payment_instructions', 'terms', 'sign_url', 'project_snapshot', 'invoice_branding', 'is_recurring'];
    const output = {};
    for (const field of fields) {
      if (invoice[field] === undefined || invoice[field] === null || invoice[field] === '') continue;
      let value = invoice[field];
      if (NUMERIC_FIELDS.has(field)) {
        value = Number(value);
        if (!Number.isFinite(value)) throw new Error(`${field} must be a valid number.`);
      }
      if (BOOLEAN_FIELDS.has(field)) value = value === true || value === 'true' || value === '1' || value === 'on';
      output[field] = value;
    }
    if (!output.client_id) throw new Error('Select a CRM client before saving an invoice.');
    return output;
  }

  function sanitizeInvoiceItems(items = []) {
    if (!Array.isArray(items)) throw new Error('Invoice items must be an array.');
    return items.map((item, index) => {
      const description = String(item.description ?? '').trim();
      const quantity = Number(item.quantity ?? 1);
      const rate = Number(item.rate ?? 0);
      if (!description) throw new Error(`Invoice item ${index + 1} needs a description.`);
      if (!Number.isFinite(quantity) || !Number.isFinite(rate) || quantity < 0 || rate < 0) {
        throw new Error(`Invoice item ${index + 1} must have valid non-negative quantity and rate.`);
      }
      return {
        description,
        quantity,
        rate,
        unit: String(item.unit ?? '').trim(),
        notes: String(item.notes ?? '').trim(),
        sort_order: Number.isInteger(Number(item.sort_order)) ? Number(item.sort_order) : index,
      };
    });
  }

  async function getProfile() {
    return (await getContext()).profile;
  }

  async function getSettings(category) {
    requireResource('settings', 'GET');
    const { data, error } = await sb().from('crm_settings').select('settings').eq('category', category).maybeSingle();
    if (error) throw errorFrom(error, 'Could not load settings.');
    return { settings: data?.settings || {} };
  }

  async function patchSettings(category, values) {
    requireResource('settings', 'PATCH');
    const client = sb();
    const { data: existing, error: lookupError } = await client.from('crm_settings').select('id, settings').eq('category', category).maybeSingle();
    if (lookupError) throw errorFrom(lookupError, 'Could not load settings.');
    const payload = { settings: { ...(existing?.settings || {}), ...(values || {}) } };
    const response = existing
      ? await client.from('crm_settings').update(payload).eq('id', existing.id).select('id, settings').single()
      : await client.from('crm_settings').insert({ category, ...payload }).select('id, settings').single();
    if (response.error) throw errorFrom(response.error, 'Could not save settings.');
    return { settings: response.data.settings };
  }

  async function getInvoiceDetail(id) {
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) throw new Error('Invalid invoice id.');
    if (context?.role === CRM_ROLES.CLIENT) {
      if (!canRead(context.role, 'invoices')) throw new Error('You do not have access to invoices.');
    } else requireResource('invoices', 'GET');
    const client = sb();
    const [invoiceResponse, itemResponse] = await Promise.all([
      client.from('crm_invoices').select(RESOURCE_FIELDS.invoices.join(',')).eq('id', invoiceId).maybeSingle(),
      client.from('crm_invoice_items').select(RESOURCE_FIELDS.invoice_items.join(',')).eq('invoice_id', invoiceId).order('sort_order').order('id'),
    ]);
    if (invoiceResponse.error) throw errorFrom(invoiceResponse.error, 'Could not load invoice.');
    if (itemResponse.error) throw errorFrom(itemResponse.error, 'Could not load invoice items.');
    if (!invoiceResponse.data) throw new Error('Invoice not found or unavailable.');
    return { detail: { invoice: invoiceResponse.data, items: itemResponse.data || [] } };
  }

  async function saveInvoice(body) {
    requireResource('invoices', 'POST');
    const invoice = sanitizeInvoice(body?.invoice || body || {});
    const items = sanitizeInvoiceItems(body?.items || []);
    const { data, error } = await sb().rpc('save_invoice_with_items', { p_invoice: invoice, p_items: items });
    if (error) throw errorFrom(error, 'Could not save invoice and items.');
    if (!data?.invoice) throw new Error('Invoice save returned no invoice.');
    return { item: data.invoice, items: data.items || [] };
  }

  async function uploadInvoiceSign(id, file) {
    await getContext();
    requireResource('invoices', 'POST');
    validateFile(file, IMAGE_TYPES);
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) throw new Error('Invalid invoice id.');
    const path = `signatures/${invoiceId}/${Date.now()}-${cleanPathSegment(file.name)}`;
    const client = sb();
    const upload = await client.storage.from('invoice-signatures').upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) throw errorFrom(upload.error, 'Could not upload invoice signature.');
    const { data: urlData } = client.storage.from('invoice-signatures').getPublicUrl(path);
    const update = await client.from('crm_invoices').update({ sign_url: urlData.publicUrl }).eq('id', invoiceId).select('id, sign_url').single();
    if (update.error) {
      await client.storage.from('invoice-signatures').remove([path]);
      throw errorFrom(update.error, 'Could not save invoice signature.');
    }
    return { sign_url: update.data.sign_url, sign_path: path };
  }

  async function uploadInvoiceAsset(category, file) {
    await getContext();
    requireResource('settings', 'PATCH');
    validateFile(file, IMAGE_TYPES);
    const safeCategory = cleanPathSegment(category || 'asset');
    const path = `invoice-assets/${safeCategory}/${Date.now()}-${cleanPathSegment(file.name)}`;
    const upload = await sb().storage.from('invoice-signatures').upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) throw errorFrom(upload.error, 'Could not upload invoice branding asset.');
    const { data } = sb().storage.from('invoice-signatures').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Could not create an invoice branding URL.');
    return { path, url: data.publicUrl };
  }

  async function deleteInvoiceAsset(path) {
    await getContext();
    requireResource('settings', 'PATCH');
    const objectPath = String(path || '').trim();
    if (!objectPath || objectPath.includes('..')) throw new Error('Invalid invoice asset path.');
    const { error } = await sb().storage.from('invoice-signatures').remove([objectPath]);
    if (error) throw errorFrom(error, 'Could not delete invoice branding asset.');
    return { ok: true };
  }

  async function getInvoiceAssetUrl(path) {
    await getContext();
    const objectPath = String(path || '').trim();
    if (!objectPath || objectPath.includes('..')) throw new Error('Invalid invoice asset path.');
    const { data } = sb().storage.from('invoice-signatures').getPublicUrl(objectPath);
    if (!data?.publicUrl) throw new Error('Could not resolve invoice branding asset.');
    return data.publicUrl;
  }

  async function uploadFinanceProof(id, file) {
    await getContext();
    requireResource('finances', 'POST');
    validateFile(file, PROOF_TYPES);
    const financeId = Number(id);
    if (!Number.isInteger(financeId)) throw new Error('Save the finance record before attaching proof.');
    const path = `records/${financeId}/${Date.now()}-${cleanPathSegment(file.name)}`;
    const client = sb();
    const upload = await client.storage.from('finance-proofs').upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) throw errorFrom(upload.error, 'Could not upload finance proof.');
    const update = await client.from('crm_finances').update({ proof_url: path }).eq('id', financeId).select('id, proof_url').single();
    if (update.error) {
      await client.storage.from('finance-proofs').remove([path]);
      throw errorFrom(update.error, 'Could not attach finance proof.');
    }
    return { proof_url: path, proof_key: path };
  }

  async function getFinanceProofUrl(path) {
    if (!path) return '';
    await getContext();
    requireResource('finances', 'GET');
    const raw = String(path);
    if (/^https?:\/\//i.test(raw)) return raw;
    const { data, error } = await sb().storage.from('finance-proofs').createSignedUrl(raw, 600);
    if (error) throw errorFrom(error, 'Could not create a secure finance-proof URL.');
    return data?.signedUrl || '';
  }

  async function clientOverview() {
    const current = await getContext();
    if (!isClient(current.role) || !current.clientId) throw new Error('No active client link is configured.');
    const client = sb();
    const [clientResponse, projectsResponse, invoicesResponse, ticketsResponse] = await Promise.all([
      client.from('crm_clients').select(RESOURCE_FIELDS.clients.join(',')).eq('id', current.clientId).maybeSingle(),
      client.from('crm_projects').select(RESOURCE_FIELDS.projects.join(',')).eq('client_id', current.clientId).order('created_at', { ascending: false }),
      client.from('crm_invoices').select(RESOURCE_FIELDS.invoices.join(',')).eq('client_id', current.clientId).order('created_at', { ascending: false }),
      client.from('crm_tickets').select(RESOURCE_FIELDS.tickets.join(',')).eq('client_id', current.clientId).order('created_at', { ascending: false }),
    ]);
    for (const response of [clientResponse, projectsResponse, invoicesResponse, ticketsResponse]) {
      if (response.error) throw errorFrom(response.error, 'Could not load client workspace.');
    }
    if (!clientResponse.data) throw new Error('Linked client record is unavailable.');
    return { client: clientResponse.data, projects: projectsResponse.data || [], invoices: invoicesResponse.data || [], tickets: ticketsResponse.data || [] };
  }

  async function clientMessages(ticketId) {
    const current = await getContext();
    if (!isClient(current.role)) throw new Error('Client messages are only available in the Client portal.');
    const numericId = Number(ticketId);
    if (!Number.isInteger(numericId)) throw new Error('Invalid ticket id.');
    const { data, error } = await sb().from('crm_ticket_messages').select(RESOURCE_FIELDS.ticket_messages.join(',')).eq('ticket_id', numericId).eq('visibility', 'external').order('created_at');
    if (error) throw errorFrom(error, 'Could not load ticket messages.');
    return { messages: data || [] };
  }

  async function clientCreateTicket(body) {
    const current = await getContext();
    if (!isClient(current.role) || !current.clientId) throw new Error('Client access is not configured.');
    const subject = String(body?.subject ?? '').trim();
    const description = String(body?.description ?? '').trim();
    if (!subject || !description) throw new Error('Subject and description are required.');
    const projectId = body?.project_id ? Number(body.project_id) : null;
    if (projectId !== null) {
      if (!Number.isInteger(projectId)) throw new Error('Invalid project selection.');
      const { data: project, error: projectError } = await sb()
        .from('crm_projects')
        .select('id')
        .eq('id', projectId)
        .eq('client_id', current.clientId)
        .maybeSingle();
      if (projectError) throw errorFrom(projectError, 'Could not validate the selected project.');
      if (!project) throw new Error('That project is not linked to your client account.');
    }
    const payload = {
      client_id: current.clientId,
      project_id: projectId,
      subject,
      description,
      priority: ['low', 'medium', 'high', 'urgent'].includes(body?.priority) ? body.priority : 'medium',
    };
    const { data, error } = await sb().from('crm_tickets').insert(payload).select(RESOURCE_FIELDS.tickets.join(',')).single();
    if (error) throw errorFrom(error, 'Could not create support ticket.');
    return { item: data };
  }

  async function clientCreateMessage(ticketId, body) {
    const current = await getContext();
    if (!isClient(current.role)) throw new Error('Client messages are only available in the Client portal.');
    const numericTicketId = Number(ticketId);
    if (!Number.isInteger(numericTicketId)) throw new Error('Invalid ticket id.');
    const message = String(body?.body ?? '').trim();
    if (!message) throw new Error('Reply cannot be empty.');
    const { data, error } = await sb().from('crm_ticket_messages').insert({
      ticket_id: numericTicketId,
      body: message,
      author_name: current.profile.name || current.profile.email,
      author_role: 'client',
      visibility: 'external',
    }).select(RESOURCE_FIELDS.ticket_messages.join(',')).single();
    if (error) throw errorFrom(error, 'Could not send ticket reply.');
    return { item: data };
  }

  async function adminUserOperation(operation, body) {
    if (!isAdmin(context?.role)) throw new Error('Only company admins can manage users.');
    const { data, error } = await sb().functions.invoke('admin-users', { body: { operation, ...body } });
    if (error) throw errorFrom(error, 'Could not complete the admin user operation.');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const body = parseBody(options);
    const parts = String(path || '').replace(/^\/api\/portal\//, '').split('/').filter(Boolean);
    const resource = parts[0];
    const id = parts[1];
    const sub = parts[2];
    const current = await getContext();

    if (resource === 'me') return { profile: current.profile, destination: isClient(current.role) ? '/client' : '/company' };
    if (resource === 'client') {
      if (id === 'overview' && method === 'GET') return clientOverview();
      if (id === 'tickets' && sub && parts[3] === 'messages') return method === 'GET' ? clientMessages(sub) : clientCreateMessage(sub, body);
      if (id === 'tickets' && method === 'POST') return clientCreateTicket(body);
      if (id === 'invoices' && method === 'GET' && sub) return getInvoiceDetail(sub);
      throw new Error('Unsupported Client portal request.');
    }
    if (resource === 'settings') {
      if (method === 'GET') return getSettings(id || 'company');
      if (method === 'PATCH') return patchSettings(id || 'company', body);
    }
    if (resource === 'invoices' && id && sub === 'upload-sign' && method === 'POST') return uploadInvoiceSign(id, options.body?.get?.('file'));
    if (resource === 'finances' && sub === 'upload-proof' && method === 'POST') return uploadFinanceProof(id, options.body?.get?.('file'));
    if (resource === 'invoices' && id && !sub && method === 'GET') return getInvoiceDetail(id);
    if (resource === 'invoices' && (method === 'POST' || method === 'PATCH')) {
      return saveInvoice({ ...(body || {}), invoice: { ...(body?.invoice || body || {}), ...(id ? { id } : {}) } });
    }

    requireResource(resource, method);
    const table = TABLE_MAP[resource];
    const fields = RESOURCE_FIELDS[resource].join(',');
    const client = sb();

    if (method === 'GET' && !id) {
      const { data, error } = await client.from(table).select(fields).order('created_at', { ascending: false });
      if (error) throw errorFrom(error, `Could not load ${resource}.`);
      return { items: data || [] };
    }
    if (resource === 'profiles' && method === 'POST' && !id) return adminUserOperation('invite', body || {});
    if (resource === 'profiles' && method === 'PATCH' && id) return adminUserOperation('update_profile', { ...(body || {}), profile_id: id });
    if (resource === 'profiles' && method === 'DELETE') throw new Error('Deactivate users from User Management instead of deleting their CRM profile.');
    if (method === 'POST' && !id) {
      const payload = sanitize(resource, body);
      const { data, error } = await client.from(table).insert(payload).select(fields).single();
      if (error) throw errorFrom(error, `Could not create ${resource}.`);
      return { item: data };
    }
    if (method === 'PATCH' && id) {
      const payload = sanitize(resource, body);
      if (!Object.keys(payload).length) throw new Error('No editable fields were supplied.');
      const { data, error } = await client.from(table).update(payload).eq('id', Number(id)).select(fields).single();
      if (error) throw errorFrom(error, `Could not update ${resource}.`);
      return { item: data };
    }
    if (method === 'DELETE' && id) {
      const { error } = await client.from(table).delete().eq('id', Number(id));
      if (error) throw errorFrom(error, `Could not delete ${resource}.`);
      return { ok: true };
    }
    throw new Error(`Unsupported CRM request: ${method} ${path}`);
  }

  return {
    getContext,
    getProfile,
    request,
    uploadInvoiceAsset,
    deleteInvoiceAsset,
    getInvoiceAssetUrl,
    getFinanceProofUrl,
    clearSession() { context = null; contextPromise = null; },
  };
}

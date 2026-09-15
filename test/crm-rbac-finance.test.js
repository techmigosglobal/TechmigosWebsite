import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRM_ROLES,
  canManageUsers,
  canCreate,
  canDelete,
  canRead,
  canUpdate,
  canWrite,
} from '../src/lib/crm/permissions.js';
import {
  calculateInvoiceTotals,
  FINANCE_CASH_TRANSACTION_TYPES,
  FINANCE_EXPENSE_TRANSACTION_TYPES,
  FINANCE_INCOME_TRANSACTION_TYPES,
  FINANCE_TRANSACTION_TYPES,
  isIncomeTransaction,
  invoiceBalance,
  invoiceReceived,
  invoiceTotal,
} from '../src/lib/crm/finance.js';
import { buildCrmReportPdf } from '../src/scripts/crm-pdf.js';
import { createCrmRepository, validateProfileInput, validateProjectInput } from '../src/lib/crm/repository.js';

test('RBAC keeps Admin, Employee, and Client capabilities separate', () => {
  assert.equal(canManageUsers(CRM_ROLES.ADMIN), true);
  assert.equal(canManageUsers(CRM_ROLES.EMPLOYEE), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canWrite(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'projects'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'tickets'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'invoices'), false);
});

test('employees can only use assigned project details and files', () => {
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'projects'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'tickets'), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'clients'), false);
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'projects'), false);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canDelete(CRM_ROLES.EMPLOYEE, 'project_files'), false);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'clients'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_files'), false);
  assert.equal(canUpdate(CRM_ROLES.CLIENT, 'project_folders'), false);
});

test('project-folder and file permissions retain company-only boundaries', () => {
  assert.equal(canCreate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canUpdate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_folders'), false);
  assert.equal(canCreate(CRM_ROLES.CLIENT, 'project_files'), false);
});

test('project input accepts internal projects but rejects incomplete or unsafe values', () => {
  assert.doesNotThrow(() => validateProjectInput({
    name: 'Internal operations refresh',
    client_id: null,
    budget: 0,
    expenses: 0,
    revenue: 0,
    status: 'planning',
    health: 'on_track',
  }, { creating: true }));
  assert.throws(() => validateProjectInput({ name: ' ', status: 'planning' }, { creating: true }), /Project name is required/);
  assert.throws(() => validateProjectInput({ name: 'Launch', budget: -1 }, { creating: true }), /budget cannot be negative/);
  assert.throws(() => validateProjectInput({ name: 'Launch', status: 'unknown' }, { creating: true }), /valid project status/);
});

test('client logins must be linked to a CRM client', () => {
  assert.throws(() => validateProfileInput({ role: CRM_ROLES.CLIENT }), /client/i);
  assert.throws(() => validateProfileInput({ role: CRM_ROLES.CLIENT, client_id: 'not-a-client' }), /client/i);
  assert.doesNotThrow(() => validateProfileInput({ role: CRM_ROLES.CLIENT, client_id: 42 }));
  assert.doesNotThrow(() => validateProfileInput({ role: CRM_ROLES.EMPLOYEE }));
});

test('profile creation always sends a provision operation and fills an omitted username', async () => {
  let invocation;
  const adminProfile = {
    id: 1,
    auth_user_id: 'admin-auth-id',
    email: 'admin@techmigos.test',
    username: 'admin',
    name: 'Admin',
    role: CRM_ROLES.ADMIN,
    status: 'active',
  };
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: adminProfile, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: () => profileQuery,
    functions: {
      invoke: async (name, options) => {
        invocation = { name, options };
        return { data: { profile: { id: 2 } }, error: null };
      },
    },
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/profiles', {
    method: 'POST',
    body: JSON.stringify({ operation: 'provision', name: 'New Employee', email: 'new.employee@example.com', role: 'company_member', client_id: 42, password: 'TempPass123!' }),
  });

  assert.equal(invocation.name, 'admin-users');
  assert.equal(invocation.options.body.operation, 'provision');
  assert.equal(invocation.options.body.username, 'new.employee');
  assert.equal(invocation.options.body.client_id, null);
});

test('client login creation forwards the selected client link', async () => {
  let invocation;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: () => profileQuery,
    functions: {
      invoke: async (name, options) => {
        invocation = { name, options };
        return { data: { profile: { id: 2, role: CRM_ROLES.CLIENT, client_id: 42 } }, error: null };
      },
    },
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/profiles', {
    method: 'POST',
    body: JSON.stringify({ operation: 'provision', name: 'Client User', email: 'client@example.com', role: CRM_ROLES.CLIENT, client_id: 42, password: 'TempPass123!' }),
  });

  assert.equal(invocation.name, 'admin-users');
  assert.equal(invocation.options.body.role, CRM_ROLES.CLIENT);
  assert.equal(invocation.options.body.client_id, 42);
});

test('project creation preserves the selected client relationship', async () => {
  let insertedProject;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null }),
  };
  const projectQuery = {
    insert(payload) { insertedProject = payload; return this; },
    select() { return this; },
    single: async () => ({ data: { id: 17, client_id: 42 }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : projectQuery,
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'Client portal project', client_id: '42', client_name: 'Acme Ltd', status: 'planning' }),
  });

  assert.deepEqual(insertedProject, {
    name: 'Client portal project',
    client_id: 42,
    client_name: 'Acme Ltd',
    status: 'planning',
  });
});

test('client overview scopes projects to the logged-in client link', async () => {
  const projectFilters = [];
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const responseFor = (table) => ({
    data: table === 'crm_clients' ? { id: 42, name: 'Client User', company: 'Acme Ltd' }
      : table === 'crm_projects' ? [{ id: 17, client_id: 42, name: 'Acme project' }]
      : [],
    error: null,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return profileQuery;
      return {
        select() { return this; },
        eq(field, value) { if (table === 'crm_projects') projectFilters.push([field, value]); return this; },
        maybeSingle: async () => responseFor(table),
        order: async () => responseFor(table),
      };
    },
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/client/overview');

  assert.deepEqual(result.projects, [{ id: 17, client_id: 42, name: 'Acme project' }]);
  assert.deepEqual(projectFilters, [['client_id', 42]]);
});

test('project file downloads request an attachment signed URL', async () => {
  let signedUrlOptions;
  const chain = (result) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => result,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles'
      ? chain({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null })
      : chain({ data: { id: 9, object_path: 'projects/3/brief.pdf' }, error: null }),
    storage: {
      from: () => ({
        createSignedUrl: async (path, expiresIn, options) => {
          signedUrlOptions = { path, expiresIn, options };
          return { data: { signedUrl: 'https://files.example.test/brief.pdf' }, error: null };
        },
      }),
    },
  };
  const repository = createCrmRepository(() => client);
  const url = await repository.getProjectFileUrl(9, { download: true });

  assert.equal(url, 'https://files.example.test/brief.pdf');
  assert.deepEqual(signedUrlOptions, {
    path: 'projects/3/brief.pdf',
    expiresIn: 600,
    options: { download: true },
  });
});

test('assigned employees can open a project file through the assigned project scope', async () => {
  const chain = (result) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => result,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return chain({ data: { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active' }, error: null });
      if (table === 'crm_project_files') return chain({ data: { id: 9, project_id: 3, object_path: 'projects/3/brief.pdf' }, error: null });
      return chain({ data: { id: 3 }, error: null });
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://files.example.test/brief.pdf' }, error: null }),
      }),
    },
  };
  const repository = createCrmRepository(() => client);
  assert.equal(await repository.getProjectFileUrl(9), 'https://files.example.test/brief.pdf');
});

test('assigned employees can upload a folder into their project files', async () => {
  let insertedFolder;
  let insertedFile;
  const query = (result) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => result,
  });
  const folderQuery = {
    insert(payload) { insertedFolder = payload; return this; },
    select() { return this; },
    single: async () => ({ data: { id: 11, project_id: 3, name: 'handoff', created_by: 'employee-auth-id' }, error: null }),
  };
  const fileQuery = {
    insert(payload) { insertedFile = payload; return this; },
    select() { return this; },
    single: async () => ({ data: { id: 12, ...insertedFile }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return query({ data: { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active' }, error: null });
      if (table === 'crm_projects') return query({ data: { id: 3 }, error: null });
      if (table === 'crm_project_folders') return folderQuery;
      return fileQuery;
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'projects/3/handoff.pdf' }, error: null }),
      }),
    },
  };
  const repository = createCrmRepository(() => client);
  const file = { name: 'brief.pdf', webkitRelativePath: 'handoff/brief.pdf', type: 'application/pdf', size: 12 };
  const result = await repository.uploadProjectFolder(3, [file], 'handoff');

  assert.equal(result.items.length, 1);
  assert.deepEqual(insertedFolder, { project_id: 3, parent_id: null, name: 'handoff', created_by: 'employee-auth-id' });
  assert.equal(insertedFile.project_id, 3);
  assert.equal(insertedFile.folder_id, 11);
  assert.equal(insertedFile.uploaded_by, 'employee-auth-id');
});

test('invoice balances use received amounts and treat cancelled invoices as void', () => {
  const invoice = { total_amount: 1000, received_amount: 250, status: 'sent' };
  assert.equal(invoiceTotal(invoice), 1000);
  assert.equal(invoiceReceived(invoice), 250);
  assert.equal(invoiceBalance(invoice), 750);
  assert.equal(invoiceBalance({ ...invoice, status: 'cancelled' }), 0);
  assert.equal(invoiceReceived({ total_amount: 1000, status: 'paid' }), 1000);
});

test('invoice totals normalize line items and settle fully-paid invoices', () => {
  const totals = calculateInvoiceTotals([
    { description: 'Design', quantity: 2, rate: 500 },
    { description: 'Ignored blank row', quantity: 0, rate: 0 },
    { description: '', quantity: 1, rate: 999 },
  ], { discount_amount: 100, tax_amount: 50, received_amount: 950 });

  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.total, 950);
  assert.equal(totals.received, 950);
  assert.equal(totals.status, 'paid');
  assert.equal(totals.items.length, 2);
});

test('invoice ledger entries stay separate from cash income and expenses', () => {
  assert.equal(FINANCE_TRANSACTION_TYPES.has('invoice'), true);
  assert.equal(FINANCE_INCOME_TRANSACTION_TYPES.has('invoice'), true);
  assert.equal(FINANCE_CASH_TRANSACTION_TYPES.has('invoice'), false);
  assert.equal(FINANCE_EXPENSE_TRANSACTION_TYPES.has('invoice'), false);
  assert.equal(FINANCE_CASH_TRANSACTION_TYPES.has('income'), true);
  assert.equal(FINANCE_EXPENSE_TRANSACTION_TYPES.has('expense'), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'pending' }), false);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'received' }), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'invoice', status: 'cancelled' }), false);
  assert.equal(isIncomeTransaction({ transaction_type: 'income', status: 'received' }), true);
  assert.equal(isIncomeTransaction({ transaction_type: 'income', status: 'pending' }), false);
});

test('report export creates a PDF artifact from supplied report rows', () => {
  const { document, fileName } = buildCrmReportPdf({
    report: {
      key: 'tickets',
      title: 'Support Tickets Report',
      subtitle: 'Live ticket records.',
      metrics: [['Open', 1]],
      columns: [['id', 'Ticket'], ['subject', 'Subject']],
      rows: [{ id: 'TIC-9', subject: 'Production issue' }],
    },
    from: '2026-09-01',
    to: '2026-09-09',
  });
  assert.match(fileName, /^techmigos-tickets-2026-09-01-to-2026-09-09\.pdf$/);
  const header = Buffer.from(document.output('arraybuffer')).subarray(0, 4).toString('utf8');
  assert.equal(header, '%PDF');
});

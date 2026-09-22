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
  expenseRows,
  incomeRows,
  selectFinanceSheetRows,
  invoiceEffectiveStatus,
  isIncomeTransaction,
  invoiceBalance,
  invoiceReceived,
  invoiceTotal,
  outstandingInvoiceRows,
} from '../src/lib/crm/finance.js';
import { buildCrmReportPdf } from '../src/scripts/crm-pdf.js';
import { CRM_LIST_LIMIT, createCrmRepository, validateFinanceProofPath, validateInvoiceAssetPath, validateProfileInput, validateProjectFileInput, validateProjectInput, validateSettingsInput, validateTicketInput } from '../src/lib/crm/repository.js';

const testProvisioningPassword = ['Temp', 'Pass', '123!'].join('');

// The repository builds list reads as `select().order().limit()` and awaits the
// builder, so list-query fakes stay chainable and thenable.
function listQuery(resultFor) {
  return {
    select() { return this; },
    eq() { return this; },
    order() { return this; },
    limit() { return this; },
    then(resolve, reject) { return Promise.resolve(resultFor()).then(resolve, reject); },
  };
}

test('list reads cap at the row limit and report truncation instead of dropping rows silently', async () => {
  const profile = { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' };
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: profile, error: null }),
  };
  let requestedLimit = 0;
  const overCapRows = Array.from({ length: CRM_LIST_LIMIT + 1 }, (_, index) => ({ id: index + 1, name: `record ${index + 1}`, created_at: '2026-09-01T00:00:00Z' }));
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return profileQuery;
      return {
        select() { return this; },
        order() { return this; },
        limit(value) { requestedLimit = value; return this; },
        then(resolve, reject) { return Promise.resolve({ data: overCapRows, error: null }).then(resolve, reject); },
      };
    },
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/projects');

  assert.equal(requestedLimit, CRM_LIST_LIMIT + 1);
  assert.equal(result.items.length, CRM_LIST_LIMIT);
  assert.equal(result.truncated, true);

  const underCapClient = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => (table === 'crm_profiles' ? profileQuery : listQuery(() => ({ data: [{ id: 1, name: 'single' }], error: null }))),
  };
  const underCapResult = await createCrmRepository(() => underCapClient).request('/api/portal/projects');
  assert.equal(underCapResult.items.length, 1);
  assert.equal(underCapResult.truncated, false);
});

test('RBAC keeps Admin, Employee, and Client capabilities separate', () => {
  assert.equal(canManageUsers(CRM_ROLES.ADMIN), true);
  assert.equal(canManageUsers(CRM_ROLES.EMPLOYEE), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canWrite(CRM_ROLES.EMPLOYEE, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'finances'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'projects'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'tickets'), true);
  assert.equal(canWrite(CRM_ROLES.CLIENT, 'invoices'), false);
  assert.equal(canUpdate(CRM_ROLES.CLIENT, 'tickets'), false);
  assert.equal(canDelete(CRM_ROLES.CLIENT, 'tickets'), false);
  assert.equal(canUpdate(CRM_ROLES.CLIENT, 'ticket_messages'), false);
  assert.equal(canDelete(CRM_ROLES.CLIENT, 'ticket_messages'), false);
});

test('employees can only use assigned project delivery and support resources', () => {
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'projects'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'tickets'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'clients'), false);
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'projects'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'ticket_messages'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'project_files'), true);
  assert.equal(canDelete(CRM_ROLES.EMPLOYEE, 'project_files'), false);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'clients'), false);
  assert.equal(canDelete(CRM_ROLES.ADMIN, 'profiles'), false);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_files'), false);
  assert.equal(canUpdate(CRM_ROLES.CLIENT, 'project_folders'), false);
});

test('the complete role/resource matrix keeps disabled and financial resources out of employee and client scope', () => {
  const resources = [
    'clients', 'projects', 'project_members', 'project_folders', 'project_files',
    'tickets', 'ticket_messages', 'invoices', 'invoice_items', 'finances',
    'profiles', 'settings', 'activities',
  ];
  const adminReadable = new Set(resources);
  const employeeReadable = new Set(['projects', 'project_folders', 'project_files', 'tickets', 'ticket_messages']);
  const clientReadable = new Set(['clients', 'projects', 'tickets', 'invoices', 'invoice_items', 'ticket_messages']);
  for (const [role, expected] of [[CRM_ROLES.ADMIN, adminReadable], [CRM_ROLES.EMPLOYEE, employeeReadable], [CRM_ROLES.CLIENT, clientReadable]]) {
    for (const resource of resources) assert.equal(canRead(role, resource), expected.has(resource), `${role} read ${resource}`);
  }
  for (const resource of ['leads', 'deals', 'followups', 'campaigns']) {
    assert.equal(canRead(CRM_ROLES.ADMIN, resource), false, `disabled admin read ${resource}`);
    assert.equal(canWrite(CRM_ROLES.ADMIN, resource), false, `disabled admin write ${resource}`);
  }
  for (const resource of ['invoices', 'invoice_items', 'finances', 'profiles', 'settings']) {
    assert.equal(canRead(CRM_ROLES.EMPLOYEE, resource), false, `employee read ${resource}`);
    assert.equal(canRead(CRM_ROLES.CLIENT, resource), resource === 'invoices' || resource === 'invoice_items', `client restricted read ${resource}`);
  }
});

test('project-folder and file permissions retain company-only boundaries', () => {
  assert.equal(canCreate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canUpdate(CRM_ROLES.ADMIN, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'project_folders'), true);
  assert.equal(canRead(CRM_ROLES.CLIENT, 'project_folders'), false);
  assert.equal(canCreate(CRM_ROLES.CLIENT, 'project_files'), false);
});

test('private storage paths stay inside their feature bucket prefixes', () => {
  assert.equal(validateFinanceProofPath('records/42/receipt.pdf'), 'records/42/receipt.pdf');
  assert.equal(validateInvoiceAssetPath('invoice-assets/logo/company.png'), 'invoice-assets/logo/company.png');
  assert.throws(() => validateFinanceProofPath('../private/receipt.pdf'), /invalid finance proof path/i);
  assert.throws(() => validateFinanceProofPath('projects/42/receipt.pdf'), /invalid finance proof path/i);
  assert.throws(() => validateInvoiceAssetPath('records/42/receipt.pdf'), /invalid invoice asset path/i);
  assert.throws(() => validateInvoiceAssetPath('signatures/../other.png'), /invalid invoice asset path/i);
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
  assert.throws(() => validateProjectInput({ name: 'Launch', progress: 101 }, { creating: true }), /progress.*0 to 100/i);
  assert.throws(() => validateProjectInput({ name: 'Launch', progress: 42.5 }, { creating: true }), /progress.*0 to 100/i);
});

test('project file input enforces the private drive MIME and size contract', () => {
  assert.doesNotThrow(() => validateProjectFileInput({ type: 'application/pdf', size: 1024 }));
  assert.throws(() => validateProjectFileInput({ type: 'application/x-msdownload', size: 1024 }), /Unsupported project file type/);
  assert.throws(() => validateProjectFileInput({ type: 'application/pdf', size: 50 * 1024 * 1024 + 1 }), /50 MB/);
});

test('client logins must be linked to a CRM client', () => {
  assert.throws(() => validateProfileInput({ role: CRM_ROLES.CLIENT }), /client/i);
  assert.throws(() => validateProfileInput({ role: CRM_ROLES.CLIENT, client_id: 'not-a-client' }), /client/i);
  assert.doesNotThrow(() => validateProfileInput({ role: CRM_ROLES.CLIENT, client_id: 42 }));
  assert.doesNotThrow(() => validateProfileInput({ role: CRM_ROLES.EMPLOYEE }));
});

test('repository rejects missing and inactive CRM profiles during session hydration', async () => {
  const cases = [
    { profile: null, error: /not provisioned/i },
    { profile: { id: 9, role: CRM_ROLES.EMPLOYEE, status: 'inactive' }, error: /not active/i },
  ];

  for (const { profile, error } of cases) {
    const profileQuery = {
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: profile, error: null }),
    };
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'portal-auth-id' } }, error: null }) },
      from: () => profileQuery,
    };
    const repository = createCrmRepository(() => client);

    await assert.rejects(() => repository.getProfile(), error);
  }
});

test('ticket input keeps support records valid and relationship-ready', () => {
  assert.doesNotThrow(() => validateTicketInput({ client_id: 42, subject: 'Production issue', priority: 'high', status: 'open' }, { creating: true }));
  assert.throws(() => validateTicketInput({ subject: 'Missing client' }, { creating: true }), /CRM client/i);
  assert.throws(() => validateTicketInput({ client_id: 42, subject: ' ', priority: 'high' }, { creating: true }), /subject/i);
  assert.throws(() => validateTicketInput({ priority: 'critical' }), /priority/i);
  assert.throws(() => validateTicketInput({ status: 'queued' }), /status/i);
});

test('settings input accepts supported fields and rejects unsafe configuration values', () => {
  assert.deepEqual(validateSettingsInput('company', { company_name: 'TechMigos', company_email: 'ops@techmigos.test', ignored: 'drop me' }), {
    company_name: 'TechMigos',
    company_email: 'ops@techmigos.test',
  });
  assert.deepEqual(validateSettingsInput('invoice', { taxRate: '18', logoPath: 'invoice-assets/logo/mark.png', isRecurring: 'on' }), {
    taxRate: 18,
    logoPath: 'invoice-assets/logo/mark.png',
    isRecurring: true,
  });
  assert.throws(() => validateSettingsInput('company', { company_email: 'not-an-email' }), /email/i);
  assert.throws(() => validateSettingsInput('invoice', { taxRate: 101 }), /between 0 and 100/i);
  assert.throws(() => validateSettingsInput('invoice', { logoPath: '../private.png' }), /invalid invoice asset path/i);
  assert.throws(() => validateSettingsInput('invoice', { unsupported: 'value' }), /supported settings/i);
});

test('repository settings updates preserve live values while rejecting arbitrary JSON keys', async () => {
  let updatePayload;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null }),
  };
  const settingsQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 4, settings: { currency: 'INR', keep: 'existing' } }, error: null }),
    update(payload) { updatePayload = payload; return this; },
    single: async () => ({ data: { id: 4, settings: updatePayload.settings }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : settingsQuery,
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/settings/invoice', {
    method: 'PATCH',
    body: JSON.stringify({ taxRate: '18', unsupported: 'secret' }),
  });
  assert.equal(result.settings.taxRate, 18);
  assert.equal(result.settings.currency, 'INR');
  assert.equal(result.settings.unsupported, undefined);
  assert.equal(updatePayload.settings.keep, 'existing');
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
    body: JSON.stringify({ operation: 'provision', name: 'New Employee', email: 'new.employee@example.com', role: 'company_member', client_id: 42, password: testProvisioningPassword }),
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
    body: JSON.stringify({ operation: 'provision', name: 'Client User', email: 'client@example.com', role: CRM_ROLES.CLIENT, client_id: 42, password: testProvisioningPassword }),
  });

  assert.equal(invocation.name, 'admin-users');
  assert.equal(invocation.options.body.role, CRM_ROLES.CLIENT);
  assert.equal(invocation.options.body.client_id, 42);
});

test('confirmed cleanup is admin-only and sends normalized allowlisted records to the RPC', async () => {
  let rpcCall;
  const createClient = (role) => {
    const profileQuery = {
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({
        data: { id: 1, auth_user_id: 'portal-auth-id', role, status: 'active' },
        error: null,
      }),
    };
    return {
      auth: { getUser: async () => ({ data: { user: { id: 'portal-auth-id' } }, error: null }) },
      from: () => profileQuery,
      rpc: async (...args) => {
        rpcCall = args;
        return { data: { deleted_count: 2 }, error: null };
      },
    };
  };

  const adminRepository = createCrmRepository(() => createClient(CRM_ROLES.ADMIN));
  const result = await adminRepository.purgeConfirmedRecords([
    { resource: ' clients ', id: '12' },
    { resource: 'tickets', id: 7 },
  ], 'remove approved demo records');

  assert.deepEqual(result, { deleted_count: 2 });
  assert.deepEqual(rpcCall, ['purge_confirmed_crm_records', {
    p_records: [{ resource: 'clients', id: 12 }, { resource: 'tickets', id: 7 }],
    p_reason: 'remove approved demo records',
  }]);

  const employeeRepository = createCrmRepository(() => createClient(CRM_ROLES.EMPLOYEE));
  await assert.rejects(
    () => employeeRepository.purgeConfirmedRecords([{ resource: 'clients', id: 12 }], 'not permitted'),
    /only company admins/i,
  );
});

test('confirmed cleanup rejects unsupported or invalid records before calling the RPC', async () => {
  let rpcCalled = false;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'portal-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'portal-auth-id' } }, error: null }) },
    from: () => profileQuery,
    rpc: async () => { rpcCalled = true; return { data: {}, error: null }; },
  };
  const repository = createCrmRepository(() => client);

  await assert.rejects(
    () => repository.purgeConfirmedRecords([{ resource: 'profiles', id: 1 }], 'invalid target'),
    /only valid client or ticket records/i,
  );
  await assert.rejects(
    () => repository.purgeConfirmedRecords([{ resource: 'tickets', id: 0 }], 'invalid target'),
    /only valid client or ticket records/i,
  );
  assert.equal(rpcCalled, false);
});

test('workspace snapshots are repository-scoped by role and exclude disabled modules', async () => {
  const requestedTables = [];
  const profile = { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' };
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: profile, error: null }),
  };
  let profileLookups = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles' && profileLookups === 0) { profileLookups += 1; return profileQuery; }
      return listQuery(() => {
        requestedTables.push(table);
        return { data: [], error: null };
      });
    },
  };
  const repository = createCrmRepository(() => client);
  const snapshot = await repository.loadWorkspaceSnapshot();

  assert.equal(snapshot.profile, profile);
  assert.ok(requestedTables.includes('crm_projects'));
  assert.ok(requestedTables.includes('crm_invoice_items'));
  assert.ok(requestedTables.includes('crm_profiles'));
  assert.equal(requestedTables.some((table) => /leads|deals|followups|campaigns/.test(table)), false);
});

test('invoice signatures persist private object paths and return short-lived signed URLs', async () => {
  let updatedInvoice;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null }),
  };
  const invoiceQuery = {
    update(payload) { updatedInvoice = payload; return this; },
    eq() { return this; },
    select() { return this; },
    single: async () => ({ data: { id: 12, sign_url: updatedInvoice.sign_url }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : invoiceQuery,
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        createSignedUrl: async (path) => ({ data: { signedUrl: `https://signed.example.test/${path}` }, error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/invoices/12/upload-sign', {
    method: 'POST',
    body: { get: () => ({ name: 'signature.png', type: 'image/png', size: 128 }) },
  });

  assert.match(updatedInvoice.sign_url, /^signatures\/12\//);
  assert.equal(result.sign_path, updatedInvoice.sign_url);
  assert.match(result.sign_url, /^https:\/\/signed\.example\.test\//);
});

test('linked clients can resolve only invoice assets referenced by their own invoice', async () => {
  const filters = [];
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 2, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const invoiceQuery = {
    select() { return this; },
    eq(field, value) { filters.push([field, value]); return this; },
    maybeSingle: async () => ({ data: { id: 17, client_id: 42, sign_url: '', invoice_branding: { logo_path: 'invoice-assets/logo/brand.png' } }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : invoiceQuery,
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.example.test/logo' }, error: null }),
      }),
    },
  };
  const repository = createCrmRepository(() => client);
  const url = await repository.getInvoiceAssetUrl('invoice-assets/logo/brand.png', 17);

  assert.equal(url, 'https://signed.example.test/logo');
  assert.deepEqual(filters, [['id', 17], ['client_id', 42]]);
  await assert.rejects(() => repository.getInvoiceAssetUrl('invoice-assets/logo/other.png', 17), /not linked/i);
});

test('linked clients must ownership-check legacy external invoice assets', async () => {
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 2, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const invoiceQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 17, client_id: 42, sign_url: 'https://cdn.example.test/linked.png', invoice_branding: {} }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : invoiceQuery,
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'unused' }, error: null }) }) },
  };
  const repository = createCrmRepository(() => client);
  assert.equal(await repository.getInvoiceAssetUrl('https://cdn.example.test/linked.png', 17), 'https://cdn.example.test/linked.png');
  await assert.rejects(() => repository.getInvoiceAssetUrl('https://cdn.example.test/unlinked.png', 17), /not linked/i);
});

test('employee workspace snapshots never request company-wide finance or user resources', async () => {
  const requestedTables = [];
  const profile = { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active' };
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: profile, error: null }),
  };
  let profileLookups = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles' && profileLookups === 0) { profileLookups += 1; return profileQuery; }
      return listQuery(() => {
        requestedTables.push(table);
        return { data: [], error: null };
      });
    },
  };
  const repository = createCrmRepository(() => client);
  await repository.loadWorkspaceSnapshot();

  assert.deepEqual(requestedTables.sort(), [
    'crm_project_files', 'crm_project_folders', 'crm_projects', 'crm_ticket_messages', 'crm_tickets',
  ]);
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
  await assert.rejects(
    () => repository.request('/api/portal/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Invalid progress project', progress: 101 }),
    }),
    /progress.*0 to 100/i,
  );
});

test('support ticket creation rejects a project linked to another client', async () => {
  let insertedTicket;
  let projectClientId = 42;
  const chain = (result) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => result,
    insert(payload) { insertedTicket = payload; return this; },
    single: async () => ({ data: { id: 9, ...insertedTicket }, error: null }),
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles'
      ? chain({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null })
      : table === 'crm_projects'
        ? chain({ data: { id: 17, client_id: projectClientId }, error: null })
        : chain(null),
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/tickets', {
    method: 'POST',
    body: JSON.stringify({ client_id: 42, project_id: 17, subject: 'Linked support issue', priority: 'medium' }),
  });
  assert.deepEqual(insertedTicket, { client_id: 42, project_id: 17, subject: 'Linked support issue', priority: 'medium' });

  projectClientId = 99;
  await assert.rejects(
    () => repository.request('/api/portal/tickets', {
      method: 'POST',
      body: JSON.stringify({ client_id: 42, project_id: 17, subject: 'Cross-client issue', priority: 'medium' }),
    }),
    /must belong to the selected client/i,
  );
});

test('invoice saves validate the project-to-client relationship before the RPC', async () => {
  let rpcPayload;
  let projectClientId = 42;
  const chain = (result) => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => result,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles'
      ? chain({ data: { id: 1, auth_user_id: 'admin-auth-id', role: CRM_ROLES.ADMIN, status: 'active' }, error: null })
      : chain({ data: { id: 17, client_id: projectClientId }, error: null }),
    rpc: async (name, payload) => {
      rpcPayload = { name, payload };
      return { data: { invoice: { id: 8 }, items: [] }, error: null };
    },
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/invoices', {
    method: 'POST',
    body: JSON.stringify({ invoice: { client_id: 42, project_id: 17 }, items: [{ description: 'Delivery', quantity: 1, rate: 100 }] }),
  });
  assert.equal(rpcPayload.name, 'save_invoice_with_items');
  assert.equal(rpcPayload.payload.p_invoice.project_id, 17);

  projectClientId = 99;
  await assert.rejects(
    () => repository.request('/api/portal/invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice: { client_id: 42, project_id: 17 }, items: [{ description: 'Delivery', quantity: 1, rate: 100 }] }),
    }),
    /must belong to the selected client/i,
  );
});

test('client overview scopes projects to the logged-in client link', async () => {
  const projectFilters = [];
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 1, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const responseFor = (table) => ({
    data: table === 'crm_clients' ? { id: 42, name: 'Client User', company: 'Acme Ltd', notes: 'internal client note', marketing_opt_in: true }
      : table === 'crm_projects' ? [{ id: 17, client_id: 42, name: 'Acme project', budget: 9000, expenses: 1200, revenue: 7000, owner_user_id: 'employee-secret', notes: 'internal delivery note' }]
      : [],
    error: null,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return profileQuery;
      const query = listQuery(() => responseFor(table));
      query.eq = function eq(field, value) { if (table === 'crm_projects') projectFilters.push([field, value]); return this; };
      query.maybeSingle = async () => responseFor(table);
      return query;
    },
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/client/overview');

  assert.deepEqual(result.projects, [{ id: 17, client_id: 42, name: 'Acme project' }]);
  assert.equal(result.client.notes, undefined);
  assert.equal(result.client.marketing_opt_in, undefined);
  assert.equal(result.projects[0].budget, undefined);
  assert.equal(result.projects[0].owner_user_id, undefined);
  assert.equal(result.projects[0].notes, undefined);
  assert.deepEqual(projectFilters, [['client_id', 42]]);
});

test('client invoice and ticket payloads exclude internal project, finance, and assignment fields', async () => {
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 2, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const responseFor = (table) => ({
    data: table === 'crm_clients' ? { id: 42, name: 'Client User' }
      : table === 'crm_invoices' ? [{ id: 8, client_id: 42, invoice_number: 'INV-8', total_amount: 1000, project_snapshot: { expenses: 99 }, internal_finance_note: 'secret' }]
      : table === 'crm_tickets' ? [{ id: 9, client_id: 42, subject: 'Need help', assigned_user_id: 'employee-secret', assigned_to: 'Employee Name' }]
      : [],
    error: null,
  });
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => {
      if (table === 'crm_profiles') return profileQuery;
      const query = listQuery(() => responseFor(table));
      query.maybeSingle = async () => responseFor(table);
      return query;
    },
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/client/overview');
  assert.equal(result.invoices[0].project_snapshot, undefined);
  assert.equal(result.invoices[0].internal_finance_note, undefined);
  assert.equal(result.tickets[0].assigned_user_id, undefined);
  assert.equal(result.tickets[0].assigned_to, undefined);
});

test('employee project responses request only operational fields', async () => {
  let selectedFields = '';
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active' }, error: null }),
  };
  const projectQuery = {
    select(fields) { selectedFields = fields; return this; },
    order() { return this; },
    limit() { return this; },
    then(resolve, reject) { return Promise.resolve({ data: [{ id: 12, name: 'Assigned delivery' }], error: null }).then(resolve, reject); },
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : projectQuery,
  };
  const repository = createCrmRepository(() => client);
  await repository.request('/api/portal/projects');

  assert.match(selectedFields, /progress/);
  assert.doesNotMatch(selectedFields, /budget|expenses|revenue/);
});

test('employee mutation RPCs never return full project or ticket rows', async () => {
  const { readFile } = await import('node:fs/promises');
  const migration = await readFile(
    new URL('../supabase/migrations/20260919100000_minimize_employee_rpc_responses.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /employee_update_project[\s\S]*returns jsonb/i);
  assert.match(migration, /employee_update_ticket[\s\S]*returns jsonb/i);
  assert.doesNotMatch(migration, /returns public\.crm_projects|returns public\.crm_tickets/i);
  assert.doesNotMatch(migration, /'budget'|'expenses'|'revenue'|'assigned_user_id'/i);
});

test('client ticket conversations validate the ticket-to-client relationship before reading messages', async () => {
  const ticketFilters = [];
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 2, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const ticketQuery = {
    select() { return this; },
    eq(field, value) { ticketFilters.push([field, value]); return this; },
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : ticketQuery,
  };
  const repository = createCrmRepository(() => client);

  await assert.rejects(
    () => repository.request('/api/portal/client/tickets/99/messages'),
    /not available/i,
  );
  assert.deepEqual(ticketFilters, [['id', 99], ['client_id', 42]]);
});

test('client repository rejects generic ticket updates and deletes', async () => {
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 42, auth_user_id: 'client-auth-id', role: CRM_ROLES.CLIENT, status: 'active', client_id: 42 }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'client-auth-id' } }, error: null }) },
    from: () => profileQuery,
  };
  const repository = createCrmRepository(() => client);
  await assert.rejects(
    () => repository.request('/api/portal/tickets/99', { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) }),
    /Client portal support workflow/i,
  );
  await assert.rejects(
    () => repository.request('/api/portal/tickets/99', { method: 'DELETE' }),
    /Client portal support workflow/i,
  );
  await assert.rejects(
    () => repository.request('/api/portal/tickets', { method: 'POST', body: JSON.stringify({ client_id: 999, subject: 'Cross-client ticket' }) }),
    /Client portal support workflow/i,
  );
  await assert.rejects(
    () => repository.request('/api/portal/ticket_messages', { method: 'POST', body: JSON.stringify({ ticket_id: 99, body: 'Forged message' }) }),
    /ticket conversation workflow/i,
  );
  await assert.rejects(
    () => repository.request('/api/portal/projects'),
    /Client portal workflow/i,
  );
});

test('ticket message RLS requires role-matched visibility for direct writes', async () => {
  const { readFile } = await import('node:fs/promises');
  const policy = await readFile(
    new URL('../supabase/migrations/20260918100000_tighten_ticket_message_insert_rls.sql', import.meta.url),
    'utf8',
  );
  const ticketPolicy = await readFile(
    new URL('../supabase/migrations/20260918101000_tighten_client_ticket_insert_rls.sql', import.meta.url),
    'utf8',
  );
  assert.match(policy, /get_user_role\(\) = 'company_member'[\s\S]*visibility = 'internal'[\s\S]*author_role = 'company_member'/i);
  assert.match(policy, /get_user_role\(\) = 'client'[\s\S]*visibility = 'external'[\s\S]*author_role = 'client'/i);
  assert.match(policy, /is_company_admin\(\)[\s\S]*author_role = 'company_admin'/i);
  assert.match(ticketPolicy, /crm_tickets[\s\S]*client_id = private\.get_user_client_id\(\)[\s\S]*status = 'open'[\s\S]*assigned_user_id is null/i);
  assert.match(ticketPolicy, /project_id is null[\s\S]*project\.client_id = private\.get_user_client_id\(\)/i);
});

test('employee ticket conversations validate assignment before adding internal notes', async () => {
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active' }, error: null }),
  };
  const ticketQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : ticketQuery,
  };
  const repository = createCrmRepository(() => client);

  await assert.rejects(
    () => repository.request('/api/portal/tickets/99/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'Internal update', internal: true }),
    }),
    /not available/i,
  );
});

test('company ticket message workflow preserves employee internal visibility', async () => {
  let insertedMessage;
  const profileQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 7, auth_user_id: 'employee-auth-id', role: CRM_ROLES.EMPLOYEE, status: 'active', name: 'Employee' }, error: null }),
  };
  const ticketQuery = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: { id: 99, project_id: 12, assigned_user_id: 'employee-auth-id' }, error: null }),
  };
  const messageQuery = {
    insert(payload) { insertedMessage = payload; return this; },
    select() { return this; },
    single: async () => ({ data: { ...insertedMessage, id: 1 }, error: null }),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'employee-auth-id' } }, error: null }) },
    from: (table) => table === 'crm_profiles' ? profileQuery : table === 'crm_tickets' ? ticketQuery : messageQuery,
  };
  const repository = createCrmRepository(() => client);
  const result = await repository.request('/api/portal/tickets/99/messages', {
    method: 'POST',
    body: JSON.stringify({ body: 'Delivery update', internal: true }),
  });

  assert.equal(result.item.visibility, 'internal');
  assert.equal(insertedMessage.author_role, CRM_ROLES.EMPLOYEE);
  assert.equal(insertedMessage.visibility, 'internal');
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
  const requestResult = await repository.request('/api/portal/project-files/9/download');
  assert.equal(requestResult.url, 'https://files.example.test/brief.pdf');
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
      if (table === 'crm_projects') return chain({ data: { id: 3 }, error: null });
      return chain({ data: { id: 10 }, error: null });
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

test('unassigned employees cannot open project files even when the file record exists', async () => {
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
      if (table === 'crm_projects') return chain({ data: { id: 3, owner_user_id: 'another-employee-id' }, error: null });
      return chain({ data: null, error: null });
    },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://files.example.test/brief.pdf' }, error: null }) }) },
  };
  const repository = createCrmRepository(() => client);
  await assert.rejects(() => repository.getProjectFileUrl(9), /assigned to you/i);
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
      if (table === 'crm_project_members') return query({ data: { id: 10, profile_id: 7 }, error: null });
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

test('shared finance selectors keep dashboard, ledger, and reports consistent', () => {
  const invoices = [
    { id: 1, total_amount: 1000, received_amount: 250, status: 'sent', due_date: '2099-01-01' },
    { id: 2, total_amount: 500, received_amount: 500, status: 'paid', due_date: '2099-01-01' },
  ];
  const finances = [
    { id: 10, transaction_type: 'income', status: 'received', amount: 300 },
    { id: 11, transaction_type: 'expense', status: 'pending', amount: 75 },
    { id: 12, transaction_type: 'invoice', invoice_id: 1, status: 'pending', amount: 1000 },
  ];

  assert.equal(invoiceEffectiveStatus(invoices[0]), 'sent');
  assert.equal(incomeRows(finances, invoices).reduce((sum, row) => sum + Number(row.amount || 0), 0), 800);
  assert.equal(expenseRows(finances).length, 0);
  assert.equal(outstandingInvoiceRows(invoices, finances).length, 1);
  assert.equal(invoiceBalance(invoices[0]), 750);
});

test('finance sheet selection keeps tab routing and status filters consistent', () => {
  const financeRecords = [
    { id: 'cash', transaction_type: 'income', status: 'received' },
    { id: 'expense-pending', transaction_type: 'expense', status: 'pending' },
    { id: 'salary-paid', transaction_type: 'salary', status: 'paid' },
    { id: 'pending', transaction_type: 'income', status: 'pending' },
    { id: 'half', transaction_type: 'invoice', status: 'half_payment' },
    { id: 'sent', transaction_type: 'invoice', status: 'sent' },
    { id: 'received', transaction_type: 'expense', status: 'received' },
    { id: 'completed', transaction_type: 'invoice', status: 'completed' },
  ];
  const selectedIncome = [{ id: 'shared-income-selector' }];
  const base = { financeRecords, invoiceRecords: [], selectIncomeRows: () => selectedIncome };

  const allRows = selectFinanceSheetRows({ ...base, sheet: 'all' });
  assert.deepEqual(allRows, financeRecords);
  assert.notStrictEqual(allRows, financeRecords);
  assert.deepEqual(selectFinanceSheetRows({ ...base, sheet: 'income' }), selectedIncome);
  assert.deepEqual(selectFinanceSheetRows({ ...base, sheet: 'expenses' }).map((row) => row.id), ['expense-pending', 'received']);
  assert.deepEqual(selectFinanceSheetRows({ ...base, sheet: 'salary' }).map((row) => row.id), ['salary-paid']);
  assert.deepEqual(selectFinanceSheetRows({ ...base, sheet: 'pending' }).map((row) => row.id), ['expense-pending', 'pending', 'half', 'sent']);
  assert.deepEqual(selectFinanceSheetRows({ ...base, sheet: 'paid' }).map((row) => row.id), ['cash', 'salary-paid', 'received', 'completed']);
});

test('finance invoice sheet resolves labels and derives its canonical totals and status', () => {
  const invoice = {
    id: 42,
    invoice_date: '2026-09-01',
    invoice_number: 'TMG-0042',
    client_id: 7,
    project_id: 9,
    customer_name: 'Client label',
    total_amount: 500,
    received_amount: 125,
    status: 'sent',
    notes: 'Milestone one',
  };
  const invoiceWithoutCustomerLabel = {
    ...invoice,
    id: 43,
    customer_name: '',
    client_id: 11,
    project_id: 10,
  };

  const [row, fallbackRow] = selectFinanceSheetRows({
    sheet: 'invoices',
    invoiceRecords: [invoice, invoiceWithoutCustomerLabel],
    clientName: (id) => `Client ${id}`,
    projectName: (id) => `Project ${id}`,
  });

  assert.equal(row.id, 42);
  assert.equal(row.transaction_date, '2026-09-01');
  assert.equal(row.reference_id, 'TMG-0042');
  assert.equal(row.client, 'Client label');
  assert.equal(row.project, 'Project 9');
  assert.equal(row.transaction_type, 'invoice');
  assert.equal(row.amount, 500);
  assert.equal(row.received_amount, 125);
  assert.equal(row.status, 'sent');
  assert.equal(row.notes, 'Milestone one');
  assert.equal(fallbackRow.client, 'Client 11');
  assert.equal(fallbackRow.project, 'Project 10');
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

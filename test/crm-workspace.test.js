import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CRM_ROLES,
  CRM_ROUTE_POLICY,
  canAccessCrmRoute,
  companyRouteEntries,
  hrefForRoute,
  routeActionsForRole,
  routeForPath,
  routeResourcesForRole,
} from '../src/lib/crm/routePolicy.js';
import { createWorkspaceStore } from '../src/lib/crm/workspaceStore.js';
import { createWorkspaceDataRuntime } from '../src/lib/crm/features/workspaceDataRuntime.js';
import { createWorkspaceNavigationClickHandler } from '../src/lib/crm/features/workspaceNavigationActions.js';
import { badge, metric, pageHead, table } from '../src/lib/crm/ui.js';
import { buildReportDefinitions } from '../src/lib/crm/features/reportData.js';
import { renderInvoiceHtml } from '../src/lib/crm/invoiceHtml.js';
import { createSettingsRuntime } from '../src/lib/crm/features/settingsRuntime.js';
import { createFilesRuntime } from '../src/lib/crm/features/filesRuntime.js';
import { createFinanceActionsRuntime } from '../src/lib/crm/features/financeActionsRuntime.js';
import { createProjectActionsRuntime } from '../src/lib/crm/features/projectActionsRuntime.js';
import { createPeopleSelectionActions } from '../src/lib/crm/features/people.js';
import { createReportExportRuntime } from '../src/lib/crm/features/reportExportRuntime.js';
import { handleInvoiceBuilderChange, handleInvoiceBuilderClick, handleInvoiceBuilderInput } from '../src/lib/crm/features/invoiceBuilderRuntime.js';
import { createInvoicePreviewRuntime } from '../src/lib/crm/features/invoicePreviewRuntime.js';
import { createSupportRuntime } from '../src/lib/crm/features/supportRuntime.js';
import { CRM_FORM_FIELDS, CRM_RESOURCE_FIELDS, CRM_TABLE_MAP } from '../src/lib/crm/contracts.js';
import {
  filterWorkspaceRows,
  findClientName,
  findProjectName,
  generateProfileUsername,
  generateTemporaryPassword,
  removeCachedWorkspaceRecord,
  sanitizeWorkspacePayload,
  validateWorkspacePayload,
  workspaceRoleLabel,
} from '../src/lib/crm/features/workspaceUtils.js';
import { closeDialogLayers, dismissDialogFromClick, trapDialogTab } from '../src/lib/crm/features/dialogUtils.js';
import { CRM_ACTION_SELECTOR, createCrmDelegatedEvents } from '../src/lib/crm/features/delegatedEvents.js';
import {
  canCreate,
  canDelete,
  canRead,
  canUpdate,
} from '../src/lib/crm/permissions.js';

test('repository and workspace share one canonical CRM data contract', () => {
  assert.equal(CRM_TABLE_MAP.tickets, 'crm_tickets');
  assert.ok(CRM_RESOURCE_FIELDS.tickets.includes('assigned_user_id'));
  assert.ok(CRM_FORM_FIELDS.tickets.includes('project_id'));
  const repository = readFileSync(fileURLToPath(new URL('../src/lib/crm/repository.js', import.meta.url)), 'utf8');
  const workspace = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  const financeActions = readFileSync(fileURLToPath(new URL('../src/lib/crm/features/financeActionsRuntime.js', import.meta.url)), 'utf8');
  assert.match(repository, /from ['"]\.\/contracts\.js['"]/);
    assert.match(workspace, /from ['"]\.\.\/lib\/crm\/features\/workspaceUtils\.js['"]/);
    assert.doesNotMatch(workspace, /const RESOURCE_FIELDS = \{/);
    assert.match(financeActions, /await loadData\(\{ skipCache: true \}\)/);
    assert.match(workspace, /createWorkspaceDataRuntime\(/);
    assert.match(readFileSync(fileURLToPath(new URL('../src/lib/crm/features/workspaceDataRuntime.js', import.meta.url)), 'utf8'), /const cached = skipCache \? null : storage\.getItem\(cacheKey\('data'\)\)/);
    const workspaceUtils = readFileSync(fileURLToPath(new URL('../src/lib/crm/features/workspaceUtils.js', import.meta.url)), 'utf8');
    assert.match(workspaceUtils, /from ['"]\.\.\/contracts\.js['"]/);
});

test('workspace utility module keeps browser validation and lookup logic pure', () => {
  const password = generateTemporaryPassword({ getRandomValues(bytes) { bytes.fill(1); } });
  assert.match(password, /^Tm@1111111111A7!$/);
  assert.equal(generateProfileUsername({ email: 'A+B@example.com' }, [{ username: 'a-b' }]), 'a-b-2');
  assert.deepEqual(sanitizeWorkspacePayload('tickets', {
    client_id: '7', project_id: '', subject: '  Needs review  ', ignored: 'drop me',
  }), { client_id: 7, project_id: null, subject: 'Needs review' });
  assert.equal(validateWorkspacePayload('projects', { name: 'Build', budget: -1 }), 'budget cannot be negative.');
  assert.deepEqual(filterWorkspaceRows([{ name: 'Alpha' }, { name: 'Beta' }], 'alp', ['name']), [{ name: 'Alpha' }]);
  assert.equal(findClientName([{ id: 7, company: 'Acme' }], 7), 'Acme');
  assert.equal(findProjectName([{ id: 9, name: 'Delivery' }], 9), 'Delivery');
  assert.equal(workspaceRoleLabel('company_member'), 'Employee');
});

test('workspace data runtime shows scoped cache as stale, then replaces it with live data', async () => {
  const state = {
    cacheUserId: 'user-7',
    profile: { role: CRM_ROLES.ADMIN },
    data: { clients: [], finances: [], ticket_messages: [] },
  };
  const store = createWorkspaceStore();
  const cache = new Map([['tm_crm_data_user-7_company_admin', JSON.stringify({
    clients: [{ id: 'cached' }], finances: [{ amount: '4' }], ticket_messages: [],
  })]]);
  const statuses = [];
  const rendered = [];
  const staleTransitions = [];
  store.subscribe((snapshot) => staleTransitions.push(snapshot.stale));
  const runtime = createWorkspaceDataRuntime({
    state,
    workspaceStore: store,
    storage: {
      getItem: (key) => cache.get(key) || null,
      setItem: (key, value) => cache.set(key, value),
    },
    loadSnapshot: async () => ({ data: { clients: [{ id: 'live' }], finances: [{ amount: 8 }] } }),
    normalizeFinanceRecords: (records = []) => records.map((row) => ({ ...row, amount: Number(row.amount) })),
    render: () => rendered.push({ clients: state.data.clients.map((row) => row.id), stale: store.getState().stale }),
    setStatus: (...args) => statuses.push(args),
    logger: { warn() {}, error() {} },
  });

  assert.equal(runtime.cacheKey('data'), 'tm_crm_data_user-7_company_admin');
  await runtime.loadData();

  assert.deepEqual(rendered, [
    { clients: ['cached'], stale: false },
    { clients: ['live'], stale: false },
  ]);
  assert.deepEqual(state.data.finances, [{ amount: 8 }]);
  assert.ok(staleTransitions.includes(true), 'cached data must be marked stale while the live refresh is pending');
  assert.equal(store.getState().stale, false);
  assert.equal(store.getState().loading, false);
  assert.deepEqual(JSON.parse(cache.get(runtime.cacheKey('data'))).clients, [{ id: 'live' }]);
  assert.deepEqual(statuses, [['Syncing with database...', 'success'], ['', 'success']]);
});

test('workspace data runtime can bypass cache and records authoritative load failures', async () => {
  const state = { data: { clients: [], finances: [] } };
  const store = createWorkspaceStore();
  const statuses = [];
  const runtime = createWorkspaceDataRuntime({
    state,
    workspaceStore: store,
    storage: { getItem() { throw new Error('cache should be bypassed'); }, setItem() {} },
    loadSnapshot: async () => { throw new Error('network unavailable'); },
    normalizeFinanceRecords: (records = []) => records,
    render() {},
    setStatus: (...args) => statuses.push(args),
    logger: { warn() {}, error() {} },
  });

  await runtime.loadData({ skipCache: true });

  assert.equal(store.getState().loading, false);
  assert.equal(store.getState().error.message, 'network unavailable');
  assert.deepEqual(statuses, [
    ['Loading Operations & Management data...'],
    ['network unavailable', 'error'],
  ]);
});

test('workspace navigation actions own drawer state and normalize persisted invoice settings', async () => {
  const state = {};
  const saves = [];
  const body = { hidden: false };
  const form = { querySelector: () => body };
  const runtime = createWorkspaceNavigationClickHandler({
    state,
    document: {},
    window: {},
    navigator: {},
    confirmAction: () => false,
    replaceSafeMarkup: (_element, markup) => saves.push(['markup', markup]),
    operationsChevronIcon: (open) => `chevron:${open}`,
    toggleSidebar() {},
    openNotifications() {},
    openProfileManagement() {},
    logout() {},
    loadData() {},
    toast() {},
    saveSettingsSection: async (...args) => saves.push(args),
    renderUsers() {},
    openCreate() {},
    openDataReview() {},
  });
  const drawerToggle = {
    dataset: { drawerSectionToggle: 'billing' },
    expanded: 'true',
    matches: (selector) => selector === '[data-drawer-section-toggle]',
    closest: () => form,
    getAttribute() { return this.expanded; },
    setAttribute(_name, value) { this.expanded = value; },
  };
  const invoiceSettingsButton = { matches: (selector) => selector === '#btn-save-invoice' };

  assert.equal(await runtime(drawerToggle), true);
  assert.equal(body.hidden, true);
  assert.equal(drawerToggle.expanded, 'false');
  assert.deepEqual(saves[0], ['markup', 'chevron:false']);

  assert.equal(await runtime(invoiceSettingsButton), true);
  assert.deepEqual(saves[1].slice(0, 3), ['form-invoice', '/api/portal/settings/invoice', 'status-invoice']);
  assert.deepEqual(saves[1][3]({ starting_number: '0', tax_rate: '12.5' }), { starting_number: 1, tax_rate: 12.5 });
  assert.equal(await runtime({ matches: () => false }), false);
});

test('workspace deletion updates the in-memory snapshot and its session cache', () => {
  const state = { data: { finances: [{ id: 1 }, { id: '2' }], invoices: [{ id: 3 }] } };
  const cache = new Map();
  const storage = {
    setItem(key, value) { cache.set(key, value); },
    removeItem(key) { cache.delete(key); },
  };

  assert.equal(removeCachedWorkspaceRecord(state, 'finances', '1', { storage, key: 'workspace' }), true);
  assert.deepEqual(state.data.finances, [{ id: '2' }]);
  assert.deepEqual(JSON.parse(cache.get('workspace')).finances, [{ id: '2' }]);
  assert.deepEqual(state.data.invoices, [{ id: 3 }]);
});

test('workspace deletion invalidates stale cache if the updated cache cannot be written', () => {
  const state = { data: { invoices: [{ id: 'invoice-1' }] } };
  const removedKeys = [];
  const storage = {
    setItem() { throw new Error('Storage is full'); },
    removeItem(key) { removedKeys.push(key); },
  };

  assert.equal(removeCachedWorkspaceRecord(state, 'invoices', 'invoice-1', { storage, key: 'workspace' }), true);
  assert.deepEqual(state.data.invoices, []);
  assert.deepEqual(removedKeys, ['workspace']);
});

test('dependency manifest and lockfile keep production packages pinned', () => {
  const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
  const packageLock = JSON.parse(readFileSync(fileURLToPath(new URL('../package-lock.json', import.meta.url)), 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'overrides']) {
    for (const [name, version] of Object.entries(packageJson[section] || {})) {
      assert.doesNotMatch(String(version), /^[~^*<>=]|\bx\b/i, `${section}.${name} is not pinned`);
    }
  }
  assert.equal(packageLock.lockfileVersion, 3);
  assert.equal(packageLock.packages[''].dependencies.astro, '7.3.3');
  assert.equal(packageLock.packages[''].devDependencies.tailwindcss, '4.3.3');
  assert.equal(packageLock.packages[''].devDependencies['@tailwindcss/vite'], '4.3.3');
  assert.equal(packageJson.engines.node, '>=22.12.0');
  assert.equal(packageJson.dependencies.autoprefixer, undefined);
  assert.equal(packageJson.dependencies.postcss, undefined);
  assert.match(packageJson.scripts['vercel:build'], /vercel@59\.16\.0/);
  assert.doesNotMatch(JSON.stringify(packageJson.scripts), /vercel@54\.1\.0/);
  assert.equal(packageLock.packages[''].dependencies['@supabase/supabase-js'], '2.116.0');
});

test('Vercel input includes public Astro source content but still excludes local leads data', () => {
  const ignore = readFileSync(fileURLToPath(new URL('../.vercelignore', import.meta.url)), 'utf8');
  assert.match(ignore, /^data\/\*$/m);
  assert.match(ignore, /^!data\/site-content\.json$/m);
  assert.doesNotMatch(ignore, /^!data\/leads\.json$/m);
});

test('shared dialog utilities trap focus and close every CRM overlay', () => {
  const focused = [];
  const first = { getClientRects: () => [1], focus: () => focused.push('first') };
  const last = { getClientRects: () => [1], focus: () => focused.push('last') };
  const dialog = { querySelectorAll: () => [first, last] };
  let prevented = false;
  assert.equal(trapDialogTab({ key: 'Tab', shiftKey: false, target: last, preventDefault: () => { prevented = true; } }, dialog), true);
  assert.equal(prevented, true);
  assert.deepEqual(focused, ['first']);

  const removed = [];
  const layer = { classList: { remove: (name) => removed.push(name) } };
  const root = { querySelectorAll: () => [{ classList: { remove: (name) => removed.push(`menu:${name}`) } }] };
  closeDialogLayers({ modal: layer, invoiceModal: layer, proofPreviewModal: layer, root });
  assert.deepEqual(removed, ['open', 'open', 'open', 'menu:is-open']);
});

test('shared dialog dismissal closes only the matching dialog and only on backdrop clicks', () => {
  const removed = [];
  const layer = { classList: { remove: (name) => removed.push(name) } };
  const closeButton = { id: 'close-invoice', matches: (selector) => selector === '#close-invoice' };
  const backdrop = { id: 'invoice-modal', matches: (selector) => selector === '#invoice-modal' };

  assert.equal(dismissDialogFromClick(closeButton, { target: closeButton }, { invoiceModal: layer }), true);
  assert.equal(dismissDialogFromClick(backdrop, { target: {} }, { invoiceModal: layer }), false);
  assert.equal(dismissDialogFromClick(backdrop, { target: backdrop }, { invoiceModal: layer }), true);
  assert.equal(dismissDialogFromClick({ matches: () => false }, { target: {} }, { invoiceModal: layer }), false);
  assert.deepEqual(removed, ['open', 'open']);
});

test('company route policy exposes all nine routes to administrators', () => {
  assert.equal(Object.keys(CRM_ROUTE_POLICY).length, 9);
  assert.equal(companyRouteEntries(CRM_ROLES.ADMIN).length, 9);
  assert.equal(routeForPath('/company/finance'), 'finance');
  assert.equal(hrefForRoute('tickets'), '/company/support');
  for (const route of Object.values(CRM_ROUTE_POLICY)) {
    assert.ok(route.title);
    assert.ok(route.href.startsWith('/company'));
    assert.ok(route.readableResources.length > 0);
    assert.ok(route.supportedActions.includes('read'));
  }
});

test('Astro navigation is projected from the canonical route policy', () => {
  const navPath = fileURLToPath(new URL('../src/lib/crmNav.ts', import.meta.url));
  const sidebarPath = fileURLToPath(new URL('../src/components/crm/Sidebar.astro', import.meta.url));
  const nav = readFileSync(navPath, 'utf8');
  const sidebar = readFileSync(sidebarPath, 'utf8');
  assert.match(nav, /roles: \[\.\.\.route\.roles\]/);
  assert.match(nav, /readableResources: \[\.\.\.route\.readableResources\]/);
  assert.match(nav, /supportedActions: \[\.\.\.route\.supportedActions\]/);
  assert.match(sidebar, /data-required-roles=\{item\.roles\.join\(','\)\}/);
  assert.match(sidebar, /data-readable-resources=\{item\.readableResources\.join\(','\)\}/);
  assert.match(sidebar, /data-supported-actions=\{item\.supportedActions\.join\(','\)\}/);
});

test('employee route policy is assigned-work focused', () => {
  assert.equal(canAccessCrmRoute(CRM_ROLES.EMPLOYEE, 'projects'), true);
  assert.equal(canAccessCrmRoute(CRM_ROLES.EMPLOYEE, 'support'), true);
  assert.equal(canAccessCrmRoute(CRM_ROLES.EMPLOYEE, 'finance'), false);
  assert.equal(canAccessCrmRoute(CRM_ROLES.EMPLOYEE, 'users'), false);
  assert.deepEqual(routeResourcesForRole('analytics', CRM_ROLES.EMPLOYEE), ['projects', 'tickets']);
  assert.deepEqual(routeResourcesForRole('reports', CRM_ROLES.EMPLOYEE), ['projects', 'tickets']);
  assert.deepEqual(routeActionsForRole('projects', CRM_ROLES.EMPLOYEE), ['read', 'update']);
  assert.equal(routeResourcesForRole('finance', CRM_ROLES.EMPLOYEE).length, 0);
  assert.equal(companyRouteEntries(CRM_ROLES.EMPLOYEE).some((route) => route.readableResources.includes('finances')), false);
});

test('employee resource permissions allow only scoped work operations', () => {
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'tickets'), true);
  assert.equal(canCreate(CRM_ROLES.EMPLOYEE, 'ticket_messages'), true);
  assert.equal(canUpdate(CRM_ROLES.EMPLOYEE, 'tickets'), true);
  assert.equal(canDelete(CRM_ROLES.EMPLOYEE, 'tickets'), false);
  assert.equal(canRead(CRM_ROLES.EMPLOYEE, 'finances'), false);
});

test('shared CRM UI primitives escape data while preserving table semantics', () => {
  assert.doesNotMatch(badge('<script>alert(1)</script>'), /<script>/);
  assert.doesNotMatch(metric('<img src=x onerror=alert(1)>', '<b>1</b>', '<svg></svg>', 'blue', '<script>'), /<img|<b>|<script>/);
  assert.doesNotMatch(pageHead('<img src=x>', '<script>alert(1)</script>', '<button>safe markup</button>'), /<img|<script>/);
  assert.match(table(['Name'], '<tr><td>Live</td></tr>'), /data-label="Name"/);
});

test('settings mutations update the shared in-memory settings snapshot', async () => {
  const originalDocument = globalThis.document;
  const originalFormData = globalThis.FormData;
  const originalSetTimeout = globalThis.setTimeout;
  const state = { companySettings: {}, invoiceSettings: {} };
  const form = {};
  const status = { style: {}, textContent: '' };
  globalThis.document = { getElementById(id) { return id === 'form-company' ? form : id === 'status-company' ? status : null; } };
  globalThis.FormData = class FakeFormData {
    constructor() { this.values = [['company_name', 'Updated Co']]; }
    entries() { return this.values[Symbol.iterator](); }
  };
  globalThis.setTimeout = () => 0;
  try {
    const runtime = createSettingsRuntime({
      state,
      portal: async () => ({ settings: { company_name: 'Updated Co' } }),
      toast() {},
    });
    assert.equal(await runtime.saveSettingsSection('form-company', '/api/portal/settings/company', 'status-company'), true);
    assert.deepEqual(state.companySettings, { company_name: 'Updated Co' });
  } finally {
    globalThis.document = originalDocument;
    globalThis.FormData = originalFormData;
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('report definitions share role scope and date-filtered finance selectors', () => {
  const state = {
    reportFrom: '2026-09-01',
    reportTo: '2026-09-30',
    data: {
      projects: [
        { id: 1, name: 'Current project', client_id: 10, progress: 40, status: 'active', health: 'on_track', created_at: '2026-09-05' },
        { id: 2, name: 'Older project', client_id: 11, progress: 90, status: 'completed', health: 'on_track', created_at: '2026-08-05' },
      ],
      tickets: [
        { id: 3, client_id: 10, priority: 'high', status: 'open', created_at: '2026-09-06' },
        { id: 4, client_id: 11, priority: 'low', status: 'closed', created_at: '2026-08-06' },
      ],
      invoices: [{ id: 5, client_id: 10, total_amount: 100, status: 'sent', invoice_date: '2026-09-07' }],
      finances: [{ id: 6, amount: 25, transaction_type: 'income', status: 'received', transaction_date: '2026-09-08' }],
      clients: [{ id: 10, name: 'Current client', status: 'active', created_at: '2026-09-05' }],
      project_files: [{ id: 7, project_id: 1 }],
    },
  };
  const common = {
    state,
    incomeRows: (finances) => finances,
    expenseRows: () => [],
    sumAmounts: (rows) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    outstandingInvoiceAmount: (invoices) => invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    compactMoney: (value) => `₹${Number(value || 0)}`,
    clientName: (id) => `Client ${id}`,
    ensureReportDates: () => {},
  };
  const admin = buildReportDefinitions({ ...common, isEmployee: () => false });
  const employee = buildReportDefinitions({ ...common, isEmployee: () => true });
  assert.equal(admin.projects.rows.length, 1);
  assert.equal(admin.finance.rows.length, 2);
  assert.match(admin.executive.title, /Executive/);
  assert.match(employee.executive.title, /Assigned/);
  assert.equal(employee.executive.metrics[0][1], 1);
  assert.equal(employee.finance.rows.length, 0);
  assert.equal(employee.finance.metrics[0][1], '₹0');
  assert.equal(employee.clients.rows.length, 0);
  assert.equal(employee.projects.columns.some(([key]) => key === 'budget'), false);
  assert.equal(employee.projects.rows[0].budget, undefined);
  assert.match(employee.projects.subtitle, /Assigned project/i);
});

test('report click actions own filter refresh and export delivery', () => {
  const state = { reportType: 'executive', reportFrom: '', reportTo: '' };
  const values = { 'report-type': 'projects', 'report-from': '2026-09-01', 'report-to': '2026-09-30' };
  const downloads = [];
  let renders = 0;
  let bindings = 0;
  const runtime = createReportExportRuntime({
    state,
    currentReport: () => ({ columns: [['name', 'Name']], rows: [{ name: 'Delivery' }] }),
    financeSheetRows: () => [], invoiceTotal: () => 0, invoicePaidAmount: () => 0,
    isSettledFinance: () => false, invoiceEffectiveStatus: () => '', compactMoney: String,
    resolveProofUrl: async (value) => value, escapeHtml: (value) => String(value),
    downloadCsv: (...args) => downloads.push(args), setPopupDocument() {}, toast() {},
    renderReports: () => { renders += 1; }, bindActions: () => { bindings += 1; },
    documentRef: { getElementById(id) { return { value: values[id] }; } },
  });
  const action = (selector) => ({ matches(candidate) { return candidate.split(',').some((value) => value.trim() === selector); } });

  assert.equal(runtime.handleClick(action('[data-report-refresh]')), true);
  assert.deepEqual([state.reportType, state.reportFrom, state.reportTo, renders, bindings], ['projects', '2026-09-01', '2026-09-30', 1, 1]);
  assert.equal(runtime.handleClick(action('[data-report-export]')), true);
  assert.deepEqual(downloads, [['Name\n"Delivery"', 'techmigos-projects-report-2026-09-01-to-2026-09-30.csv']]);
  assert.equal(runtime.handleClick(action('[data-unrelated-action]')), false);
  const field = (selector, value) => ({ value, matches: (candidate) => candidate === selector });
  assert.equal(runtime.handleChange(field('#report-type', 'finance')), true);
  assert.equal(runtime.handleChange(field('#report-from', '2026-09-15')), true);
  assert.equal(runtime.handleChange(field('#report-to', '2026-09-19')), true);
  assert.deepEqual([state.reportType, state.reportFrom, state.reportTo, renders], ['finance', '2026-09-15', '2026-09-19', 2]);
  assert.equal(runtime.handleChange(field('#unknown-report-field', 'ignored')), false);
});

test('invoice-builder click actions stay scoped to the builder and delegate to its runtime', async () => {
  const calls = [];
  let filePickerClicks = 0;
  let rowRemoved = false;
  const row = { remove() { rowRemoved = true; } };
  const actions = Object.fromEntries([
    'saveBuilderSettings', 'saveInvoice', 'clearSignature', 'saveDrawnSignature',
    'addItemRow', 'updatePreview', 'deleteLocalAsset',
  ].map((name) => [name, async (value) => calls.push([name, value])]));
  const element = (selector, { insideForm = true, dataset = {} } = {}) => ({
    dataset,
    matches(candidate) { return candidate.split(',').some((value) => value.trim() === selector); },
    closest(candidate) {
      if (candidate === '#inv-builder-form') return insideForm ? {} : null;
      if (candidate === 'tr') return row;
      return null;
    },
    querySelector() { return { click() { filePickerClicks += 1; } }; },
  });
  const event = (insideLabel = false) => ({ target: { closest(selector) { return insideLabel && selector === 'label, input' ? {} : null; } } });

  assert.equal(await handleInvoiceBuilderClick(element('#inv-save-settings', { insideForm: false }), event(), actions), true);
  assert.equal(await handleInvoiceBuilderClick(element('#inv-save-invoice', { insideForm: false }), event(), actions), true);
  assert.equal(await handleInvoiceBuilderClick(element('.inv-remove-item'), event(), actions), true);
  assert.equal(rowRemoved, true);
  assert.equal(await handleInvoiceBuilderClick(element('[data-delete-invoice-asset]', { dataset: { deleteInvoiceAsset: 'asset-1' } }), event(), actions), true);
  assert.equal(await handleInvoiceBuilderClick(element('.inv-upload-box'), event(true), actions), false);
  assert.equal(await handleInvoiceBuilderClick(element('.inv-upload-box'), event(), actions), true);
  assert.equal(filePickerClicks, 1);
  assert.deepEqual(calls, [
    ['saveBuilderSettings', undefined],
    ['saveInvoice', undefined],
    ['updatePreview', undefined],
    ['deleteLocalAsset', 'asset-1'],
  ]);
});

test('invoice-builder input and change events are scoped and owned by the builder runtime', async () => {
  const calls = [];
  const actions = {
    updatePreview: () => calls.push(['preview']),
    handleFileInput: async (input) => calls.push(['file', input.id]),
    selectProject: async (value) => calls.push(['project', value]),
    applyClientDetails: async (value) => calls.push(['client', value]),
  };
  const field = (selector, { insideForm = true, id = '', value = '' } = {}) => ({
    id,
    value,
    matches(candidate) { return candidate.split(',').map((part) => part.trim()).includes(selector); },
    closest(candidate) { return candidate === '#inv-builder-form' && insideForm ? {} : null; },
  });

  assert.equal(handleInvoiceBuilderInput(field('input', { insideForm: false }), actions), false);
  assert.equal(handleInvoiceBuilderInput(field('input'), actions), true);
  assert.equal(await handleInvoiceBuilderChange(field('input', { insideForm: false }), actions), false);
  assert.equal(await handleInvoiceBuilderChange(field('input[type="file"]', { id: 'inv-logo-file' }), actions), true);
  assert.equal(await handleInvoiceBuilderChange(field('select', { id: 'inv-project-select', value: 'project-7' }), actions), true);
  assert.equal(await handleInvoiceBuilderChange(field('select', { id: 'inv-client-select', value: 'client-3' }), actions), true);
  assert.equal(await handleInvoiceBuilderChange(field('input'), actions), true);
  assert.deepEqual(calls, [
    ['preview'], ['file', 'inv-logo-file'], ['project', 'project-7'], ['client', 'client-3'], ['preview'],
  ]);
});

test('support click actions open ticket details without stealing nested row actions', () => {
  const state = { ticketView: 'list', selectedTicketId: null, data: { tickets: [{ id: 9, subject: 'Delivery issue' }] } };
  const writes = [];
  const classes = [];
  let rerenders = 0;
  const runtime = createSupportRuntime({
    state,
    els: { modalTitle: { textContent: '' }, modalBody: {}, modal: { classList: { add: (value) => classes.push(value) } } },
    renderTicketDetail: (ticket) => `<p>${ticket.subject}</p>`,
    replaceSafeMarkup: (target, markup) => writes.push([target, markup]),
    renderTickets: () => { rerenders += 1; },
  });
  const action = (selector, dataset = {}, id = '') => ({
    dataset,
    id,
    matches(candidate) { return candidate.split(',').some((value) => value.trim() === selector); },
  });
  const event = (nested = false) => ({
    stopped: false,
    stopPropagation() { this.stopped = true; },
    target: { closest(selector) { return nested && selector.includes('[data-edit-resource]') ? {} : null; } },
  });

  const nestedAction = event(true);
  assert.equal(runtime.handleClick(action('[data-ticket-detail]', { ticketDetail: '9' }), nestedAction), true);
  assert.equal(nestedAction.stopped, true);
  assert.equal(state.selectedTicketId, null);
  const ticketClick = event();
  assert.equal(runtime.handleClick(action('[data-ticket-detail]', { ticketDetail: '9' }), ticketClick), true);
  assert.deepEqual([state.selectedTicketId, writes[0][1], classes], [9, '<div class="ticket-reference-drawer-content"><p>Delivery issue</p></div>', ['open']]);
  assert.equal(runtime.handleClick(action('#tic-view-board', {}, 'tic-view-board'), event()), true);
  assert.deepEqual([state.ticketView, rerenders], ['board', 1]);
  const field = (selector, value) => ({ value, matches: (candidate) => candidate === selector });
  assert.equal(runtime.handleInput(field('#tic-search', 'invoice')), true);
  assert.equal(runtime.handleChange(field('#tic-status-filter', 'waiting')), true);
  assert.equal(runtime.handleChange(field('#tic-priority-filter', 'high')), true);
  assert.deepEqual([state.ticketSearch, state.ticketStatusFilter, state.ticketPriorityFilter, rerenders], ['invoice', 'waiting', 'high', 4]);
  assert.equal(runtime.handleClick(action('[data-unrelated-action]'), event()), false);
  assert.equal(runtime.handleChange(field('#unrelated-filter', 'ignored')), false);
});

test('Finance renderer receives the DOM context it uses to render the workspace', () => {
  const financeFeaturePath = fileURLToPath(new URL('../src/lib/crm/features/finance.js', import.meta.url));
  const controllerPath = fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url));
  const financeFeature = readFileSync(financeFeaturePath, 'utf8');
  const controller = readFileSync(controllerPath, 'utf8');
  assert.match(financeFeature, /export function renderFinance\(context\)/);
  assert.match(financeFeature, /const \{[^}]*\bels\b[^}]*\} = context;/s);
  assert.match(controller, /renderFinanceFeature\(\{\s*state,\s*els,/);
});

test('invoice settings store shared configuration, never restore another invoice draft', () => {
  const builderPath = fileURLToPath(new URL('../src/lib/crm/features/invoiceBuilderRuntime.js', import.meta.url));
  const builder = readFileSync(builderPath, 'utf8');
  const loaderStart = builder.indexOf('async function loadBuilderSettings()');
  const loaderEnd = builder.indexOf('async function loadInvoiceData', loaderStart);
  const saveStart = builder.indexOf('async function saveBuilderSettings()');
  const saveEnd = builder.indexOf('// Save invoice to Supabase', saveStart);
  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart);
  const loader = builder.slice(loaderStart, loaderEnd);
  const save = builder.slice(saveStart, saveEnd);
  assert.match(loader, /state\.invoiceSettings/);
  assert.doesNotMatch(loader, /inv-client-|inv-number|inv-date|inv-due-date|inv-status|inv-received|items\s*\)/);
  assert.match(save, /default_payment_instructions/);
  assert.match(save, /default_terms/);
  assert.match(save, /tax_rate/);
  assert.doesNotMatch(save, /clientName:|clientEmail:|invoiceNumber:|invoiceDate:|dueDate:|received:|\bitems\b/);
});

test('active CRM shell has one delegated action boundary and no retired renderer paths', () => {
  const layoutPath = fileURLToPath(new URL('../src/layouts/CrmLayout.astro', import.meta.url));
  const controllerPath = fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url));
  const analyticsPath = fileURLToPath(new URL('../src/lib/crm/features/analytics.js', import.meta.url));
  const reportsPath = fileURLToPath(new URL('../src/lib/crm/features/reports.js', import.meta.url));
  const reportDataPath = fileURLToPath(new URL('../src/lib/crm/features/reportData.js', import.meta.url));
  const usersPath = fileURLToPath(new URL('../src/lib/crm/features/users.js', import.meta.url));
  const projectsPath = fileURLToPath(new URL('../src/lib/crm/features/projects.js', import.meta.url));
  const supportPath = fileURLToPath(new URL('../src/lib/crm/features/support.js', import.meta.url));
  const filesRendererPath = fileURLToPath(new URL('../src/lib/crm/features/files.js', import.meta.url));
  const filesRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/filesRuntime.js', import.meta.url));
  const settingsRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/settingsRuntime.js', import.meta.url));
  const financeProofRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/financeProofRuntime.js', import.meta.url));
  const reportExportRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/reportExportRuntime.js', import.meta.url));
  const workspaceContextPath = fileURLToPath(new URL('../src/lib/crm/features/workspaceContext.js', import.meta.url));
  const invoicePreviewRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/invoicePreviewRuntime.js', import.meta.url));
  const financeLedgerRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/financeLedgerRuntime.js', import.meta.url));
  const financeRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/financeRuntime.js', import.meta.url));
  const financeActionsRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/financeActionsRuntime.js', import.meta.url));
  const projectActionsRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/projectActionsRuntime.js', import.meta.url));
  const peopleFeaturesPath = fileURLToPath(new URL('../src/lib/crm/features/people.js', import.meta.url));
  const delegatedEventsPath = fileURLToPath(new URL('../src/lib/crm/features/delegatedEvents.js', import.meta.url));
  const formEventsPath = fileURLToPath(new URL('../src/lib/crm/features/formEvents.js', import.meta.url));
  const financeFeaturePath = fileURLToPath(new URL('../src/lib/crm/features/finance.js', import.meta.url));
  const financeDomainPath = fileURLToPath(new URL('../src/lib/crm/finance.js', import.meta.url));
  const layout = readFileSync(layoutPath, 'utf8');
  const controller = readFileSync(controllerPath, 'utf8');
  const analytics = readFileSync(analyticsPath, 'utf8');
  const reports = readFileSync(reportsPath, 'utf8');
  const reportData = readFileSync(reportDataPath, 'utf8');
  const users = readFileSync(usersPath, 'utf8');
  const projects = readFileSync(projectsPath, 'utf8');
  const support = readFileSync(supportPath, 'utf8');
  const filesRenderer = readFileSync(filesRendererPath, 'utf8');
  const filesRuntime = readFileSync(filesRuntimePath, 'utf8');
  const settingsRuntime = readFileSync(settingsRuntimePath, 'utf8');
  const financeProofRuntime = readFileSync(financeProofRuntimePath, 'utf8');
  const reportExportRuntime = readFileSync(reportExportRuntimePath, 'utf8');
  const workspaceContext = readFileSync(workspaceContextPath, 'utf8');
  const invoicePreviewRuntime = readFileSync(invoicePreviewRuntimePath, 'utf8');
  const financeLedgerRuntime = readFileSync(financeLedgerRuntimePath, 'utf8');
  const financeRuntime = readFileSync(financeRuntimePath, 'utf8');
  const financeActionsRuntime = readFileSync(financeActionsRuntimePath, 'utf8');
  const projectActionsRuntime = readFileSync(projectActionsRuntimePath, 'utf8');
  const peopleFeatures = readFileSync(peopleFeaturesPath, 'utf8');
  const delegatedEvents = readFileSync(delegatedEventsPath, 'utf8');
  const formEvents = readFileSync(formEventsPath, 'utf8');
  const financeFeature = readFileSync(financeFeaturePath, 'utf8');
  const financeDomain = readFileSync(financeDomainPath, 'utf8');
  const implementation = `${layout}\n${controller}\n${filesRuntime}\n${settingsRuntime}\n${financeProofRuntime}\n${reportExportRuntime}\n${workspaceContext}\n${invoicePreviewRuntime}\n${financeLedgerRuntime}\n${financeActionsRuntime}\n${projectActionsRuntime}\n${peopleFeatures}\n${delegatedEvents}\n${formEvents}\n${financeFeature}`;
  for (const retiredRenderer of ['renderDashboardReferenceDemo', 'renderProjectsLegacy', 'renderTicketsLegacy', 'renderUsersLegacy', 'renderFilesLegacy', 'renderProjectReference', 'renderFilesReferenceV2', 'renderProjectReferenceV2']) {
    assert.doesNotMatch(implementation, new RegExp(`function ${retiredRenderer}\\b`));
  }
  assert.ok(layout.split('\n').length < 100, 'CrmLayout.astro should remain a thin shell');
  assert.match(layout, /crm-workspace\.js/);
  assert.match(controller, /function bindCrmDelegatedActions\(\)/);
  assert.doesNotMatch(controller, /\bwireKanbanDnd\b/);
  assert.doesNotMatch(support, /\bwireKanbanDnd\b|draggable="true"/);
  assert.match(controller, /createCrmDelegatedEvents/);
  assert.match(controller, /delegatedEvents\.on\('click'/);
  assert.match(controller, /delegatedEvents\.on\('keydown'/);
  assert.doesNotMatch(controller, /crmRoot\.addEventListener\(/);
  assert.match(delegatedEvents, /export const CRM_ACTION_SELECTOR/);
  assert.match(delegatedEvents, /closestAction\(event\)/);
  assert.match(controller, /createCrmFormEvents/);
  assert.match(formEvents, /data-ticket-message-form/);
  assert.match(formEvents, /project-members-form/);
  assert.doesNotMatch(controller, /delegatedEvents\.on\('submit'/);
  assert.match(delegatedEvents, /#inv-save-settings[\s\S]*#inv-save-invoice/);
  assert.match(financeActionsRuntime, /#finance-filter-reset/);
  assert.match(financeActionsRuntime, /\.acc-proof-btn\[data-proof\]/);
  assert.match(controller, /createFinanceActionsRuntime/);
  assert.match(controller, /selectFinanceSheetRows\(/);
  assert.match(financeDomain, /export function selectFinanceSheetRows\(/);
  assert.doesNotMatch(controller, /function financeSheetRows\(\)\s*\{[^}]*\.filter\(/);
  assert.match(controller, /createProjectActionsRuntime/);
  assert.match(projectActionsRuntime, /querySelectorAll\('\[data-project-menu-panel\]'\)/);
  assert.match(controller, /peopleActions\.handleClick\(element, event\)/);
  assert.match(peopleFeatures, /createPeopleSelectionActions/);
  assert.match(delegatedEvents, /#project-members-manage/);
  assert.match(filesRuntime, /data-project-members-manage/);
  assert.match(controller, /\[data-ticket-detail\]/);
  assert.match(controller, /event\.key === 'Tab'/);
  assert.match(controller, /event\.key === 'Escape'/);
  assert.match(filesRuntime, /id="project-folder-form"/);
  assert.match(controller, /createFilesRuntime/);
  assert.match(filesRuntime, /uploadProjectFiles/);
  assert.match(filesRuntime, /openProjectMembers/);
  assert.doesNotMatch(filesRenderer, /title="Project actions"/);
  assert.match(projects, /data-project-menu-trigger/);
  assert.match(controller, /createSettingsRuntime/);
  assert.match(settingsRuntime, /saveSettingsSection/);
  assert.match(settingsRuntime, /state\[category\] = \{ \.\.\.result\.settings \}/);
  assert.match(controller, /createFinanceProofRuntime/);
  assert.match(financeProofRuntime, /getFinanceProofUrl/);
  assert.match(financeProofRuntime, /handleFinanceProofUpload/);
  assert.match(controller, /createReportExportRuntime/);
  assert.match(reportExportRuntime, /printCurrentReport/);
  assert.match(reportExportRuntime, /downloadCurrentReportPdf/);
  assert.doesNotMatch(controller, /window\.prompt\(/);
  assert.doesNotMatch(implementation, /els\.search\.addEventListener\('input'/);
  assert.doesNotMatch(implementation, /document\.addEventListener\('keydown'/);
  assert.doesNotMatch(implementation, /onmouseover=|onmouseout=/);
  assert.match(workspaceContext, /companyRouteEntries\(state\.profile\?\.role\)/);
  assert.match(controller, /createWorkspaceContext/);
  assert.match(controller, /createInvoicePreviewRuntime/);
  assert.match(invoicePreviewRuntime, /replaceSafeMarkup/);
  assert.match(controller, /createFinanceLedgerRuntime/);
  assert.match(financeLedgerRuntime, /saveInlineFinanceRow/);
  assert.match(financeLedgerRuntime, /validateLedgerRow/);
  assert.doesNotMatch(controller, /renderShell/);
  assert.doesNotMatch(implementation, /bindInlineFinanceAutosave/);
  assert.doesNotMatch(financeRuntime, /bindInlineFinanceAutosave/);
  assert.match(controller, /renderProjectDetail/);
  assert.match(controller, /renderTicketDetail/);
  assert.match(projects, /isEmployee\(\) \? '' :/);
  assert.match(controller, /renderProjectsFeature\(\{[\s\S]*els,[\s\S]*isEmployee,/);
  assert.doesNotMatch(implementation, /hideForNonAdmin|hideForEmployee/);
  assert.doesNotMatch(implementation, /data-acc-tab\]\)\.forEach\(.*addEventListener/s);
  assert.doesNotMatch(implementation, /Wire report controls/);
  assert.doesNotMatch(implementation, /getElementById\('users-search'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /getElementById\('clients-search'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /getElementById\('employees-search'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-client-detail\]'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-employee-detail\]'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelector\('#crm-data-review-form'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /getElementById\('crm-edit-form'\)\?\.addEventListener/);
  assert.doesNotMatch(implementation, /data-project-status-tab\]\)\.forEach\(.*addEventListener/s);
  assert.doesNotMatch(implementation, /data-ticket-detail\]\[data-resource="tickets"\]\)\.forEach\(.*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-project-file-upload\]'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-project-files-select\]'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-project-file-download\]'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /(?:button|input|roleSelect|clientSelect|document)\.addEventListener\(/);
  assert.doesNotMatch(implementation, /setupFileInput\(/);
  assert.doesNotMatch(implementation, /querySelectorAll\('\.inv-upload-box'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /getElementById\('inv-add-item'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /getElementById\('inv-save-invoice'\).*addEventListener/s);
  assert.doesNotMatch(implementation, /function bindInvoiceFormEvents\b/);
  assert.doesNotMatch(implementation, /querySelectorAll\('\[data-proof-upload\]'\).*addEventListener/s);
  for (const activeHelper of ['projectDetail', 'ticketKanbanCard', 'renderTicketKanban', 'renderTicketTable', 'ticketDetail']) {
    assert.doesNotMatch(implementation, new RegExp(`function ${activeHelper}\\b`));
  }
  assert.match(projects, /export function renderProjectDetail\(project, context\)/);
  assert.match(support, /export function renderTicketDetail\(ticket, context\)/);
  assert.doesNotMatch(implementation, /target === 'users' \? 'user-management'/);
  assert.doesNotMatch(implementation, /state\.data\.profiles\.length \? state\.data\.profiles : employeesFromState/);
  assert.match(support, /canUpdate\('tickets'\) \? `<button class="pm-btn-sm"/);
  assert.match(projects, /canUpdate\('projects'\) \? `<button class="crm-button primary"/);
  assert.match(formEvents, /data-ticket-message-form/);
  assert.match(formEvents, /portal\(`\/api\/portal\/tickets\/\$\{encodeURIComponent\(ticketId\)\}\/messages`/);
  assert.match(analytics, /employeeWorkspace \? \[\] : incomeRows\(\)/);
  assert.match(controller, /renderAnalyticsFeature\(/);
  assert.match(controller, /renderReportsFeature\(/);
  assert.match(controller, /function reportTypesForRole\(\)/);
  assert.match(controller, /types\.filter\(\(\[key\]\) => \['executive', 'projects', 'tickets'\]\.includes\(key\)\)/);
  assert.match(reports, /export function renderReports\(context\)/);
  assert.match(controller, /import \{ buildReportDefinitions \} from ['"].*\/features\/reportData\.js['"]/);
  assert.match(reportData, /export function buildReportDefinitions\(\{/);
  assert.match(reportData, /employeeWorkspace \?/);
  assert.match(users, /nice, renderEmployees, renderClients \} = context/);
  assert.match(users, /metric, badge, crmProjectIcon/);
  assert.match(controller, /renderUsersFeature\(\{[\s\S]*?metric,[\s\S]*?badge,[\s\S]*?crmProjectIcon/);
  assert.match(controller, /renderUsersFeature\(\{[\s\S]*renderEmployees,[\s\S]*renderClients,/);
});

test('CRM delegated events scope actions to the workspace root and support disposal', () => {
  const listeners = new Map();
  const root = {
    addEventListener(type, listener, options) { listeners.set(type, { listener, options }); },
    removeEventListener(type, listener) {
      if (listeners.get(type)?.listener === listener) listeners.delete(type);
    },
  };
  const inside = {
    closest(selector) {
      if (selector === '.crm-app') return root;
      if (selector === CRM_ACTION_SELECTOR) return inside;
      return null;
    },
  };
  const outside = { closest: () => outside };
  const events = createCrmDelegatedEvents(root);
  const dispose = events.on('click', () => {});
  assert.equal(events.closestAction({ target: inside }), inside);
  assert.equal(events.closestAction({ target: outside }), null);
  assert.equal(listeners.size, 1);
  dispose();
  assert.equal(listeners.size, 0);
});

test('notification actions follow the canonical role route policy', () => {
  const controllerPath = fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url));
  const workflowPath = fileURLToPath(new URL('../src/lib/crm/features/operationsWorkflow.js', import.meta.url));
  const overlaysPath = fileURLToPath(new URL('../src/lib/crm/features/operationsOverlays.js', import.meta.url));
  const recordActionsPath = fileURLToPath(new URL('../src/lib/crm/features/recordActions.js', import.meta.url));
  const controller = readFileSync(controllerPath, 'utf8');
  const workflow = readFileSync(workflowPath, 'utf8');
  const overlays = readFileSync(overlaysPath, 'utf8');
  const recordActions = readFileSync(recordActionsPath, 'utf8');
  assert.match(overlays, /const financeButton = canAccessCrmRoute\(state\.profile\?\.role, 'finance'\)/);
  assert.match(overlays, /data-jump="tickets"[\s\S]*\$\{financeButton\}/);
  assert.match(workflow, /if \(!canWrite\(actualResource\)\) return toast/);
  assert.match(workflow, /if \(!canUpdate\(resource\)\) return toast/);
  assert.match(recordActions, /if \(!canDelete\(resource\)\) return toast/);
  assert.match(recordActions, /if \(!canUpdate\(button\.dataset\.quickPatch\)\) return toast/);
  assert.match(controller, /import \{ createRecordActions \} from ['"].*\/features\/recordActions\.js['"]/);
});

test('CRM icons use one shared registry across Astro and browser renderers', () => {
  const iconPath = fileURLToPath(new URL('../src/components/crm/Icon.astro', import.meta.url));
  const registryPath = fileURLToPath(new URL('../src/lib/crm/icons.js', import.meta.url));
  const layoutPath = fileURLToPath(new URL('../src/layouts/CrmLayout.astro', import.meta.url));
  const controllerPath = fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url));
  const icon = readFileSync(iconPath, 'utf8');
  const registry = readFileSync(registryPath, 'utf8');
  const layout = readFileSync(layoutPath, 'utf8');
  const controller = readFileSync(controllerPath, 'utf8');
  assert.match(icon, /import \{ crmIconPath \} from ['\"].*\/lib\/crm\/icons\.js['\"]/);
  assert.match(registry, /export const CRM_ICON_PATHS/);
  assert.match(registry, /export function crmIconMarkup/);
  assert.match(controller, /import \{ crmIconMarkup \} from ['\"].*\/lib\/crm\/icons\.js['\"]/);
  assert.doesNotMatch(layout, /const icons = \{/);
});

test('active runtime does not expose retired backend or CSRF stubs', () => {
  const runtimePath = fileURLToPath(new URL('../src/scripts/crm-runtime.js', import.meta.url));
  const runtime = readFileSync(runtimePath, 'utf8');
  for (const retiredGlobal of ['TechMigosConfig', 'techmigosApiUrl', 'techmigosApiFetch', 'techmigosGetCsrfToken']) {
    assert.doesNotMatch(runtime, new RegExp(`window\\.${retiredGlobal}`));
  }
  assert.match(runtime, /createCrmRepository/);
  assert.match(runtime, /window\.tmSupabase/);
});

test('live role provisioning uses Supabase Auth and PostgREST directly', () => {
  const scriptPath = fileURLToPath(new URL('../scripts/provision-portal-user.mjs', import.meta.url));
  const liveSetupPath = fileURLToPath(new URL('../scripts/prepare-live-identities.mjs', import.meta.url));
  const envScriptPath = fileURLToPath(new URL('../scripts/local-env.mjs', import.meta.url));
  const script = readFileSync(scriptPath, 'utf8');
  const liveSetup = readFileSync(liveSetupPath, 'utf8');
  const envScript = readFileSync(envScriptPath, 'utf8');
  assert.match(script, /\/auth\/v1\/admin/);
  assert.match(script, /\/rest\/v1\/\$\{table\}/);
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(script, /\/api\/database\/records|\/api\/auth\/users/);
  assert.match(liveSetup, /functions\/v1\/admin-users/);
  assert.match(liveSetup, /change_initial_password/);
  assert.match(liveSetup, /CRM_EMPLOYEE_PASSWORD/);
  assert.doesNotMatch(liveSetup, /console\.log\([^)]*password/i);
  assert.match(envScript, /readDotEnv\('\.env\.local'\)/);
});

test('public auth and CRM pages load only the runtime boundary they require', () => {
  const baseLayoutPath = fileURLToPath(new URL('../src/layouts/BaseLayout.astro', import.meta.url));
  const clientPath = fileURLToPath(new URL('../src/pages/client.astro', import.meta.url));
  const authRuntimePath = fileURLToPath(new URL('../src/scripts/auth-runtime.js', import.meta.url));
  const crmRuntimePath = fileURLToPath(new URL('../src/scripts/crm-runtime.js', import.meta.url));
  const baseLayout = readFileSync(baseLayoutPath, 'utf8');
  const client = readFileSync(clientPath, 'utf8');
  const authRuntime = readFileSync(authRuntimePath, 'utf8');
  const crmRuntime = readFileSync(crmRuntimePath, 'utf8');
  assert.match(baseLayout, /requiresCrmRuntime \? \(/);
  assert.match(baseLayout, /import ['\"]\.\.\/scripts\/auth-runtime\.js['\"]/);
  assert.match(baseLayout, /import ['\"]\.\.\/scripts\/crm-runtime\.js['\"]/);
  assert.match(client, /requiresCrmRuntime=\{true\}/);
  assert.doesNotMatch(authRuntime, /chart\.js|createCrmRepository/);
  assert.match(crmRuntime, /createCrmRepository/);
  assert.match(crmRuntime, /from ['\"]chart\.js\/auto['\"]/);
});

test('password recovery supports both initial credentials and standard Auth recovery sessions', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/pages/change-password.astro', import.meta.url)), 'utf8');
  const resetSource = readFileSync(fileURLToPath(new URL('../src/pages/reset-password.astro', import.meta.url)), 'utf8');
  assert.match(source, /profile\.must_change_password/);
  assert.match(source, /\['active', 'pending'\]\.includes\(profile\.status\)/);
  assert.match(source, /operation: 'change_initial_password'/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
  assert.match(resetSource, /resetPasswordForEmail/);
  assert.match(resetSource, /change-password/);
});

test('client portal keeps rendered records and actions behind one delegated boundary', () => {
  const clientPath = fileURLToPath(new URL('../src/pages/client.astro', import.meta.url));
  const controllerPath = fileURLToPath(new URL('../src/scripts/client-portal.js', import.meta.url));
  const client = readFileSync(clientPath, 'utf8');
  const controller = readFileSync(controllerPath, 'utf8');
  assert.match(client, /id="client-portal-root"/);
  assert.match(client, /client-portal\.js/);
  assert.match(controller, /clientRoot\?\.addEventListener\('click'/);
  assert.match(controller, /clientRoot\?\.addEventListener\('submit'/);
  assert.doesNotMatch(controller, /querySelectorAll\('\[data-invoice\]'\).*addEventListener/s);
  assert.doesNotMatch(controller, /querySelectorAll\('\[data-ticket\]'\).*addEventListener/s);
  assert.doesNotMatch(controller, /ticketForm\?\.addEventListener\('submit'/);
  assert.doesNotMatch(controller, /messageForm\?\.addEventListener\('submit'/);
  assert.match(controller, /renderInvoiceHtml/);
  assert.match(controller, /kpisEl\.replaceChildren/);
  assert.match(controller, /projectsEl\.replaceChildren/);
  assert.match(controller, /conversationMessages\.replaceChildren/);
  assert.doesNotMatch(controller, /function invoiceHtml\b/);
});

test('shared markup insertion sanitizes scripts, handlers, and unsafe URLs', () => {
  const safeMarkupPath = fileURLToPath(new URL('../src/lib/crm/safeMarkup.js', import.meta.url));
  const safeMarkup = readFileSync(safeMarkupPath, 'utf8');
  const clientControllerPath = fileURLToPath(new URL('../src/scripts/client-portal.js', import.meta.url));
  const invoicePreviewRuntimePath = fileURLToPath(new URL('../src/lib/crm/features/invoicePreviewRuntime.js', import.meta.url));
  const clientController = readFileSync(clientControllerPath, 'utf8');
  const invoicePreviewRuntime = readFileSync(invoicePreviewRuntimePath, 'utf8');
  assert.match(safeMarkup, /DROP_TAGS/);
  assert.match(safeMarkup, /name\.startsWith\('on'\)/);
  assert.match(safeMarkup, /URL_ATTRIBUTES/);
  assert.match(safeMarkup, /'mailto:', 'tel:', 'upi:'/);
  assert.match(safeMarkup, /target\.replaceChildren/);
  assert.match(invoicePreviewRuntime, /replaceSafeMarkup\(els\.invoicePreview/);
  assert.match(clientController, /replaceSafeMarkup\(invoicePreview/);
});

test('feature renderers use the shared markup boundary for browser fragments', () => {
  const featureFiles = [
    'reports.js',
    'users.js',
    'files.js',
    'filesRuntime.js',
    'support.js',
    'financeProofRuntime.js',
    'people.js',
    'projects.js',
    'dashboard.js',
    'settings.js',
    'financeRuntime.js',
    'finance.js',
  ];
  featureFiles.forEach((file) => {
    const source = readFileSync(fileURLToPath(new URL(`../src/lib/crm/features/${file}`, import.meta.url)), 'utf8');
    assert.match(source, /replaceSafeMarkup/);
    assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML/);
  });
});

test('company and client portals share an escaped invoice renderer', () => {
  const html = renderInvoiceHtml({
    invoice: {
      id: 12,
      invoice_number: 'INV-12',
      currency: 'INR',
      customer_name: '<script>alert(1)</script>',
      total_amount: 100,
      received_amount: 50,
      status: 'sent',
      invoice_branding: { logo_url: 'javascript:alert(1)', signature_url: 'data:text/html,<script>alert(2)</script>' },
    },
    items: [],
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /javascript:alert|data:text\/html/);
  assert.match(html, /src="\/icon\.png"/);
  assert.match(html, /Payment details are not configured/);
  assert.match(html, /Balance Amount: ₹ 50/);
  assert.match(html, /No line items/);
});

test('invoice payment actions require configured live settings', () => {
  const clientPath = fileURLToPath(new URL('../src/pages/client.astro', import.meta.url));
  const clientControllerPath = fileURLToPath(new URL('../src/scripts/client-portal.js', import.meta.url));
  const invoiceRendererPath = fileURLToPath(new URL('../src/lib/crm/invoiceHtml.js', import.meta.url));
  const layoutPath = fileURLToPath(new URL('../src/layouts/CrmLayout.astro', import.meta.url));
  const controllerPath = fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url));
  const client = readFileSync(clientPath, 'utf8');
  const clientController = readFileSync(clientControllerPath, 'utf8');
  const invoiceRenderer = readFileSync(invoiceRendererPath, 'utf8');
  const layout = readFileSync(layoutPath, 'utf8');
  const controller = readFileSync(controllerPath, 'utf8');
  const implementation = `${layout}\n${controller}\n${clientController}\n${invoiceRenderer}`;
  assert.doesNotMatch(client, /v5219@slc/);
  assert.doesNotMatch(layout, /v5219@slc/);
  assert.match(clientController, /renderInvoiceHtml/);
  assert.match(invoiceRenderer, /Payment details are not configured/);
  assert.match(implementation, /Payment details are not configured/);
});

test('admin user edge function uses an explicit CORS allowlist', () => {
  const functionPath = fileURLToPath(new URL('../supabase/functions/admin-users/index.ts', import.meta.url));
  const source = readFileSync(functionPath, 'utf8');
  assert.match(source, /ALLOWED_ORIGINS/);
  assert.match(source, /Vary: 'Origin'/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin': '\*'/);
});

test('invited users can complete the pending-to-active password workflow', () => {
  const functionPath = fileURLToPath(new URL('../supabase/functions/admin-users/index.ts', import.meta.url));
  const source = readFileSync(functionPath, 'utf8');
  assert.match(source, /must_change_password: true/);
  assert.match(source, /const status = 'pending'/);
  assert.match(source, /redirectTo: `\$\{siteUrl\}\/change-password`/);
  assert.match(source, /\['active', 'pending'\]\.includes\(profile\.status\)/);
  assert.match(source, /status: profile\.status === 'pending' \? 'active' : profile\.status/);
});

test('profile lifecycle keeps deletion out of the RLS contract and resolves canonical usernames', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917130000_profile_deactivation_and_username_login.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /drop policy if exists "CRM admins can delete profiles"/i);
  assert.match(migration, /lower\(trim\(username\)\) = lower\(trim\(p_username\)\)/);
  const authMigration = readFileSync(fileURLToPath(new URL('../supabase/migrations/20260919120000_secure_anonymous_username_resolution.sql', import.meta.url)), 'utf8');
  assert.match(authMigration, /revoke all on function public\.get_email_by_username\(text\) from anon/i);
  assert.match(authMigration, /revoke all on function public\.get_email_by_username\(text\) from authenticated/i);
  assert.match(authMigration, /grant execute on function public\.get_email_by_username\(text\) to service_role/i);
});

test('username login resolves credentials server-side and returns only the authenticated session', () => {
  const login = readFileSync(fileURLToPath(new URL('../src/pages/login.astro', import.meta.url)), 'utf8');
  const edgeFunction = readFileSync(fileURLToPath(new URL('../supabase/functions/username-login/index.ts', import.meta.url)), 'utf8');
  const config = readFileSync(fileURLToPath(new URL('../supabase/config.toml', import.meta.url)), 'utf8');
  assert.match(login, /functions\.invoke\('username-login'/);
  assert.match(login, /auth\.setSession\(loginResult\.session\)/);
  assert.doesNotMatch(login, /rpc\('get_email_by_username'/);
  assert.match(edgeFunction, /serviceClient\.rpc\('get_email_by_username'/);
  assert.match(edgeFunction, /authClient\.auth\.signInWithPassword/);
  assert.match(edgeFunction, /return json\(request, \{ session \}\)/);
  assert.doesNotMatch(edgeFunction, /return json\(request, \{\s*email\s*[,}]/);
  assert.match(config, /\[functions\.username-login\][\s\S]*?verify_jwt = false/);
});

test('confirmed cleanup audit records the selected record identities', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260918110000_audit_cleanup_selected_records.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /'records',\s*coalesce\(p_records,\s*'\[\]'::jsonb\)/);
  assert.match(migration, /'reason',\s*left\(trim\(p_reason\),\s*500\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /grant execute on function public\.purge_confirmed_crm_records/);
});

test('live identity cleanup is namespace-scoped, dry-run by default, and deactivates accounts', () => {
  const cleanupPath = fileURLToPath(new URL('../scripts/cleanup-live-identities.mjs', import.meta.url));
  const preparePath = fileURLToPath(new URL('../scripts/prepare-live-identities.mjs', import.meta.url));
  const cleanup = readFileSync(cleanupPath, 'utf8');
  const prepare = readFileSync(preparePath, 'utf8');

  assert.match(cleanup, /\^codex-\[a-z0-9-\]\{1,80\}\$/);
  assert.match(cleanup, /option\('confirm'\) !== 'DELETE'/);
  assert.match(cleanup, /for \(const table of \['crm_projects', 'crm_invoices'\]\)/);
  assert.match(cleanup, /crm_tickets\?client_id=eq\./);
  assert.match(cleanup, /operation: 'update_profile',[\s\S]*?status: 'inactive'/);
  assert.match(cleanup, /client_id: profile\.client_id \?\? null/);
  assert.match(cleanup, /body: JSON\.stringify\(\{ status: 'inactive' \}\)/);
  assert.match(cleanup, /if \(client && !clientProfile\)/);
  assert.match(cleanup, /startsWith\('Codex support lifecycle '\)/);
  assert.match(cleanup, /resource: 'tickets'/);
  assert.match(cleanup, /rpc\/purge_confirmed_crm_records/);
  assert.doesNotMatch(cleanup, /deleteUser|delete from public\.crm_profiles/i);
  assert.match(prepare, /export CRM_LIVE_NAMESPACE=/);
});

test('invoice ledger upsert predicate matches its partial unique index', () => {
  const indexMigrationPath = fileURLToPath(new URL('../supabase/migrations/20260906130000_sync_invoice_income_ledger.sql', import.meta.url));
  const fixMigrationPath = fileURLToPath(new URL('../supabase/migrations/20260919140000_fix_invoice_ledger_conflict_target.sql', import.meta.url));
  const indexMigration = readFileSync(indexMigrationPath, 'utf8');
  const fixMigration = readFileSync(fixMigrationPath, 'utf8');
  const aclMigrationPath = fileURLToPath(new URL('../supabase/migrations/20260919150000_revoke_anon_invoice_ledger_trigger.sql', import.meta.url));
  const aclMigration = readFileSync(aclMigrationPath, 'utf8');

  assert.match(indexMigration, /create unique index if not exists idx_crm_finances_invoice_ledger_entry[\s\S]*?where invoice_id is not null and transaction_type = 'invoice'/i);
  assert.match(fixMigration, /on conflict\s*\(invoice_id\)\s*where invoice_id is not null and transaction_type = 'invoice'\s+do update/i);
  assert.match(fixMigration, /create or replace function public\.sync_invoice_income_ledger\(\)/i);
  assert.match(fixMigration, /when lower\(coalesce\(new\.status, ''\)\) = 'paid' then 'received'/i);
  assert.match(aclMigration, /revoke all on function public\.sync_invoice_income_ledger\(\) from public, anon/i);
  assert.match(aclMigration, /grant execute on function public\.sync_invoice_income_ledger\(\) to authenticated/i);
});

test('project storage policy constrains object paths and direct-upload size', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917140000_project_file_storage_constraints.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /parts\[2\] !~ '\^\[0-9\]\{1,18\}\$'/);
  assert.match(migration, /parts\[3\] !~ '\^\[A-Za-z0-9\._-\]\{1,255\}\$'/);
  assert.match(migration, /metadata->>'size'/);
  assert.match(migration, /<= 52428800/);
});

test('project storage policy constrains direct-upload MIME types', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917150000_project_file_mime_constraints.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /allowed_mime_types = array\[/);
  assert.match(migration, /mime_type = any/);
  assert.match(migration, /application\/pdf/);
  assert.match(migration, /image\/webp/);
});

test('private finance and invoice storage policies constrain paths, MIME types, and size', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260918130000_private_storage_path_constraints.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /where id = 'finance-proofs'/);
  assert.match(migration, /where id = 'invoice-signatures'/);
  assert.match(migration, /storage\.foldername\(name\)/);
  assert.match(migration, /records/);
  assert.match(migration, /invoice-assets/);
  assert.match(migration, /signatures/);
  assert.match(migration, /10485760/);
  assert.match(migration, /metadata ->> 'mimetype'/);
  assert.match(migration, /to authenticated/);

  const financeReadPath = fileURLToPath(new URL('../supabase/migrations/20260919130000_admin_only_finance_proof_reads.sql', import.meta.url));
  const financeRead = readFileSync(financeReadPath, 'utf8');
  assert.match(financeRead, /drop policy if exists "CRM staff can read finance proofs"/i);
  assert.match(financeRead, /create policy "CRM admins can read finance proofs"/i);
  assert.match(financeRead, /private\.is_company_admin\(\)/);
  assert.doesNotMatch(financeRead, /private\.is_company_staff\(\)/);
});

test('invoice save RPC uses the isolated admin helper and denies anonymous execution', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260919170000_secure_invoice_save_rpc.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create or replace function public\.save_invoice_with_items/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /if not private\.is_company_admin\(\)/i);
  assert.doesNotMatch(migration, /public\.is_company_admin\(\)/i);
  assert.match(migration, /revoke all on function public\.save_invoice_with_items\(jsonb, jsonb\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.save_invoice_with_items\(jsonb, jsonb\) to authenticated/i);
});

test('unused demo utility tables are no longer publicly readable', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260918140000_protect_unused_todos.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /drop policy if exists "Anyone can read todos"/i);
  assert.match(migration, /revoke all on table public\.todos from anon, authenticated/i);
  assert.match(migration, /to authenticated[\s\S]*using \(\(select private\.is_company_admin\(\)\)\)/i);
  assert.doesNotMatch(migration, /using \(true\)/i);
});

test('private resume uploads constrain bucket metadata and anonymous paths', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260918150000_private_resume_storage_constraints.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /where id = 'resumes'/);
  assert.match(migration, /public = false/);
  assert.match(migration, /file_size_limit = 5242880/);
  assert.match(migration, /allowed_mime_types/);
  assert.match(migration, /storage\.foldername\(name\)\)\[2\] ~/);
  assert.match(migration, /storage\.filename\(name\) ~/);
  assert.match(migration, /metadata ->> 'mimetype'/);
  assert.match(migration, /to anon/);
});

test('project Storage enforces MIME and size at the bucket and assignment path boundaries', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260919160000_storage_upload_metadata_rls_alignment.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  const fileRowMigrationPath = fileURLToPath(new URL('../supabase/migrations/20260917150000_project_file_mime_constraints.sql', import.meta.url));
  const fileRowMigration = readFileSync(fileRowMigrationPath, 'utf8');
  assert.match(migration, /where id = 'project-files'/);
  assert.match(migration, /public = false/);
  assert.match(migration, /file_size_limit = 52428800/);
  assert.match(migration, /allowed_mime_types = array\[/);
  assert.match(migration, /create policy "Assigned company users can upload project files"[\s\S]*to authenticated[\s\S]*bucket_id = 'project-files'[\s\S]*private\.can_access_project_object\(name\)/i);
  assert.doesNotMatch(migration, /metadata\s*->>/i);
  assert.match(fileRowMigration, /on public\.crm_project_files[\s\S]*size_bytes between 0 and 52428800/);
  assert.match(fileRowMigration, /mime_type = any/);
});

test('career resume validation matches the private storage MIME contract', () => {
  const pagePath = fileURLToPath(new URL('../src/pages/careers/[slug].astro', import.meta.url));
  const page = readFileSync(pagePath, 'utf8');
  assert.match(page, /!ALLOWED_FILE_EXTENSIONS\.includes\(fileExtension\)/);
  assert.match(page, /file\.type && !ALLOWED_FILE_TYPES\.includes\(file\.type\)/);
  assert.match(page, /MAX_FILE_SIZE = 5 \* 1024 \* 1024/);
});

test('production routing declares baseline security headers', () => {
  const vercelPath = fileURLToPath(new URL('../vercel.json', import.meta.url));
  const config = JSON.parse(readFileSync(vercelPath, 'utf8'));
  const headers = config.headers.flatMap((entry) => entry.headers || []);
  const headerNames = new Set(headers.map((header) => header.key));
  for (const required of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy', 'Strict-Transport-Security']) {
    assert.ok(headerNames.has(required), `${required} is missing from Vercel headers`);
  }
  const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value || '';
  for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'self'", 'connect-src']) {
    assert.ok(csp.includes(directive), `CSP is missing ${directive}`);
  }
});

test('project file employee policy is authenticated-only and init-plan friendly', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917180000_finalize_storage_rls_policy_roles.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /alter policy "Assigned employees can add project files"/);
  assert.match(migration, /on public\.crm_project_files to authenticated/);
  assert.match(migration, /\(select public\.get_user_role\(\)\)/);
  assert.match(migration, /\(select public\.is_project_member\(project_id\)\)/);
  assert.match(migration, /uploaded_by = \(select auth\.uid\(\)\)/);
  assert.match(migration, /alter policy "Assigned company users can upload project files"/);
  assert.match(migration, /on storage\.objects to authenticated/);
});

test('CRM role policies are consolidated per table action with file constraints', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260918090000_consolidate_crm_policies.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  for (const table of ['crm_clients', 'crm_projects', 'crm_invoices', 'crm_invoice_items', 'crm_project_members', 'crm_project_folders', 'crm_project_files', 'crm_tickets', 'crm_ticket_messages']) {
    assert.match(migration, new RegExp(`select scoped [^\\n]+\\n\\s*on public\\.${table} for select`, 'i'));
  }
  assert.match(migration, /CRM users can insert scoped project files/);
  assert.match(migration, /size_bytes between 0 and 52428800/);
  assert.match(migration, /mime_type = any/);
  assert.match(migration, /CRM admins can delete ticket messages/);
});

test('policy-only security definer helpers are isolated from the exposed public API', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917200000_isolate_rls_helper_functions.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create schema if not exists private/);
  assert.match(migration, /create or replace function private\.get_user_role/);
  assert.match(migration, /create or replace function private\.can_access_ticket/);
  assert.match(migration, /grant usage on schema private to authenticated/);
  assert.match(migration, /revoke all on function public\.get_user_role\(\) from public, authenticated/);
  assert.match(migration, /alter policy/);
});

test('unused last-login security definer RPC is not executable by API users', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260919180000_revoke_unused_last_login_rpc.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /revoke all on function public\.record_crm_last_login\(\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.record_crm_last_login\(\) to service_role/i);
});

test('support relationship migration protects client and project alignment', () => {
  const migrationPath = fileURLToPath(new URL('../supabase/migrations/20260917160000_ticket_relationship_integrity.sql', import.meta.url));
  const migration = readFileSync(migrationPath, 'utf8');
  assert.match(migration, /validate_ticket_project_client/);
  assert.match(migration, /project_client_id <> new\.client_id/);
  assert.match(migration, /crm_tickets_project_client_integrity/);
});

test('workspace store supports subscriptions and relationship-safe collection replacement', () => {
  const store = createWorkspaceStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  store.setProfile({ id: 1, role: CRM_ROLES.ADMIN });
  store.replaceCollections({
    clients: [{ id: 3, company: 'Acme' }],
    projects: [{ id: 7, client_id: 3, name: 'Delivery' }],
    project_members: [{ id: 9, project_id: 7, profile_id: 12 }],
    tickets: [{ id: 11, project_id: 7, client_id: 3 }],
    invoices: [{ id: 14, project_id: 7, client_id: 3 }],
  });
  assert.equal(store.selectById('projects', 7).name, 'Delivery');
  assert.equal(store.projectClient(store.selectById('projects', 7)).company, 'Acme');
  assert.equal(store.projectMembers(store.selectById('projects', 7)).length, 1);
  assert.equal(store.ticketProject(store.selectById('tickets', 11)).id, 7);
  assert.equal(store.invoiceClient(store.selectById('invoices', 14)).id, 3);
  assert.equal(notifications, 2);
  unsubscribe();
  store.invalidate('projects');
  assert.deepEqual(store.getState().collections.projects, undefined);
});

test('CRM cache hydration marks displayed collections stale until authoritative refresh', () => {
  const controller = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  const runtime = readFileSync(fileURLToPath(new URL('../src/lib/crm/features/workspaceDataRuntime.js', import.meta.url)), 'utf8');
  assert.match(controller, /createWorkspaceDataRuntime\(/);
  assert.match(runtime, /setStatus\('Syncing with database\.\.\.', 'success'\);\s*render\(\);\s*workspaceStore\.markStale\(true\);/);
});

test('CRM delegated clicks route workspace settings and user actions through the feature boundary', () => {
  const controller = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  assert.match(controller, /createWorkspaceNavigationClickHandler/);
  assert.match(controller, /await handleWorkspaceNavigationClick\(element, event\)/);
  assert.match(controller, /await filesRuntime\.handleClick\(element, event\)/);
  assert.match(controller, /supportRuntime\.handleClick\(element, event\)/);
  assert.match(controller, /await financeActions\.handleClick\(element, event\)/);
  assert.match(controller, /reportExportRuntime\.handleClick\(element\)/);
  assert.match(controller, /state\.invoiceBuilderActions\.handleClick\(element, event\)/);
  assert.doesNotMatch(controller, /element\.matches\('#inv-save-settings'\)/);
  assert.doesNotMatch(controller, /element\.matches\('\[data-project-file-delete\]'\)/);
  assert.doesNotMatch(controller, /element\.matches\('#btn-save-invoice'\)/);
});

test('finance click workflow keeps edit, settlement, and confirmed-delete behavior in its feature runtime', () => {
  const controller = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  const runtime = readFileSync(fileURLToPath(new URL('../src/lib/crm/features/financeActionsRuntime.js', import.meta.url)), 'utf8');
  assert.match(controller, /createFinanceActionsRuntime\(/);
  assert.match(runtime, /#finance-edit-toggle/);
  assert.match(runtime, /const nextStatus = \['income', 'revenue'\]\.includes\(record\.transaction_type\) \? 'received' : 'paid';/);
  assert.match(runtime, /confirmAction\(isInvoice \? 'Delete invoice\?' : 'Delete this record\?'\)/);
  assert.match(runtime, /await loadData\(\{ skipCache: true \}\)/);
});

test('finance actions update selected ledger filters and preserve edit-mode state', async () => {
  const state = {
    financeEditMode: false,
    accTab: 'overview',
    accSelectedId: 'entry-4',
    accSubTab: 'all',
    accTxPage: 8,
    data: { finances: [] },
  };
  let renders = 0;
  const runtime = createFinanceActionsRuntime({ state, renderFinance: () => { renders += 1; } });
  const action = (selector, dataset = {}) => ({
    dataset,
    matches(candidate) { return candidate.split(',').map((value) => value.trim()).includes(selector); },
  });

  assert.equal(await runtime.handleClick(action('[data-acc-tab]', { accTab: 'expenses' }), {}), true);
  assert.deepEqual([state.accTab, state.accSelectedId, renders], ['expenses', null, 1]);
  assert.equal(await runtime.handleClick(action('[data-acc-subtab]', { accSubtab: 'salary' }), {}), true);
  assert.deepEqual([state.accSubTab, state.accTxPage, renders], ['salary', 1, 2]);
  assert.equal(await runtime.handleClick(action('#finance-edit-toggle'), {}), true);
  assert.deepEqual([state.financeEditMode, renders], [true, 3]);
  assert.equal(await runtime.handleClick(action('[data-unrelated-action]'), {}), false);
});

test('finance runtime owns ledger search, inline autosave, validation, and filter changes', () => {
  const state = {
    accSearch: '', search: '', accTxPage: 5,
    financeStatusFilter: '', financeProofFilter: 'all',
  };
  let renders = 0;
  let autosaves = 0;
  let validations = 0;
  const row = {};
  const inlineField = { closest: (selector) => selector === '[data-inline-finance-row]' ? row : null };
  const runtime = createFinanceActionsRuntime({
    state,
    renderFinance: () => { renders += 1; },
    scheduleInlineFinanceSave: (target) => { assert.equal(target, row); autosaves += 1; },
    validateLedgerInput: () => { validations += 1; },
  });
  const field = (selector, value, ancestors = {}) => ({
    value,
    matches(candidate) { return candidate.split(',').map((part) => part.trim()).includes(selector); },
    closest(selector) { return ancestors[selector] || null; },
  });

  const inlineInput = field('input', 'amount', { '[data-inline-field]': inlineField });
  assert.equal(runtime.handleInput(inlineInput, { isSurface: () => false }), false);
  assert.equal(runtime.handleInput(inlineInput, { isSurface: (element) => element === inlineField }), true);
  assert.equal(runtime.handleInput(field('input', '', { '#inv-builder-form': {} })), false);
  assert.equal(runtime.handleInput(field('#acc-tx-search', 'invoice')), true);
  assert.equal(runtime.handleInput(field('#finance-search', 'travel')), true);
  assert.equal(runtime.handleBlur(field('[data-row-id] [data-field]', ''), { isSurface: () => true }), true);
  assert.equal(runtime.handleChange(field('#finance-status-filter', 'paid')), true);
  assert.equal(runtime.handleChange(field('#finance-proof-filter', 'attached')), true);
  assert.deepEqual([state.accSearch, state.accTxPage, state.search, state.financeStatusFilter, state.financeProofFilter], ['invoice', 1, 'travel', 'paid', 'attached']);
  assert.deepEqual([autosaves, validations, renders], [1, 1, 4]);
  assert.equal(runtime.handleChange(field('#unrelated-filter', 'ignored')), false);
});

test('finance settlement uses transaction type and restores the action after a failed write', async () => {
  const state = { accSelectedId: null, data: { finances: [{ id: 17, transaction_type: 'revenue' }] } };
  const requests = [];
  const upserts = [];
  const notices = [];
  let renders = 0;
  let shouldFail = false;
  const runtime = createFinanceActionsRuntime({
    state,
    portal: async (...args) => {
      requests.push(args);
      if (shouldFail) throw new Error('Service unavailable');
      return { item: { id: 17, status: 'received' } };
    },
    upsertFinanceRecord: (record) => upserts.push(record),
    toast: (message) => notices.push(message),
    renderFinance: () => { renders += 1; },
  });
  const action = {
    dataset: { resolveFinance: '17' },
    disabled: false,
    textContent: 'Mark Received',
    matches(candidate) { return candidate === '[data-resolve-finance]'; },
  };
  const event = { stopped: false, stopPropagation() { this.stopped = true; } };

  assert.equal(await runtime.handleClick(action, event), true);
  assert.equal(event.stopped, true);
  assert.deepEqual(requests, [['/api/portal/finances/17', { method: 'PATCH', body: '{"status":"received"}' }]]);
  assert.deepEqual(upserts, [{ id: 17, status: 'received' }]);
  assert.deepEqual([state.accSelectedId, notices[0], renders], ['17', 'Finance record marked received.', 1]);

  shouldFail = true;
  const retryAction = { ...action, disabled: true, textContent: 'Updating…' };
  assert.equal(await runtime.handleClick(retryAction, event), true);
  assert.deepEqual([retryAction.disabled, retryAction.textContent, notices[1]], [false, 'Mark Received', 'Service unavailable']);
});

test('finance deletion requires confirmation, clears scoped cache, then reloads live data', async () => {
  const state = { accSelectedId: 'invoice-2', data: { finances: [], invoices: [] } };
  const requests = [];
  const removals = [];
  const loads = [];
  let approved = false;
  const runtime = createFinanceActionsRuntime({
    state,
    portal: async (...args) => { requests.push(args); return {}; },
    confirmAction: () => approved,
    removeCachedWorkspaceRecord: (...args) => removals.push(args),
    storage: {},
    crmCacheKey: (kind) => `cache-${kind}`,
    loadData: async (options) => { loads.push(options); },
  });
  const action = {
    dataset: { delInvoice: 'invoice-2' },
    matches(candidate) { return candidate.split(',').map((value) => value.trim()).includes('[data-del-invoice]'); },
  };
  const event = { stopped: false, stopPropagation() { this.stopped = true; } };

  assert.equal(await runtime.handleClick(action, event), true);
  assert.deepEqual([event.stopped, requests.length, loads.length], [true, 0, 0]);
  approved = true;
  assert.equal(await runtime.handleClick(action, event), true);
  assert.deepEqual(requests, [['/api/portal/invoices/invoice-2', { method: 'DELETE' }]]);
  assert.equal(removals[0][1], 'invoices');
  assert.equal(removals[0][2], 'invoice-2');
  assert.deepEqual(removals[0][3], { storage: {}, key: 'cache-data' });
  assert.deepEqual(loads, [{ skipCache: true }]);
  assert.equal(state.accSelectedId, null);
});

test('invoice preview resolves a missing customer label through the linked CRM client', () => {
  const runtime = createInvoicePreviewRuntime({
    clientName: (id) => `Linked client ${id} & Co`,
    invoiceEffectiveStatus: () => 'sent',
    invoiceTotal: () => 0,
    invoicePaidAmount: () => 0,
    invoiceBalance: () => 0,
    statusTone: () => 'neutral',
    badge: () => '<span>Sent</span>',
    money: () => '₹0',
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;'),
  });
  const markup = runtime.buildInvoicePreviewHtml({ client_id: 42 }, []);
  assert.match(markup, /Linked client 42 &amp; Co/);
});

test('invoice hover runtime loads live detail, caches responses, and ignores stale failures', async () => {
  const visible = new Set();
  const preview = {
    style: {},
    markup: '',
    classList: {
      add(value) { visible.add(value); },
      remove(value) { visible.delete(value); },
    },
  };
  const requests = [];
  let rejectSlowRequest;
  const slowRequest = new Promise((_, reject) => { rejectSlowRequest = reject; });
  const runtime = createInvoicePreviewRuntime({
    els: { invoiceHover: preview },
    portal: (path) => {
      requests.push(path);
      if (path.endsWith('/slow')) return slowRequest;
      return Promise.resolve({ detail: { invoice: { invoice_number: 'Fast', client_id: 42 }, items: [] } });
    },
    invoiceEffectiveStatus: () => 'sent',
    invoiceTotal: () => 100,
    invoicePaidAmount: () => 20,
    invoiceBalance: () => 80,
    statusTone: () => 'neutral',
    badge: () => '<span>Sent</span>',
    money: (value) => `₹${value}`,
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;'),
    clientName: () => 'Acme & Co',
    replaceSafeMarkup: (element, markup) => { element.markup = markup; },
    windowRef: { innerWidth: 800 },
  });
  const target = (invoiceView, left = 600) => {
    const element = {
      dataset: { invoiceView },
      closest(selector) { return selector === '[data-invoice-view]' ? this : null; },
      contains: () => false,
      getBoundingClientRect: () => ({ left, bottom: 40 }),
    };
    return element;
  };

  await runtime.handleHover({ target: target('ignored'), relatedTarget: null }, () => false);
  assert.deepEqual(requests, []);

  const staleHover = runtime.handleHover({ target: target('slow'), relatedTarget: null }, () => true);
  await runtime.handleHover({ target: target('fast'), relatedTarget: null }, () => true);
  assert.equal(requests.length, 2);
  assert.equal(preview.markup.includes('Fast'), true);
  assert.equal(preview.markup.includes('Acme &amp; Co'), true);
  assert.deepEqual([preview.style.left, preview.style.top, visible.has('visible')], ['360px', '48px', true]);

  rejectSlowRequest(new Error('late failure'));
  await staleHover;
  assert.equal(visible.has('visible'), true);
  await runtime.handleHover({ target: target('fast', 20), relatedTarget: null }, () => true);
  assert.equal(requests.length, 2);
  runtime.handleHoverEnd({ target: target('fast'), relatedTarget: null }, () => true);
  assert.equal(visible.has('visible'), false);
});

test('invoice preview hover stays delegated and suppresses stale responses', () => {
  const controller = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  const invoicePreview = readFileSync(fileURLToPath(new URL('../src/lib/crm/features/invoicePreviewRuntime.js', import.meta.url)), 'utf8');
  assert.match(controller, /delegatedEvents\.on\('mouseover'.*handleInvoiceHover/);
  assert.match(invoicePreview, /generation !== hoverGeneration/);
  assert.match(invoicePreview, /target\.contains\(related\)/);
});

test('workspace root delegates feature-field interactions to their owning runtimes', () => {
  const controller = readFileSync(fileURLToPath(new URL('../src/scripts/crm-workspace.js', import.meta.url)), 'utf8');
  for (const delegation of [
    /state\.invoiceBuilderActions\?\.handleInput\(element\)/,
    /invoiceBuilder\.handleChange\(field\)/,
    /projectActions\.handleInput\(element\)/,
    /projectActions\.handleChange\(field\)/,
    /supportRuntime\.handleInput\(element\)/,
    /supportRuntime\.handleChange\(field\)/,
    /filesRuntime\.handleInput\(element\)/,
    /await filesRuntime\.handleChange\(field\)/,
    /peopleActions\.handleInput\(element\)/,
    /peopleActions\.handleChange\(field\)/,
    /reportExportRuntime\.handleChange\(field\)/,
  ]) assert.match(controller, delegation);
  for (const retiredInlineHandler of [
    /element\?\.id === 'pm-search'/,
    /field\?\.id === 'project-status-filter'/,
    /element\?\.id === 'tic-search'/,
    /field\?\.id === 'tic-status-filter'/,
    /element\?\.id === 'project-files-search'/,
    /field\?\.id === 'project-files-folder'/,
    /field\.id === 'inv-project-select'/,
    /field\.id === 'inv-client-select'/,
  ]) assert.doesNotMatch(controller, retiredInlineHandler);
});

test('project actions own list filters, safe menu matching, and detail display', () => {
  const state = {
    projectStatusFilter: 'active',
    projectSearch: 'old search',
    data: { projects: [{ id: 12, name: 'Delivery' }] },
  };
  const menuClasses = new Set(['is-open']);
  const menu = { dataset: { projectMenuPanel: '12"]' }, classList: {
    contains: (name) => menuClasses.has(name),
    add: (name) => menuClasses.add(name),
    remove: (name) => menuClasses.delete(name),
    toggle(name) { if (menuClasses.has(name)) menuClasses.delete(name); else menuClasses.add(name); },
  } };
  const otherOpenMenu = { classList: { remove: (name) => { if (name === 'is-open') menuClasses.delete(name); } } };
  const opened = [];
  let renders = 0;
  const runtime = createProjectActionsRuntime({
    state,
    documentRef: { querySelectorAll(selector) { return selector === '.project-reference-menu.is-open' ? [otherOpenMenu] : [menu]; } },
    renderProjects: () => { renders += 1; },
    els: { modalTitle: { textContent: '' }, modalBody: {}, modal: { classList: { add: (name) => opened.push(name) } } },
    renderProjectDetail: (project) => `<strong>${project.name}</strong>`,
    replaceSafeMarkup: (element, markup) => { element.markup = markup; },
  });
  const action = (selector, dataset = {}) => ({
    dataset,
    attributes: {},
    matches(candidate) { return candidate === selector; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const event = { stopped: false, stopPropagation() { this.stopped = true; } };

  assert.equal(runtime.handleClick(action('[data-project-status-tab]', { projectStatusTab: 'paused' }), event), true);
  assert.deepEqual([state.projectStatusFilter, state.projectSearch, renders], ['paused', 'old search', 1]);
  assert.equal(runtime.handleClick(action('[data-project-clear-filters]'), event), true);
  assert.deepEqual([state.projectStatusFilter, state.projectSearch, renders], ['', '', 2]);
  const trigger = action('[data-project-menu-trigger]', { projectMenuTrigger: '12"]' });
  assert.equal(runtime.handleClick(trigger, event), true);
  assert.deepEqual([menuClasses.has('is-open'), trigger.attributes['aria-expanded']], [true, 'true']);
  assert.equal(runtime.handleClick(action('[data-project-detail]', { projectDetail: '12' }), event), true);
  assert.deepEqual([event.stopped, opened, state.data.projects[0].name], [true, ['open'], 'Delivery']);
  const field = (selector, value) => ({ value, matches: (candidate) => candidate === selector });
  assert.equal(runtime.handleInput(field('#pm-search', 'payments')), true);
  assert.equal(runtime.handleChange(field('#project-status-filter', 'completed')), true);
  assert.deepEqual([state.projectSearch, state.projectStatusFilter, renders], ['payments', 'completed', 4]);
  assert.equal(runtime.handleInput(field('#unrelated-search', 'ignored')), false);
});

test('people selection actions keep nested record actions intact and render the active management section', () => {
  const state = { usersSection: 'clients', selectedClientId: null, selectedEmployeeId: null };
  const rendered = [];
  const actions = createPeopleSelectionActions({
    state,
    renderUsers: () => rendered.push('users'),
    renderClients: () => rendered.push('clients'),
    renderEmployees: () => rendered.push('employees'),
  });
  const action = (selector, dataset = {}) => ({ dataset, matches: (candidate) => candidate === selector });
  const event = (nested = false) => ({
    target: { closest: () => nested ? {} : null },
  });

  assert.equal(actions.handleClick(action('[data-client-detail]', { clientDetail: 'client-3' }), event()), true);
  assert.deepEqual([state.selectedClientId, rendered], ['client-3', ['users']]);
  assert.equal(actions.handleClick(action('[data-client-detail]', { clientDetail: 'client-4' }), event(true)), true);
  assert.deepEqual([state.selectedClientId, rendered], ['client-3', ['users']]);

  state.usersSection = 'employees';
  assert.equal(actions.handleClick(action('[data-employee-detail]', { employeeDetail: 'employee-8' }), event()), true);
  assert.deepEqual([state.selectedEmployeeId, rendered], ['employee-8', ['users', 'users']]);
  assert.equal(actions.handleClick(action('[data-employee-detail]'), event()), true);
  assert.equal(actions.handleClick(action('[data-unrelated-action]'), event()), false);
  const field = (selector, value) => ({ value, matches: (candidate) => candidate === selector });
  assert.equal(actions.handleInput(field('#users-search', 'Jordan')), true);
  assert.equal(actions.handleInput(field('#clients-search', 'Acme')), true);
  assert.equal(actions.handleInput(field('#employees-search', 'Jordan')), true);
  assert.equal(actions.handleChange(field('#users-role-filter', 'company_member')), true);
  state.usersSection = 'clients';
  assert.equal(actions.handleChange(field('#clients-status-filter', 'active')), true);
  assert.deepEqual([state.usersSearch, state.search, state.usersRoleFilter, state.clientStatusFilter], ['Jordan', 'Jordan', 'company_member', 'active']);
  assert.deepEqual(rendered.slice(-5), ['users', 'clients', 'users', 'users', 'users']);
});

test('project-drive click actions keep navigation, view, folder, and selection state in the feature runtime', async () => {
  const state = { fileProjectId: 'old', fileFolderId: 'old-folder', fileSelectedId: 'old-file', fileSearch: 'draft', fileView: 'list' };
  let renders = 0;
  const browserWindow = { location: { href: '', origin: 'https://crm.example' }, open() {}, tmCrm: { repository: {} } };
  const runtime = createFilesRuntime({
    state,
    els: {},
    isCompanyAdmin: () => true,
    canWrite: () => true,
    portal: async () => ({}),
    toast() {},
    loadData: async () => {},
    escapeHtml: String,
    projectDeliveryPeople: () => [],
    renderFiles: () => { renders += 1; },
    window: browserWindow,
    navigator: { clipboard: { writeText: async () => {} } },
    confirmAction: () => true,
  });
  const action = (selector, dataset = {}) => ({
    dataset,
    matches(candidate) { return candidate.split(',').some((value) => value.trim() === selector); },
  });

  assert.equal(await runtime.handleClick(action('[data-project-files-open]', { projectFilesOpen: 'project & one' }), {}), true);
  assert.equal(browserWindow.location.href, '/company/files?project=project%20%26%20one');
  assert.equal(await runtime.handleClick(action('[data-project-files-select]', { projectFilesSelect: 'project-2' }), {}), true);
  assert.deepEqual([state.fileProjectId, state.fileFolderId, state.fileSelectedId, state.fileSearch], ['project-2', '', null, '']);
  assert.equal(await runtime.handleClick(action('[data-project-files-view]', { projectFilesView: 'list' }), {}), true);
  assert.equal(await runtime.handleClick(action('[data-project-folder-open]', { projectFolderOpen: 'folder-3' }), {}), true);
  assert.equal(await runtime.handleClick(action('[data-project-file-select]', { projectFileSelect: 'file-4' }), {}), true);
  assert.deepEqual([state.fileFolderId, state.fileSelectedId, renders], ['folder-3', 'file-4', 4]);
  assert.equal(await runtime.handleClick(action('[data-unrelated-action]'), {}), false);
});

test('project-drive search, folder selection, and upload use the injected browser repository', async () => {
  const state = { fileProjectId: '42', fileFolderId: '6', fileSelectedId: 'file-9', fileSearch: '' };
  const uploads = [];
  const notices = [];
  let renders = 0;
  let loads = 0;
  const browserWindow = {
    location: { origin: 'https://crm.example' },
    tmCrm: { repository: { async uploadProjectFile(...args) { uploads.push(args); } } },
  };
  const runtime = createFilesRuntime({
    state,
    els: {},
    isCompanyAdmin: () => false,
    canWrite: (resource) => resource === 'project_files',
    portal: async () => ({}),
    toast: (message) => notices.push(message),
    loadData: async () => { loads += 1; },
    escapeHtml: String,
    projectDeliveryPeople: () => [],
    renderFiles: () => { renders += 1; },
    window: browserWindow,
    navigator: { clipboard: { writeText: async () => {} } },
  });
  const field = (selector, value, files = []) => ({
    value,
    files,
    disabled: false,
    isConnected: true,
    matches(candidate) { return candidate === selector; },
  });

  assert.equal(runtime.handleInput(field('#project-files-search', 'contract')), true);
  assert.equal(await runtime.handleChange(field('#project-files-folder', '8')), true);
  const uploadInput = field('[data-project-file-upload]', 'selected', [{ name: 'contract.pdf', size: 2048 }]);
  assert.equal(await runtime.handleChange(uploadInput), true);
  assert.deepEqual([state.fileSearch, state.fileFolderId, state.fileSelectedId, renders], ['contract', '8', null, 2]);
  assert.deepEqual(uploads, [[42, 8, { name: 'contract.pdf', size: 2048 }]]);
  assert.deepEqual([loads, notices, uploadInput.disabled, uploadInput.value], [1, ['1 file uploaded.'], false, '']);
});

test('project-drive file access uses signed repository URLs and reports access failures', async () => {
  const opened = [];
  const requested = [];
  const notices = [];
  const browserWindow = {
    location: { origin: 'https://crm.example' },
    open: (...args) => opened.push(args),
    tmCrm: { repository: { async getProjectFileUrl(id, options) { requested.push([id, options]); return 'https://signed.example/private-file'; } } },
  };
  const runtime = createFilesRuntime({
    state: { fileProjectId: 'project-1', data: {} }, els: {}, isCompanyAdmin: () => true,
    canWrite: () => true, portal: async () => ({}), toast: (message) => notices.push(message),
    loadData: async () => {}, escapeHtml: String, projectDeliveryPeople: () => [], renderFiles() {},
    window: browserWindow, navigator: { clipboard: { writeText: async () => {} } }, confirmAction: () => true,
  });
  const action = (selector, dataset = {}) => ({ dataset, matches(candidate) { return candidate.split(',').some((value) => value.trim() === selector); } });

  assert.equal(await runtime.handleClick(action('[data-project-file-open]', { projectFileOpen: 'file-1' }), {}), true);
  assert.deepEqual(requested, [['file-1', { download: false }]]);
  assert.deepEqual(opened, [['https://signed.example/private-file', '_blank', 'noopener']]);
  browserWindow.tmCrm.repository.getProjectFileUrl = async (id, options) => {
    requested.push([id, options]);
    throw new Error('File permission denied');
  };
  await runtime.handleClick(action('[data-project-file-download]', { projectFileDownload: 'file-2' }), {});
  assert.deepEqual(requested[1], ['file-2', { download: true }]);
  assert.deepEqual(notices, ['File permission denied']);
});

test('project-drive deletion requires confirmation, then refreshes authoritative data', async () => {
  const deleted = [];
  const notices = [];
  const loads = [];
  let approved = false;
  const runtime = createFilesRuntime({
    state: { fileProjectId: 'project-1', fileSelectedId: 'file-7', data: {} }, els: {},
    isCompanyAdmin: () => true, canWrite: () => true, portal: async () => ({}),
    toast: (message) => notices.push(message), loadData: async () => { loads.push('refresh'); },
    escapeHtml: String, projectDeliveryPeople: () => [], renderFiles() {},
    window: { location: { origin: 'https://crm.example' }, open() {}, tmCrm: { repository: { async deleteProjectFile(id) { deleted.push(id); } } } },
    navigator: { clipboard: { writeText: async () => {} } }, confirmAction: () => approved,
  });
  const action = { dataset: { projectFileDelete: 'file-7' }, matches(candidate) { return candidate === '[data-project-file-delete]'; } };
  const event = { stopped: false, stopPropagation() { this.stopped = true; } };

  assert.equal(await runtime.handleClick(action, event), true);
  assert.equal(event.stopped, true);
  assert.deepEqual(deleted, []);
  approved = true;
  assert.equal(await runtime.handleClick(action, event), true);
  assert.deepEqual(deleted, ['file-7']);
  assert.deepEqual([notices.at(-1), loads.length], ['Project file deleted.', 1]);
});

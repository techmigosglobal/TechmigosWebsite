import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationsForms } from '../src/lib/crm/features/operationsForms.js';

function fixture() {
  const state = {
    data: {
      clients: [{ id: 7, company: 'Acme & Co' }],
      projects: [{ id: 11, name: 'Portal', client_id: 7 }, { id: 12, name: 'Internal' }],
      profiles: [
        { id: 21, auth_user_id: 'employee-1', role: 'company_member', status: 'active', name: 'Asha' },
        { id: 22, auth_user_id: 'admin-1', role: 'company_admin', status: 'active', name: 'Ravi' },
      ],
      project_members: [{ project_id: 11, profile_id: 21 }],
    },
  };
  return createOperationsForms({
    state,
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    financeProofFieldMarkup: () => '<input name="proof_url" />',
    crmProjectIcon: (name) => `<i data-icon="${name}"></i>`,
    normalizePayload: (_resource, payload) => payload,
    employeesFromState: () => state.data.profiles,
    selectOpts: (options, current) => options.map(([value, label]) => `<option value="${value}"${value === current ? ' selected' : ''}>${label}</option>`).join(''),
    documentRef: null,
  });
}

test('operations forms preserve relationship options and escape labels', () => {
  const forms = fixture();
  const markup = forms.formMarkup('projects', { status: 'active', id: 11 }, 'Save');
  assert.match(markup, /Acme &amp; Co/);
  assert.match(markup, /value="21"/);
  assert.match(markup, /name="project_member_id" value="21" checked/);
  assert.match(markup, /data-drawer-section="project-team"/);
});

test('operations forms normalize the selected client and project manager together', () => {
  const forms = fixture();
  const payload = forms.projectPayloadFromForm({ client_id: '7', project_manager_profile_id: '21', name: 'Portal' });
  assert.equal(payload.client_id, 7);
  assert.equal(payload.client_name, 'Acme & Co');
  assert.equal(payload.project_manager, 'Asha');
  assert.equal(payload.owner_user_id, 'employee-1');
});

test('operations forms deduplicate the manager when collecting project members', () => {
  const forms = fixture();
  const formData = new Map([['project_member_id', ['21', '22']]]);
  formData.getAll = (key) => key === 'project_member_id' ? ['21', '22'] : [];
  assert.deepEqual(forms.projectMemberIds(formData, { project_manager_profile_id: '21' }), [21, 22]);
});

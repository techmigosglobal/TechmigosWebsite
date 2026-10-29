import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../src/features/finance/Techmigos_Finance_Standalone.html', import.meta.url), 'utf8');
const previewSource = html.slice(html.indexOf('function clearProofPreview('), html.indexOf('function projectCard('));
const renderSource = html.split(/\r?\n/).find(line => line.startsWith('function renderPage('));
const escSource = html.split(/\r?\n/).find(line => line.startsWith('const esc='));
const proof = id => ({ id, name: `${id}.pdf`, mime: 'application/pdf', blob: new Blob(['pdf'], { type: 'application/octet-stream' }), size: 3, addedAt: '2026-10-29' });

function harness(load = async id => proof(id)) {
  let box = { innerHTML: '' };
  const revoked = [], blobs = [];
  const host = { set innerHTML(value) { box = { innerHTML: value }; } };
  const context = vm.createContext({
    Blob, ui: { page: 'transactions', selectedTxId: 'tx', selectedProofId: 'one', proofUrl: '' },
    state: { transactions: [{ id: 'tx', proofIds: ['one', 'two'] }] },
    $: selector => selector === '#proofArea' ? box : host,
    URL: { createObjectURL: blob => { blobs.push(blob); return `blob:proof-${blobs.length}`; }, revokeObjectURL: url => revoked.push(url) },
    proofOp: (_mode, id) => load(id), icon: () => '', isFinanceAdmin: () => true,
    renderTransactions: () => 'Loading proof...', renderDashboard: () => '', renderProjects: () => '',
    renderProjectDetail: () => '', renderInvoices: () => '', renderReports: () => '', renderSettings: () => '', renderTeams: () => '',
    console: { warn: () => {} },
  });
  vm.runInContext(`${escSource}\n${previewSource}\n${renderSource}`, context);
  return { context, revoked, blobs, box: () => box, run: code => vm.runInContext(code, context) };
}

test('PDF previews give downloaded bytes a PDF MIME type and release old URLs', async () => {
  const h = harness();
  await h.run('renderProofArea()');
  assert.match(h.box().innerHTML, /iframe title="PDF preview"/);
  assert.equal(h.blobs[0].type, 'application/pdf');
  await h.run('renderProofArea()');
  assert.deepEqual(h.revoked, ['blob:proof-1']);
});

test('switching proofs ignores older successes and failures arriving after the selected proof', async () => {
  for (const failFirst of [false, true]) {
    const pending = new Map();
    const h = harness(id => new Promise((resolve, reject) => pending.set(id, { resolve, reject })));
    const first = h.run('renderProofArea()');
    h.context.ui.selectedProofId = 'two';
    const second = h.run('renderProofArea()');
    pending.get('two').resolve(proof('two'));
    await second;
    const selected = h.box().innerHTML;
    if (failFirst) pending.get('one').reject(new Error('Old request failed'));
    else pending.get('one').resolve(proof('one'));
    await first;
    assert.equal(h.box().innerHTML, selected);
    assert.match(selected, /two\.pdf/);
    assert.equal(h.blobs.length, 1);
  }
});

test('automatic transaction rerenders reload the selected proof and closing releases it', async () => {
  const h = harness();
  await h.run('renderProofArea()');
  h.run('renderPage()');
  await new Promise(setImmediate);
  assert.match(h.box().innerHTML, /iframe title="PDF preview"/);
  assert.deepEqual(h.revoked, ['blob:proof-1']);
  h.context.ui.selectedTxId = null;
  h.run('renderPage()');
  assert.deepEqual(h.revoked, ['blob:proof-1', 'blob:proof-2']);
});

test('leaving the inspector while a proof loads prevents stale content from being installed', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  const loading = h.run('renderProofArea()');
  h.context.ui.selectedTxId = null;
  h.run('renderPage()');
  resolve(proof('one'));
  await loading;
  assert.equal(h.blobs.length, 0);
});

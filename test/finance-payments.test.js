import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settlePaidInvoices } from '../functions/invoice-payments.js';
import { validateState, buildTeamView } from '../functions/domain.js';
import { financeFixture } from './fixtures/finance-state.js';
import { invoicePaymentUrl, paymentDetails, upiPaymentUri } from '../src/lib/finance-payment.js';

test('settling a paid invoice credits income once without changing fixed team entitlements', () => {
  const state = financeFixture();state.invoices[0].status = 'Paid';state.invoices[0].projectId = 'p-arish';
  const settled = settlePaidInvoices(state, '2026-10-24');validateState(settled.state);
  assert.equal(settled.receipts.length, 1);assert.equal(settled.receipts[0].amount, 100);
  assert.equal(settled.receipts[0].date, '2026-10-24');assert.equal(settled.receipts[0].projectId, 'p-arish');
  assert.equal(buildTeamView(settled.state, 'team-1').projects[0].allotted, 3000);
  assert.equal(state.transactions.length, 18);
  assert.deepEqual(settlePaidInvoices(settled.state).state, settled.state);
  settled.state.invoices[0].status = 'Paid';
  assert.equal(settlePaidInvoices(settled.state).receipts.length, 0);
});

test('Paid creates only the outstanding cents and leaves unrelated payments unchanged', () => {
  const state = financeFixture(), invoice = state.invoices[0];invoice.status = 'Paid';invoice.amount = 100.01;
  state.transactions.push({ ...state.transactions[0], id: 'partial', projectId: invoice.projectId, linkedInvoiceId: invoice.id, amount: 40.02 });
  const settled = settlePaidInvoices(state);
  assert.equal(settled.receipts[0].amount, 59.99);assert.equal(settled.receipts[0].date, invoice.issuedDate);
  assert.equal(settled.state.transactions.find(tx => tx.id === 'partial').amount, 40.02);
  assert.equal(settled.state.invoices[1].status, 'Pending');validateState(settled.state);
  state.transactions.at(-1).projectId = 'p-arish';
  assert.throws(() => settlePaidInvoices(state), /same project/);
});

test('reopening a settled invoice does not remove cash and correcting a receipt restores its balance', () => {
  const state = financeFixture();state.invoices[0].status = 'Paid';
  const { state: settled } = settlePaidInvoices(state);
  const receipt = settled.transactions.at(-1);settled.transactions = settled.transactions.filter(tx => tx.id !== receipt.id);
  assert.equal(settlePaidInvoices(settled).receipts.length, 0);
});

test('payment URLs preserve recipient, balance and Unicode notes without raw UPI PDF links', () => {
  const details = { pa: 'example@bank', pn: 'Example & Co', am: '59.99', tn: 'Invoice (₹100) / A' };
  const uri = new URL(upiPaymentUri(details));assert.equal(uri.protocol, 'upi:');assert.equal(uri.searchParams.get('pn'), details.pn);
  assert.equal(uri.searchParams.get('tn'), details.tn);assert.ok(!uri.href.includes('+'));
  const link = new URL(invoicePaymentUrl(details, 'https://www.techmigos.com'));
  assert.equal(link.protocol, 'https:');assert.equal(link.pathname, '/pay');assert.equal(link.search, '');
  assert.deepEqual(paymentDetails(Object.fromEntries(new URLSearchParams(link.hash.slice(1)))), { ...details, cu: 'INR' });
});

test('payment links reject active content, malformed amounts and unsafe website origins', () => {
  const details = { pa: 'example@bank', pn: 'Example', am: '100.00', tn: 'Invoice' };
  for (const changes of [{ pa: 'javascript:alert(1)' }, { am: '0' }, { am: '-1' }, { am: '1e3' }, { am: '1.001' }, { pn: '\nInjected' }]) assert.throws(() => paymentDetails({ ...details, ...changes }));
  assert.throws(() => invoicePaymentUrl(details, 'http://example.com'));
  assert.throws(() => invoicePaymentUrl(details, 'javascript:alert(1)'));
});

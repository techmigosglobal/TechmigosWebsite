import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financeFixture } from './fixtures/finance-state.js';
import { calculateProjectMetrics } from '../functions/project-finance.js';
import { validateState, buildTeamView } from '../functions/domain.js';
import { settlePaidInvoices } from '../functions/invoice-payments.js';

test('project value sets team entitlements independently of collected income and invoices', () => {
  const state=financeFixture(),project=state.projects[0];project.projectValue=40000;project.shares=[{teamId:'team-1',pct:25},{teamId:'team-2',pct:25}];
  let m=calculateProjectMetrics(state,project.id);
  assert.equal(m.projectValue,40000);assert.equal(m.received,10000);assert.equal(m.shares[0].allotted,10000);assert.equal(m.shares[0].remaining,9500);assert.equal(m.companyShare,20000);
  state.transactions[0].amount=1;state.invoices[0].amount=999999;
  m=calculateProjectMetrics(state,project.id);assert.equal(m.shares[0].allotted,10000);assert.equal(m.companyShare,20000);
  assert.equal(buildTeamView(state,'team-1').projects[0].allotted,10000);
  project.projectValue=30000;assert.equal(calculateProjectMetrics(state,project.id).shares[0].allotted,7500);
});

test('recurring receipts and manual company-only invoice income belong entirely to company', () => {
  let state=financeFixture();const invoice=state.invoices[0];invoice.projectId='p-arish';invoice.templateId='monthly-example';invoice.status='Paid';invoice.amount=1799;
  state=settlePaidInvoices(state,'2026-10-25').state;validateState(state);
  const receipt=state.transactions.find(tx=>tx.linkedInvoiceId===invoice.id);
  assert.equal(receipt.companyOnly,true);
  let m=calculateProjectMetrics(state,'p-arish');assert.equal(m.recurringIncome,1799);assert.equal(m.shares[0].allotted,3000);assert.equal(m.companyShare,7000);assert.equal(m.companyEstimatedNet,7000+1799-m.expenseAll);
  // Receipt classification survives deletion of its source invoice.
  state.invoices=state.invoices.filter(item=>item.id!==invoice.id);m=calculateProjectMetrics(state,'p-arish');assert.equal(m.recurringIncome,1799);assert.equal(m.shares[0].allotted,3000);
  state.invoices[0].companyOnly=true;state.invoices[0].status='Paid';state.invoices[0].projectId='p-arish';
  const settled=settlePaidInvoices(state,'2026-10-25').state;assert.equal(calculateProjectMetrics(settled,'p-arish').recurringIncome,1899);
});

test('future projects use their own saved fixed values; unconfigured legacy values are not inferred', () => {
  const state=financeFixture();state.projects.push({id:'future',name:'Future project',client:'Client',status:'Active',projectValue:80000,shares:[{teamId:'team-1',pct:25}]});validateState(state);
  const m=calculateProjectMetrics(state,'future');assert.equal(m.received,0);assert.equal(m.shares[0].allotted,20000);assert.equal(m.companyShare,60000);assert.equal(m.cashBalance,0);
  delete state.projects[0].projectValue;assert.equal(calculateProjectMetrics(state,'p-arish').shares[0].allotted,0);
});

test('invalid fixed values and invalid company-income flags are rejected', () => {
  for(const value of [-1,0,NaN,Infinity,'40000',1.001,1e13]){const state=financeFixture();state.projects[0].projectValue=value;assert.throws(()=>validateState(state));}
  const state=financeFixture();state.transactions[1].companyOnly=true;assert.throws(()=>validateState(state));
});

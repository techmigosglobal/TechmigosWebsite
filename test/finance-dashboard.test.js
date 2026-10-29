import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calculateProjectMetrics } from '../functions/project-finance.js';
import { financeFixture } from './fixtures/finance-state.js';

const document = readFileSync(new URL('../src/features/finance/Techmigos_Finance_Standalone.html', import.meta.url), 'utf8');
const lines = document.split(/\r?\n/);
const helpers = ['money', 'moneyShort', 'esc', 'round', 'sum', 'creditedTx', 'expenseTx', 'paidTx', 'allShares', 'companyPct'];
const functions = ['globalMetrics', 'kpi', 'renderDashboard', 'shareSection'];
const source = [
  ...helpers.map(name => lines.find(line => line.startsWith(`const ${name}=`))),
  ...functions.map(name => {
    const start = lines.findIndex(line => line.startsWith(`function ${name}(`));
    let end = start + 1;
    if (!lines[start].endsWith('}')) {
      while (lines[end] !== '}') end++;
      end++;
    }
    return lines.slice(start, end).join('\n');
  }),
].join('\n');

function dashboard(transactions) {
  const context = vm.createContext({
    state: { transactions, invoices: [], projects: [], recurringTemplates: [] },
    pageHeader: () => '', icon: () => '', panel: () => '', txTable: () => '', label: () => '',
  });
  vm.runInContext(source, context);
  return { metrics: vm.runInContext('globalMetrics()', context), html: vm.runInContext('renderDashboard()', context) };
}

test('company balance subtracts only paid expenses and salaries and preserves negative amounts', () => {
  const transactions = [
    { type: 'income', status: 'Received', amount: 100 },
    { type: 'income', status: 'Pending', amount: 900 },
    { type: 'expense', status: 'Paid', amount: 120 },
    { type: 'expense', status: 'Pending', amount: 800 },
    { type: 'salary', status: 'Paid', amount: 10 },
    { type: 'salary', status: 'Pending', amount: 700 },
  ];
  const { metrics, html } = dashboard(transactions);
  assert.equal(metrics.cash, -30);
  assert.equal(metrics.expensePaid, 120);
  assert.match(html, /Current company balance[\s\S]*?<div class="metric">-₹30\.00<\/div>/);
  assert.match(html, /Paid expenses[\s\S]*?<div class="metric">₹120<\/div>/);
  assert.match(html, /hintbox warn/);
  transactions[3].status = 'Paid';
  assert.equal(dashboard(transactions).metrics.cash, -830);
});

test('company balance shows positive, zero and small negative balances without rounding away paise', () => {
  for (const [expense, balance] of [[40, '₹60.00'], [100, '₹0.00'], [100.01, '-₹0.01']]) {
    const { html } = dashboard([
      { type: 'income', status: 'Received', amount: 100 },
      { type: 'expense', status: 'Paid', amount: expense },
    ]);
    assert.ok(html.includes(`<div class="metric">${balance}</div>`));
  }
});

test('company allocation shows project purchases as paid expenses and keeps pending expenses separate', () => {
  const state = financeFixture();
  const project = state.projects[0];
  project.projectValue = 30000;
  project.shares[0].pct = 50;
  state.transactions = [
    { type: 'expense', projectId: project.id, status: 'Paid', amount: 352 },
    { type: 'expense', projectId: project.id, status: 'Pending', amount: 1000 },
    { type: 'expense', projectId: state.projects[1].id, status: 'Paid', amount: 500 },
    { type: 'salary', projectId: project.id, teamId: 'team-1', status: 'Paid', amount: 4000 },
  ];
  const context = vm.createContext({ p: project, label: () => '', statusLabel: () => '' });
  vm.runInContext(source, context);
  for (const [expense, remaining] of [[352, '₹14,648.00'], [16000, '-₹1,000.00']]) {
    state.transactions[0].amount = expense;
    context.m = calculateProjectMetrics(state, project.id);
    const html = vm.runInContext('shareSection(p,m)', context);
    const companyRow = html.slice(html.indexOf('<strong>Company allocation</strong>'));
    assert.ok(companyRow.includes('₹15,000.00'));
    assert.ok(companyRow.includes(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense)));
    assert.ok(companyRow.includes(remaining));
    assert.ok(companyRow.includes('₹1,000.00 pending'));
    assert.equal(context.m.shares[0].allotted, 15000);
    assert.equal(context.m.shares[0].paid, 4000);
  }
});

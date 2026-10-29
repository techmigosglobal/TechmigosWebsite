import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canApproveMissing, makeApprovalDraft, transactionFingerprint, validateApprovalAttachment } from '../functions/proof-approvals.js';
import { splitExpense, transactionsForProject } from '../functions/expense-allocations.js';
import { validateState } from '../functions/domain.js';
import { calculateProjectMetrics } from '../functions/project-finance.js';
import { financeFixture } from './fixtures/finance-state.js';

const vinay = { uid: 'vinay', name: 'Vinay', role: 'admin', email: 'vinay@techmigos.com', active: true };
const options = { id: 'approval-test', approvedAt: '2026-10-29T12:00:00.000Z', reason: 'Original receipt was lost.' };
test('only active Vinay administrator can approve a missing proof with a saved signature', () => {
  const state = financeFixture(), transaction = state.transactions[1];
  assert.throws(() => makeApprovalDraft(state, transaction.id, vinay, options), /signature/);
  state.settings.approvalImages = { signatureDataUrl: 'data:image/png;base64,YQ==', stampDataUrl: '' };
  validateState(state);
  const draft = makeApprovalDraft(state, transaction.id, vinay, options);
  assert.equal(draft.approvedByUid, vinay.uid);
  assert.equal(draft.transactionHash, transactionFingerprint(transaction));
  for (const user of [{ ...vinay, email: 'vishal@techmigos.com' }, { ...vinay, role: 'member' }, { ...vinay, active: false }]) {
    assert.equal(canApproveMissing(user), false);
    assert.throws(() => makeApprovalDraft(state, transaction.id, user, options), /Only Vinay/);
  }
  transaction.proofIds.push('existing');
  assert.throws(() => makeApprovalDraft(state, transaction.id, vinay, options), /Missing/);
});
test('approved vouchers are tied to transaction details and only Vinay can remove them', () => {
  const state = financeFixture(), before = state.transactions[1], after = structuredClone(before);
  const proof = { id: 'approved', approval: { approvedByUid: vinay.uid, transactionHash: transactionFingerprint(before) } };
  before.proofIds = ['approved']; after.proofIds = ['approved'];
  validateApprovalAttachment(proof, before, after, vinay.uid);
  after.amount++;
  assert.throws(() => validateApprovalAttachment(proof, before, after, vinay.uid), /Remove the approval/);
  after.proofIds = [];
  assert.throws(() => validateApprovalAttachment(proof, before, after, 'vishal'), /Only Vinay/);
  validateApprovalAttachment(proof, before, after, vinay.uid);
});
test('shared expenses distribute paise exactly and charge each project only its share', () => {
  assert.deepEqual(splitExpense(100.01, ['p-arish', 'p-focus']), [{ projectId: 'p-arish', amount: 50.01 }, { projectId: 'p-focus', amount: 50 }]);
  const state = financeFixture();
  state.transactions = [{ ...state.transactions[1], projectId: '', amount: 100.01, projectAllocations: splitExpense(100.01, ['p-arish', 'p-focus']) }];
  validateState(state);
  assert.equal(calculateProjectMetrics(state, 'p-arish').expensePaid, 50.01);
  assert.equal(calculateProjectMetrics(state, 'p-focus').expensePaid, 50);
  assert.equal(transactionsForProject(state, 'p-arish')[0].sharedTotalAmount, 100.01);
  assert.equal(state.transactions.reduce((sum, tx) => sum + tx.amount, 0), 100.01);
  state.transactions[0].status = 'Pending';
  assert.equal(calculateProjectMetrics(state, 'p-arish').expensePaid, 0);
  assert.equal(calculateProjectMetrics(state, 'p-focus').expenseAll, 50);
});
test('shared allocation rejects bad totals, duplicates, unknown projects, fractional paise and non-expenses', () => {
  for (const mutate of [tx => tx.projectAllocations[0].amount++, tx => tx.projectAllocations[0].projectId = 'missing', tx => tx.projectAllocations[0].projectId = 'p-focus', tx => tx.projectAllocations[0].amount = 50.001, tx => tx.type = 'salary', tx => tx.projectId = 'p-arish']) {
    const state = financeFixture();
    const tx = { ...state.transactions[1], projectId: '', amount: 100, projectAllocations: splitExpense(100, ['p-arish', 'p-focus']) };
    mutate(tx); state.transactions = [tx]; assert.throws(() => validateState(state));
  }
});

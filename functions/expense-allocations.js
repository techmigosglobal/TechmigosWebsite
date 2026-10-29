const cents = amount => Math.round((Number(amount) + Number.EPSILON) * 100);
export function splitExpense(amount, projectIds) {
  const total = cents(amount);
  if (!Number.isSafeInteger(total) || total <= 0 || !projectIds.length || total < projectIds.length) throw Error('Enter an amount large enough to give each project at least ₹0.01.');
  return projectIds.map((projectId, index) => ({ projectId, amount: (Math.floor(total / projectIds.length) + (index < total % projectIds.length ? 1 : 0)) / 100 }));
}
export function validateExpenseAllocations(transaction, projects) {
  if (transaction.projectAllocations === undefined) return;
  const allocations = transaction.projectAllocations;
  if (transaction.type !== 'expense' || transaction.projectId !== '' || Math.abs(transaction.amount * 100 - cents(transaction.amount)) > .001 || !Array.isArray(allocations) || allocations.length < 2 || allocations.length > 100) throw Error('Shared expenses require at least two projects, a total with up to two decimal places, and no single project.');
  const seen = new Set(); let total = 0;
  for (const allocation of allocations) {
    if (!allocation || Object.keys(allocation).length !== 2 || !projects.has(allocation.projectId) || seen.has(allocation.projectId)
      || !Number.isFinite(allocation.amount) || allocation.amount <= 0 || allocation.amount > 1e12 || Math.abs(allocation.amount * 100 - cents(allocation.amount)) > .001) throw Error('Choose unique existing projects and positive amounts with up to two decimal places.');
    seen.add(allocation.projectId); total += cents(allocation.amount);
  }
  if (total !== cents(transaction.amount)) throw Error('Project amounts must add up exactly to the expense total.');
}
export const transactionInProject = (transaction, projectId) => transaction.projectAllocations?.some(allocation => allocation.projectId === projectId) || transaction.projectId === projectId;
export function transactionsForProject(state, projectId) {
  return state.transactions.filter(transaction => transactionInProject(transaction, projectId)).map(transaction => {
    const allocation = transaction.projectAllocations?.find(item => item.projectId === projectId);
    return allocation ? { ...transaction, amount: allocation.amount, sharedTotalAmount: transaction.amount } : transaction;
  });
}

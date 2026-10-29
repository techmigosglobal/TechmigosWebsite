import { transactionsForProject } from './expense-allocations.js';
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const total = (rows, value = row => row.amount) => round(rows.reduce((sum, row) => sum + Number(value(row) || 0), 0));
export const isCompanyInvoice = invoice => Boolean(invoice?.companyOnly || invoice?.templateId || invoice?.source === 'Recurring');

export function calculateProjectMetrics(state, projectId) {
  const project = state.projects.find(item => item.id === projectId);
  const rows = transactionsForProject(state, projectId);
  const income = rows.filter(tx => tx.type === 'income' && tx.status === 'Received');
  const expenses = rows.filter(tx => tx.type === 'expense');
  const payouts = rows.filter(tx => tx.type === 'salary');
  const invoices = state.invoices.filter(invoice => invoice.projectId === projectId);
  const companyInvoices = new Set(invoices.filter(isCompanyInvoice).map(invoice => invoice.id));
  const projectValue = Number(project?.projectValue || 0);
  const shares = (project?.shares || []).map(share => {
    const teamPayouts = payouts.filter(tx => tx.teamId === share.teamId);
    const allotted = round(projectValue * share.pct / 100);
    const paid = total(teamPayouts.filter(tx => tx.status === 'Paid'));
    return { ...share, teamName: state.teams.find(team => team.id === share.teamId)?.name || 'Unassigned', allotted, paid, pending: total(teamPayouts.filter(tx => tx.status === 'Pending')), remaining: round(Math.max(0, allotted - paid)), overpaid: round(Math.max(0, paid - allotted)) };
  });
  const teamTotal = total(shares, share => share.allotted);
  const companyShare = round(projectValue - teamTotal);
  const recurringIncome = total(income.filter(tx => tx.companyOnly || companyInvoices.has(tx.linkedInvoiceId)));
  const expenseAll = total(expenses), expensePaid = total(expenses.filter(tx => tx.status === 'Paid'));
  const received = total(income), payoutPaid = total(payouts.filter(tx => tx.status === 'Paid'));
  return { projectValue, received, invoiced: total(invoices), expenseAll, expensePaid, payoutAll: total(payouts), payoutPaid, shares, teamTotal, companyShare, recurringIncome,
    companyEstimatedNet: round(companyShare + recurringIncome - expenseAll), cashBalance: round(received - expensePaid - payoutPaid),
    unassignedPayouts: round(total(payouts) - total(shares, share => share.paid + share.pending)) };
}

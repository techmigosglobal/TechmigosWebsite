const cents = value => Math.round((value + Number.EPSILON) * 100);

// A Paid status is an explicit instruction to settle the remaining invoice balance.
// Persist receipts, then derive Paid from those receipts so later corrections work.
export function settlePaidInvoices(state, paymentDate) {
  const result = structuredClone(state), receipts = [];
  for (const invoice of result.invoices) {
    if (invoice.status !== 'Paid') continue;
    const linked = result.transactions.filter(tx => tx.type === 'income' && tx.linkedInvoiceId === invoice.id && tx.status === 'Received');
    if (linked.some(tx => tx.projectId !== invoice.projectId)) throw Error('An invoice and its receipts must belong to the same project.');
    const remaining = cents(invoice.amount) - linked.reduce((total, tx) => total + cents(tx.amount), 0);
    if (remaining > 0) {
      const prefix = `paid-${invoice.id}`.slice(0, 85);
      let id = prefix, suffix = 1;
      while (result.transactions.some(tx => tx.id === id)) id = `${prefix}-${suffix++}`;
      const receipt = { id, date: paymentDate || invoice.issuedDate, description: `Payment received — ${invoice.invoiceNo}`.slice(0, 250), type: 'income', amount: remaining / 100, projectId: invoice.projectId, status: 'Received', teamId: '', payee: result.projects.find(project => project.id === invoice.projectId)?.client || '', notes: `Recorded from the Paid status of invoice ${invoice.invoiceNo}.${paymentDate ? '' : ' Historical payment date unavailable; using invoice issue date.'}`, proofIds: [], linkedInvoiceId: invoice.id, source: 'Paid invoice' };
      result.transactions.push(receipt); receipts.push(receipt);
    }
    invoice.status = 'Pending';
  }
  return { state: result, receipts };
}

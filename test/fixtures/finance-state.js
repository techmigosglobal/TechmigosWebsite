export function financeFixture() {
  const tx = (id, type, amount, projectId='p-arish', teamId='') => ({ id, date:'2026-10-10', description:`Example ${id}`, type, amount, projectId, teamId, status:type==='income'?'Received':'Paid', payee:'Example recipient', notes:'Internal note', proofIds:[], linkedInvoiceId:'', source:'Example' });
  const transactions = [tx('tx-income','income',10000),tx('tx-expense','expense',1000),tx('tx-payout','salary',500,'p-arish','team-1')];
  for(let n=3;n<18;n++)transactions.push(tx(`tx-example-${n}`,'expense',10));
  return { version:4, teams:[{id:'team-1',name:'Team 1'},{id:'team-2',name:'Team 2'}],
    projects:[{id:'p-arish',name:'Example Alpha',client:'Example client',status:'Active',projectValue:10000,shares:[{teamId:'team-1',pct:30}]},{id:'p-focus',name:'Example Beta',client:'Example client',status:'Active',projectValue:10000,shares:[{teamId:'team-2',pct:20}]}],
    transactions,
    invoices:Array.from({length:5},(_,n)=>({id:`inv-example-${n}`,invoiceNo:`EXAMPLE-${n}`,projectId:'p-focus',description:`Example invoice ${n}`,amount:100,issuedDate:'2026-10-01',dueDate:'2026-10-15',status:'Pending',notes:'',proofIds:[],templateId:'',period:'',source:'Example'})),
    recurringTemplates:[], settings:{businessName:'Example business',businessEmail:'',businessPhone:'',businessAddress:'',currency:'INR'} };
}

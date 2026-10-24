import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateState, validateMember, buildTeamView, proofTeams } from '../functions/domain.js';
import { financeFixture } from './fixtures/finance-state.js';

test('valid finance records retain amounts and stable IDs',()=>{const source=financeFixture();assert.deepEqual(validateState(source),source)});

test('invoice services preserve their calculated total and reject mismatches',()=>{
  const state=financeFixture(),invoice=state.invoices[0];invoice.items=[{description:'Project services',quantity:1,unit:'Service',rate:invoice.amount}];
  assert.deepEqual(validateState(state).invoices[0].items,invoice.items);
  invoice.items[0].quantity=2;assert.throws(()=>validateState(state),/match the invoice total/);
});

test('project invoice templates reject external images and invalid payment IDs',()=>{
  const state=financeFixture(),template={sellerName:'Example',sellerAddress:'Hyderabad',sellerPhone:'',sellerEmail:'',clientName:'Client',clientPhone:'',clientAddress:'',terms:'Service terms',upiId:'example@bank',payeeName:'Example',signatoryName:'Example',logoDataUrl:'/icon.png',signatureDataUrl:''};
  state.projects[0].invoiceTemplate=template;validateState(state);
  template.signatureDataUrl='https://example.com/track.png';assert.throws(()=>validateState(state),/embedded PNG/);
  template.signatureDataUrl='';template.upiId='javascript:example';assert.throws(()=>validateState(state),/UPI/);
});
test('invalid amounts, calendar dates and unexpected fields are rejected on every save',()=>{
  for(const mutate of [s=>s.transactions[0].amount=-1,s=>s.transactions[0].date='2026-02-31',s=>s.teams[0].admin=true,s=>delete s.transactions[0].description,s=>s.projects[0].shares[0].pct=101]){
    const state=financeFixture();mutate(state);assert.throws(()=>validateState(state));
  }
});
test('unknown teams, missing projects and duplicate records cannot corrupt relationships',()=>{
  for(const mutate of [s=>s.projects[0].shares[0].teamId='other',s=>s.transactions[0].projectId='other',s=>s.transactions.push(s.transactions[0]),s=>s.teams[1].name='team 1']){
    const state=financeFixture();mutate(state);assert.throws(()=>validateState(state));
  }
});
test('members receive only their own projects and payouts without private ledger fields',()=>{
  const state=financeFixture(),view=buildTeamView(state,'team-1');
  assert.deepEqual(view.projects.map(p=>p.id),['p-arish']);assert.equal(view.projects[0].allotted,3000);assert.equal(view.projects[0].remaining,2500);
  assert.equal(view.payouts.length,1);assert.equal(view.payouts[0].teamId,'team-1');
  assert.equal('transactions' in view,false);assert.equal('notes' in view.payouts[0],false);assert.equal('shares' in view.projects[0],false);
  assert.deepEqual(buildTeamView(state,'team-2').payouts,[]);
});
test('team rename propagates through projections without changing references',()=>{
  const state=financeFixture();state.teams[0].name='Delivery team';assert.equal(buildTeamView(state,'team-1').team.name,'Delivery team');assert.equal(state.transactions[2].teamId,'team-1');
});
test('project access can be assigned without creating a financial share',()=>{
  const state=financeFixture();state.projects[1].teamIds=['team-1'];validateState(state);
  const view=buildTeamView(state,'team-1');assert.equal(view.projects.length,2);assert.equal(view.projects.find(p=>p.id==='p-focus').allotted,0);
});
test('only proofs linked to assigned salary payouts are readable by the team',()=>{
  const state=financeFixture();state.transactions[0].proofIds=['proof-income'];state.transactions[2].proofIds=['proof-salary'];
  assert.deepEqual(proofTeams(state,'proof-income'),[]);assert.deepEqual(proofTeams(state,'proof-salary'),['team-1']);
  state.projects[0].shares=[];assert.deepEqual(proofTeams(state,'proof-salary'),[]);
});
test('member credentials require a valid team and password and cannot carry an administrator role',()=>{
  const member={name:'Example member',email:'member@example.com',teamId:'team-1',active:true,password:'Example@123',requestId:'request-1'};
  assert.equal(validateMember(member).email,member.email);
  assert.throws(()=>validateMember({...member,role:'admin'}));assert.throws(()=>validateMember({...member,password:'short'}));
  assert.throws(()=>validateMember({...member,email:'invalid'}));
});

import { calculateProjectMetrics } from './project-finance.js';

export const COLLECTIONS = {
  teams: 'finance_teams', projects: 'finance_projects', transactions: 'finance_transactions',
  invoices: 'finance_invoices', recurringTemplates: 'finance_plans',
};
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
export function fail(message) { throw new Error(message); }
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object.`);
}
function text(value, max = 250, required = false) {
  return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
}
function date(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
function amount(value) { return Number.isFinite(value) && value > 0 && value <= 1e12; }
function exact(value, keys, name) {
  object(value, name);
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) fail(`Invalid ${name} fields.`);
}
function ids(value, limit = 30) { return Array.isArray(value) && value.length <= limit && value.every(id => typeof id === 'string' && ID.test(id)) && new Set(value).size === value.length; }
function recordArray(value, name, validate) {
  if (!Array.isArray(value) || value.length > 5000) fail(`Invalid ${name} list.`);
  const seen = new Set();
  for (const record of value) {
    object(record, name);
    if (!ID.test(record.id || '') || seen.has(record.id)) fail(`Invalid or duplicate ${name} ID.`);
    seen.add(record.id);
    validate(record);
  }
}

export function validateState(input) {
  exact(input, ['version', 'teams', 'projects', 'transactions', 'invoices', 'recurringTemplates', 'settings'], 'finance state');
  if (input.version !== 4) fail('Unsupported finance version.');
  recordArray(input.teams, 'team', team => {
    exact(team, ['id', 'name'], 'team');
    if (!text(team.name, 100, true)) fail('Enter a team name of up to 100 characters.');
  });
  if (input.teams.length > 100 || new Set(input.teams.map(team => team.name.trim().toLowerCase())).size !== input.teams.length) fail('Team names must be unique; at most 100 teams are supported.');
  const teams = new Set(input.teams.map(team => team.id));
  recordArray(input.projects, 'project', project => {
    const keys=['id','name','client','status','shares'];
    if(keys.some(key=>!(key in project))||Object.keys(project).some(key=>![...keys,'teamIds','invoiceTemplate','projectValue'].includes(key)))fail('Invalid project fields.');
    if(project.projectValue!==undefined&&(!amount(project.projectValue)||Math.abs(project.projectValue*100-Math.round(project.projectValue*100))>0.001))fail('Enter a positive fixed project value with at most two decimal places.');
    if(project.teamIds!==undefined&&(!ids(project.teamIds,100)||project.teamIds.some(id=>!teams.has(id))))fail('Invalid project team assignments.');
    if(project.invoiceTemplate!==undefined)validateInvoiceTemplate(project.invoiceTemplate);
    if (!text(project.name, 100, true) || !text(project.client, 120) || !['Active', 'Completed', 'On Hold'].includes(project.status)) fail('Invalid project details.');
    if (!Array.isArray(project.shares) || project.shares.length > 100) fail('Invalid project shares.');
    const seen = new Set(); let total = 0;
    for (const share of project.shares) {
      exact(share, ['teamId', 'pct'], 'share');
      if (!teams.has(share.teamId) || seen.has(share.teamId) || !Number.isFinite(share.pct) || share.pct <= 0 || share.pct > 100) fail('Invalid team allocation.');
      seen.add(share.teamId); total += share.pct;
    }
    if (total > 100.00001) fail('Team shares must total at most 100%.');
  });
  const projects = new Set(input.projects.map(project => project.id));
  recordArray(input.transactions, 'transaction', tx => {
    const keys=['id', 'date', 'description', 'type', 'amount', 'projectId', 'status', 'teamId', 'payee', 'notes', 'proofIds', 'linkedInvoiceId', 'source'];
    if(keys.some(key=>!(key in tx))||Object.keys(tx).some(key=>![...keys,'companyOnly'].includes(key))||(tx.companyOnly!==undefined&&(typeof tx.companyOnly!=='boolean'||tx.type!=='income')))fail('Invalid transaction fields.');
    if (!date(tx.date) || !text(tx.description, 250, true) || !amount(tx.amount) || !['income', 'expense', 'salary'].includes(tx.type)
      || !(tx.type === 'income' ? ['Received', 'Pending'] : ['Paid', 'Pending']).includes(tx.status)
      || !text(tx.payee, 250) || !text(tx.notes, 5000) || !text(tx.source, 100) || !text(tx.linkedInvoiceId, 100)
      || !ids(tx.proofIds) || (tx.projectId !== '' && !projects.has(tx.projectId)) || (tx.teamId !== '' && !teams.has(tx.teamId))) fail('Invalid transaction details.');
  });
  recordArray(input.invoices, 'invoice', invoice => {
    const keys=['id', 'invoiceNo', 'projectId', 'description', 'amount', 'issuedDate', 'dueDate', 'status', 'notes', 'proofIds', 'templateId', 'period', 'source'];
    if(keys.some(key=>!(key in invoice))||Object.keys(invoice).some(key=>![...keys,'items','companyOnly'].includes(key))||(invoice.companyOnly!==undefined&&typeof invoice.companyOnly!=='boolean'))fail('Invalid invoice fields.');
    if(invoice.items!==undefined){
      if(!Array.isArray(invoice.items)||!invoice.items.length||invoice.items.length>24)fail('An invoice requires 1–24 services.');
      let total=0;
      for(const item of invoice.items){exact(item,['description','quantity','unit','rate'],'invoice service');if(!text(item.description,300,true)||!text(item.unit,12,true)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>1000000||!amount(item.rate))fail('Invalid invoice service.');total+=Math.round((item.quantity*item.rate+Number.EPSILON)*100)/100;}
      if(Math.abs(Math.round(total*100)-Math.round(invoice.amount*100))>0)fail('Invoice services must match the invoice total.');
    }
    if (!text(invoice.invoiceNo, 100, true) || !projects.has(invoice.projectId) || !text(invoice.description, 250, true) || !amount(invoice.amount)
      || !date(invoice.issuedDate) || (invoice.dueDate !== '' && !date(invoice.dueDate)) || !['Paid', 'Pending', 'Sent', 'Draft', 'Cancelled'].includes(invoice.status)
      || !text(invoice.notes, 5000) || !ids(invoice.proofIds) || !text(invoice.templateId, 100) || !text(invoice.period, 7) || !text(invoice.source, 100)) fail('Invalid invoice details.');
  });
  if (new Set(input.invoices.map(invoice => invoice.invoiceNo.toLowerCase())).size !== input.invoices.length) fail('Invoice numbers must be unique.');
  recordArray(input.recurringTemplates, 'monthly plan', plan => {
    const keys = ['id', 'projectId', 'title', 'amount', 'dayOfMonth', 'startDate', 'notes', 'enabled'];
    const allowed = [...keys, 'createdAt'];
    object(plan, 'plan');
    if (Object.keys(plan).some(key => !allowed.includes(key)) || keys.some(key => !(key in plan))) fail('Invalid monthly plan fields.');
    if (!projects.has(plan.projectId) || !text(plan.title, 250, true) || !amount(plan.amount) || !Number.isInteger(plan.dayOfMonth)
      || plan.dayOfMonth < 1 || plan.dayOfMonth > 28 || !date(plan.startDate) || !text(plan.notes, 5000) || typeof plan.enabled !== 'boolean'
      || (plan.createdAt !== undefined && !text(plan.createdAt, 40))) fail('Invalid monthly plan.');
  });
  exact(input.settings, ['businessName', 'businessEmail', 'businessAddress', 'businessPhone', 'currency'], 'settings');
  const settings = input.settings;
  if (!text(settings.businessName, 150, true) || !text(settings.businessEmail, 320) || !text(settings.businessAddress, 2000) || !text(settings.businessPhone, 80) || settings.currency !== 'INR') fail('Invalid business details.');
  return structuredClone(input);
}

export function validateInvoiceTemplate(template){
  const limits={sellerName:150,sellerAddress:180,sellerPhone:60,sellerEmail:160,clientName:120,clientPhone:60,clientAddress:180,terms:2000,upiId:100,payeeName:100,signatoryName:100};
  exact(template,[...Object.keys(limits),'logoDataUrl','signatureDataUrl'],'invoice template');
  for(const [key,max]of Object.entries(limits))if(!text(template[key],max,['sellerName','clientName'].includes(key)))fail('Invalid invoice template details.');
  if(template.upiId&&!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(template.upiId))fail('Invalid UPI payment ID.');
  for(const key of ['logoDataUrl','signatureDataUrl'])if(template[key]!==''&&!(key==='logoDataUrl'&&template[key]==='/icon.png')&&!(typeof template[key]==='string'&&template[key].length<=200000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(template[key])))fail('Invoice images must be embedded PNG or JPEG files.');
}

export function buildTeamView(state, teamId) {
  const team = state.teams.find(item => item.id === teamId);
  if (!team) return null;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const assigned = state.projects.filter(project => project.teamIds?.includes(teamId)||project.shares.some(share => share.teamId === teamId));
  const projectIds = new Set(assigned.map(project => project.id));
  const payouts = state.transactions.filter(tx => tx.type === 'salary' && tx.teamId === teamId && projectIds.has(tx.projectId));
  return {
    team,
    projects: assigned.map(project => {
      const share = calculateProjectMetrics(state, project.id).shares.find(share => share.teamId === teamId);
      const paid = share?.paid ?? round(payouts.filter(tx => tx.projectId === project.id && tx.status === 'Paid').reduce((total, tx) => total + tx.amount, 0));
      const allotted = share?.allotted || 0;
      return { id: project.id, name: project.name, client: project.client, status: project.status, allotted, paid, remaining: round(Math.max(0, allotted - paid)) };
    }),
    payouts: payouts.map(({ id, date, description, amount, projectId, status, teamId: assignedTeam, payee, proofIds }) => ({ id, date, description, amount, projectId, status, teamId: assignedTeam, payee, proofIds })),
  };
}

export function proofTeams(state, proofId) {
  return state.teams.filter(team => state.transactions.some(tx => tx.type === 'salary' && tx.teamId === team.id && tx.proofIds.includes(proofId)
    && state.projects.some(project => project.id === tx.projectId && (project.teamIds?.includes(team.id)||project.shares.some(share => share.teamId === team.id))))).map(team => team.id);
}

export function validateMember(input) {
  object(input, 'member');
  if (Object.keys(input).some(key => !['uid', 'name', 'email', 'teamId', 'password', 'active', 'requestId'].includes(key))) fail('Invalid member fields.');
  if (!text(input.name, 100, true) || !text(input.email, 320, true) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
    || !ID.test(input.teamId || '') || typeof input.active !== 'boolean') fail('Enter a member name, valid email and team.');
  if ((!input.uid && !input.password) || (input.password && (!text(input.password, 128) || input.password.length < 8))) fail('Use a password between 8 and 128 characters.');
  if (input.uid && !ID.test(input.uid)) fail('Invalid member ID.');
  if (!input.uid && !ID.test(input.requestId || '')) fail('Missing account request ID.');
  return { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase() };
}

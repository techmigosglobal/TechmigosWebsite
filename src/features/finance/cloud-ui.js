function isFinanceAdmin(){return window.TechmigosFinanceAuth.currentUser()?.role==='admin'}
function cloudError(error){toast(error.message||'Unable to connect. Try again.');const status=$('#cloudStatus');if(status)status.textContent='Connection needs attention'}
async function reloadCloud(){
  if(ui.cloudBusy)return;
  ui.cloudBusy=true;
  try{const payload=await window.FinanceBackend.load();
    if(isFinanceAdmin()){state=payload.state;ui.revision=payload.revision;ui.members=await window.FinanceBackend.members()}
    else ui.memberView=payload.view;
    ui.pendingCloud=false;render();
  }finally{ui.cloudBusy=false}
}
async function bootFinance(){
  if(!await window.TechmigosFinanceAuth.requireSession())return;
  try{
    await reloadCloud();
    if(isFinanceAdmin()&&await generateRecurring(false)){await saveState();render()}
    window.FinanceBackend.subscribe(meta=>{
      if(!meta)return;
      if(!isFinanceAdmin()){ui.memberView=meta;render();return}
      if(meta.revision===ui.revision)return;
      ui.pendingCloud=true;
      if(!ui.cloudBusy&&!ui.saving&&!$('#modalHost .modal-wrap'))reloadCloud().catch(cloudError);
    },cloudError);
  }catch(error){$('#app').innerHTML='<main class="main"><div class="panel" style="padding:24px"><h1>Unable to open finance</h1><p id="bootError"></p><button class="btn primary" onclick="location.reload()">Try again</button> <a class="btn" href="/login">Return to login</a></div></main>';$('#bootError').textContent=error.message}
}
window.addEventListener('finance-profile-updated',()=>{if($('#mainContent'))render()});
function renderTeams(){
  const members=ui.members||[];
  return `${pageHeader('Teams','Manage team names, members and their login access.',`<button class="btn primary" data-act="add-team">${icon('plus')} Add Team</button>`)}
  <div class="project-list">${state.teams.map(t=>{
    const people=members.filter(m=>m.teamId===t.id),assigned=state.projects.filter(p=>p.teamIds?.includes(t.id)||p.shares.some(s=>s.teamId===t.id));
    return `<article class="project-card"><div class="flex-between"><h2 class="section-title">${esc(t.name)}</h2><div class="btn-stack"><button class="btn small" data-act="edit-team" data-id="${esc(t.id)}">Rename</button><button class="btn danger small" data-act="delete-team" data-id="${esc(t.id)}">Remove</button></div></div><p class="note">${assigned.length} assigned projects · ${people.filter(m=>m.active).length} active members</p>
      ${people.map(m=>`<div class="list-row"><div><strong>${esc(m.name)}</strong><div class="second-line">${esc(m.email)} · ${m.active?'Active':'Disabled'}${m.role==='admin'?' · Administrator':''}</div></div>${m.role==='member'?`<button class="btn small" data-act="edit-member" data-id="${esc(m.uid)}">Edit access</button>`:''}</div>`).join('')||'<div class="empty">No members yet. Add a member to create their login.</div>'}
      <div class="space-top btn-stack"><button class="btn primary small" data-act="add-member" data-team="${esc(t.id)}">${icon('plus')} Add member</button><button class="btn small" data-act="assign-team-projects" data-id="${esc(t.id)}">Assign projects</button></div></article>`
  }).join('')||'<div class="empty">Create a team to add members.</div>'}</div>
  <div class="hintbox space-top">Members can view only their assigned team’s projects and payouts. Administrators manage finance records and account access.</div>`;
}
function showTeamProjects(teamId){
  const team=state.teams.find(t=>t.id===teamId);if(!team)return;
  showModal(`Projects for ${esc(team.name)}`,`<div class="modal-content"><form id="teamProjectsForm" data-id="${esc(teamId)}"><div style="max-height:320px;overflow:auto">${state.projects.map(project=>{const shared=project.shares.some(s=>s.teamId===teamId),assigned=shared||project.teamIds?.includes(teamId);return `<label class="list-row"><span>${esc(project.name)}${shared?'<span class="note"> · Assigned through share rules</span>':''}</span><input type="checkbox" name="project_${esc(project.id)}" ${assigned?'checked':''} ${shared?'disabled':''}></label>`}).join('')||'<div class="empty">Create a project first.</div>'}</div><p class="note space-top">Assignments control project visibility. Payout percentages remain in each project’s share settings.</p></form></div><div class="modal-footer"><button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="submit-form" data-form="teamProjectsForm">Save assignments</button></div>`);
}
async function saveTeamProjects(form){
  const teamId=form.dataset.id,values=new FormData(form);
  for(const project of state.projects){const assigned=new Set(project.teamIds||[]);if(values.has(`project_${project.id}`))assigned.add(teamId);else assigned.delete(teamId);project.teamIds=[...assigned]}
  await refresh();toast('Project assignments saved.');
}
function showMemberModal(member=null,teamId=''){
  const m=member||{uid:'',name:'',email:'',teamId,active:true};
  showModal(member?'Edit member access':'Add team member',`<div class="modal-content"><form id="memberForm" data-id="${esc(m.uid)}"><input type="hidden" name="requestId" value="${crypto.randomUUID()}"><div class="form-grid">
    ${field('name','Member name',m.name,'text','required maxlength="100"')}${field('email','Login email',m.email,'email','required autocomplete="off" maxlength="320"')}
    ${selectField('teamId','Assigned team',teamOptions(m.teamId,false),'required')}${field('password',member?'New password (leave blank to keep current)':'Login password','','password',`${member?'':'required'} minlength="8" maxlength="128" autocomplete="new-password"`)}
    <label class="switch span-2"><input type="checkbox" name="active" ${m.active?'checked':''}> Login is active</label>
    </div><p class="note space-top">Use at least 8 characters. Share the login details directly with the member. Saved passwords cannot be viewed.</p><p class="form-error" role="alert"></p></form></div><div class="modal-footer"><button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="submit-form" data-form="memberForm">${member?'Save member':'Create login'}</button></div>`);
}
async function saveMemberForm(form){
  const values=new FormData(form),password=String(values.get('password')||'');
  const member={uid:form.dataset.id||'',name:String(values.get('name')||''),email:String(values.get('email')||''),teamId:String(values.get('teamId')||''),active:values.has('active'),requestId:String(values.get('requestId')||'')};
  if(password)member.password=password;
  await window.FinanceBackend.member(member);
  form.elements.namedItem('password').value='';
  await reloadCloud();ui.didSave=true;toast(member.uid?'Member access saved.':'Member login created.');
}
function memberLayout(){
  const view=ui.memberView||{team:{name:'Your team'},projects:[],payouts:[]},user=window.TechmigosFinanceAuth.currentUser();
  const payoutPage=ui.memberPage==='payouts',title=payoutPage?'Team payouts':'Team projects';
  return `<div class="app"><aside class="sidebar"><div class="logo"><span class="logo-mark">▥</span><span>Techmigos Finance</span></div><nav class="nav"><button data-act="nav-member" data-page="projects" class="${!payoutPage?'active':''}">${icon('projects')}<span>Projects</span></button><button data-act="nav-member" data-page="payouts" class="${payoutPage?'active':''}">${icon('transaction')}<span>Payouts</span></button></nav></aside><div class="content-wrap"><header class="topbar"><div><div class="brand-title">${esc(view.team.name)}</div><div class="crumb">${esc(user.name)} · ${title}</div></div><div class="top-actions"><button class="btn small" data-act="logout">Logout</button></div></header><main class="main" id="mainContent">${memberContent(view,payoutPage)}</main></div><nav class="mobile-nav"><button data-act="nav-member" data-page="projects">${icon('projects')}Projects</button><button data-act="nav-member" data-page="payouts">${icon('transaction')}Payouts</button></nav></div>`;
}
function memberContent(view,payoutPage){
  if(!payoutPage)return `${pageHeader('Your team’s projects','Project assignments and payouts for your team.')}<div class="project-list">${view.projects.map(p=>`<article class="project-card"><h2 class="section-title">${esc(p.name)}</h2><p class="note">${esc(p.client)} · ${esc(p.status)}</p><div class="mini-stats"><div><small>Entitled</small><strong>${money(p.allotted)}</strong></div><div><small>Paid</small><strong>${money(p.paid)}</strong></div><div><small>Remaining</small><strong>${money(p.remaining)}</strong></div></div></article>`).join('')||'<div class="empty">No projects assigned yet. Ask an administrator to configure your team’s project allocation.</div>'}</div>`;
  const selected=view.payouts.find(p=>p.id===ui.selectedTxId);
  return `${pageHeader('Your team’s payouts','Payments recorded for your assigned team.')}<section class="panel"><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Project</th><th>Description</th><th>Amount</th><th>Status</th><th>Proof</th></tr></thead><tbody>${view.payouts.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${esc(view.projects.find(x=>x.id===p.projectId)?.name||'Project')}</td><td>${esc(p.description)}</td><td>${money(p.amount)}</td><td>${statusLabel(p.status)}</td><td>${p.proofIds.length?`<button class="btn small" data-act="member-proof" data-id="${esc(p.id)}">Preview</button>`:'No proof attached'}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">No payouts recorded for your team yet.</div></td></tr>'}</tbody></table></div></section>${selected?`<section class="panel space-top" style="padding:20px"><h2 class="section-title">Proof Preview</h2><div id="proofArea"></div></section>`:''}`;
}
async function memberAction(node){
  const act=node.dataset.act;
  if(act==='logout'){await window.TechmigosFinanceAuth.signOut();return}
  if(act==='nav-member'){ui.memberPage=node.dataset.page;ui.selectedTxId=null;render();return}
  if(act==='member-proof'){ui.selectedTxId=node.dataset.id;ui.selectedProofId=null;render();await renderMemberProof();return}
  if(act==='select-proof'){ui.selectedProofId=node.dataset.id;await renderMemberProof();return}
  if(['open-proof','download-proof'].includes(act))await proofAction(act,node.dataset.id);
}
async function renderMemberProof(){
  const payout=ui.memberView?.payouts.find(p=>p.id===ui.selectedTxId);if(!payout)return;
  state.transactions=[{...payout,type:'salary',notes:'',source:''}];await renderProofArea();
  $$('#proofArea [data-act="remove-proof"]').forEach(button=>button.remove());
}
async function resetCloudData(){
  const initial=await window.FinanceBackend.initial();if(!initial)throw new Error('The initial backup is unavailable.');
  state=initial;await saveState();
  const proofs=await proofOp('all');for(const proof of proofs)await proofOp('delete',proof.id);
  ui.selectedTxId=null;ui.page='dashboard';render();toast('Original imported data restored.');
}
async function restoreCloudBackup(file){
  let payload;
  try{payload=JSON.parse(await file.text());if(payload.format!=='TechmigosFinanceBackup-v1'||payload.state?.version!==4||!Array.isArray(payload.proofs)||!['teams','projects','transactions','invoices','recurringTemplates'].every(key=>Array.isArray(payload.state[key]))||!payload.state.settings)throw new Error()}
  catch{toast('Invalid backup file. Select a Techmigos Finance full JSON backup.');return}
  if(!confirm('Replace the shared finance records with this backup? Export a current backup first.'))return;
  const previous=await proofOp('all'),mapping=new Map();
  for(const proof of payload.proofs){
    if(!/^data:[^;,]+;base64,[a-zA-Z0-9+/=\s]*$/.test(proof.dataUrl||''))throw new Error('The backup includes an invalid proof file.');
    const blob=await(await fetch(proof.dataUrl)).blob(),id=uid('proof');
    await proofOp('put',{id,name:proof.name,mime:blob.type,blob});mapping.set(proof.id,id);
  }
  for(const record of [...payload.state.transactions,...payload.state.invoices])record.proofIds=(record.proofIds||[]).map(id=>mapping.get(id)||id);
  state=payload.state;await saveState();
  for(const proof of previous)await proofOp('delete',proof.id);
  ui.page='dashboard';ui.selectedTxId=null;closeModal();render();toast('Backup restored successfully.');
}

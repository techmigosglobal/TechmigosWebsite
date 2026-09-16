(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const api = () => window.TechMigosAPI || {};
  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const toast = (message) => {
    const stack = $('#toast-stack'); if (!stack) return;
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; stack.append(el);
    setTimeout(() => el.remove(), 3000);
  };
  const openDrawer = id => document.getElementById(id)?.classList.add('open');
  const closeDrawer = id => document.getElementById(id)?.classList.remove('open');
  const floatingSelectors = '.context-menu,.filter-popover,.notifications-popover,.help-popover,.profile-menu';
  const closeFloating = () => {
    $$(floatingSelectors).forEach(node => node.remove());
    $$('[data-action="toggle-notifications"],[data-action="open-help"],[data-action="profile-menu"]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
  };
  const syncDesktopSidebar = () => {
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    const toggle = $('.sidebar-toggle');
    toggle?.setAttribute('aria-expanded', String(!collapsed));
    toggle?.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
  };
  const syncMobileSidebar = () => {
    const open = document.body.classList.contains('mobile-nav-open');
    $('.mobile-menu')?.setAttribute('aria-expanded', String(open));
    $('.mobile-menu')?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  const setSidebarState = collapsed => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    syncDesktopSidebar();
  };
  const setMobileSidebarState = open => {
    document.body.classList.toggle('mobile-nav-open', open);
    syncMobileSidebar();
  };
  const setNotificationCount = value => {
    const badge = $('#notification-count');
    if (!badge) return;
    const count = Math.max(0, Number(value) || 0);
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.hidden = count === 0;
  };
  const positionFloating = (node, anchor) => {
    const r = anchor.getBoundingClientRect();
    const width = parseFloat(getComputedStyle(node).width) || 180;
    node.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, r.right - width))}px`;
    node.style.top = `${Math.min(innerHeight - node.offsetHeight - 8, r.bottom + 6)}px`;
  };

  document.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) {
      if (!e.target.closest('.context-menu,.filter-popover')) closeFloating();
      return;
    }
    const action = actionEl.dataset.action;
    if (action === 'toggle-sidebar') {
      if (innerWidth <= 900) setMobileSidebarState(!document.body.classList.contains('mobile-nav-open'));
      else setSidebarState(!document.body.classList.contains('sidebar-collapsed'));
    }
    if (action === 'toggle-notifications') toggleNotifications(actionEl);
    if (action === 'open-help') toggleHelp(actionEl);
    if (action === 'profile-menu') toggleProfileMenu(actionEl);
    if (action === 'sign-out') await signOut(actionEl);
    if (action === 'open-drawer') openDrawer(actionEl.dataset.target);
    if (action === 'close-drawer') closeDrawer(actionEl.dataset.target);
    if (action === 'close-detail') $('#file-detail')?.classList.remove('open');
    if (action === 'toggle-switch') {
      actionEl.classList.toggle('on');
      toast(actionEl.classList.contains('on') ? 'Setting enabled' : 'Setting disabled');
    }
    if (action === 'toggle-permission') {
      actionEl.classList.toggle('selected');
    }
    if (action === 'filter-menu') showFilterMenu(actionEl);
    if (action === 'row-menu') showRowMenu(actionEl);
    if (action === 'trigger-upload') $('#file-input')?.click();
    if (action === 'new-folder') createFolder();
    if (action === 'open-folder') openFolder(actionEl.dataset.folder, actionEl.textContent);
    if (action === 'select-file') selectFile(actionEl);
    if (action === 'copy-link') {
      await navigator.clipboard?.writeText(location.href + '#file=' + encodeURIComponent($('#detail-file-name')?.textContent || ''));
      toast('Share link copied');
    }
    if (action === 'lock-file') {
      actionEl.classList.toggle('active');
      toast(actionEl.classList.contains('active') ? 'File locked' : 'File unlocked');
    }
    if (action === 'download-file') downloadDemoFile();
    if (action === 'send-reply') await sendReply();
    if (action === 'save-settings') await saveSettings();
    if (action === 'edit-card') {
      actionEl.closest('.settings-card')?.querySelectorAll('input,select,textarea').forEach(x => x.removeAttribute('disabled'));
      toast('Edit mode enabled');
    }
    if (action === 'add-integration') toast('Integration manager is ready for provider configuration.');
    if (action === 'export-report') exportCSV();
  });

  function toggleNotifications(anchor) {
    if ($('.notifications-popover')) { closeFloating(); return; }
    closeFloating();
    const count = $('#notification-count')?.textContent?.trim() || '0';
    const summary = $('#dashboard-ticket-summary')?.textContent?.trim() || (count === '0' ? 'No new workspace alerts.' : `${count} workspace alerts need review.`);
    const popover = document.createElement('div');
    popover.className = 'notifications-popover';
    const isAdmin = document.body.dataset.crmRole === 'company_admin';
    popover.innerHTML = `<strong>Workspace notifications</strong><p>${escapeHtml(summary)}</p>${isAdmin ? '<a href="/company/support">Review support queue</a>' : '<small>Support notifications are managed by company admins.</small>'}`;
    document.body.append(popover);
    positionFloating(popover, anchor);
    anchor.setAttribute('aria-expanded', 'true');
  }

  function toggleHelp(anchor) {
    if ($('.help-popover')) { closeFloating(); return; }
    closeFloating();
    const popover = document.createElement('div');
    popover.className = 'help-popover';
    popover.innerHTML = '<strong>Need help?</strong><p>Contact TechMigos support for workspace access or account questions.</p><a href="/contact">Contact support</a>';
    document.body.append(popover);
    positionFloating(popover, anchor);
    anchor.setAttribute('aria-expanded', 'true');
  }

  function toggleProfileMenu(anchor) {
    if ($('.profile-menu')) { closeFloating(); return; }
    closeFloating();
    const name = $('[data-profile-name]')?.textContent?.trim() || 'Company user';
    const role = $('[data-profile-role]')?.textContent?.trim() || 'Company account';
    const isAdmin = document.body.dataset.crmRole === 'company_admin';
    const popover = document.createElement('div');
    popover.className = 'profile-menu';
    popover.innerHTML = `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(role)}</small>${isAdmin ? '<a href="/company/settings">Workspace settings</a>' : ''}<button type="button" data-action="sign-out">Sign out</button>`;
    document.body.append(popover);
    positionFloating(popover, anchor);
    anchor.setAttribute('aria-expanded', 'true');
  }

  async function signOut(button) {
    try {
      if (!window.tmSupabase) throw new Error('Auth client is not ready. Please refresh the page.');
      button.disabled = true;
      const { error } = await window.tmSupabase.auth.signOut();
      if (error) throw error;
      window.location.replace('/login');
    } catch (error) {
      button.disabled = false;
      toast(error.message || 'Could not sign out.');
    }
  }

  function showFilterMenu(anchor) {
    closeFloating();
    const card = anchor.closest('.table-card'); if (!card) return;
    const pop = document.createElement('div'); pop.className='filter-popover';
    pop.innerHTML=`<h4>Quick filters</h4><label><input type="radio" name="quick-filter" value="all" checked> Show all records</label><label><input type="radio" name="quick-filter" value="active"> Active / open only</label><label><input type="radio" name="quick-filter" value="completed"> Completed / resolved</label><label><input type="radio" name="quick-filter" value="attention"> Needs attention</label>`;
    document.body.append(pop); positionFloating(pop, anchor);
    pop.addEventListener('change', ev => {
      const v=ev.target.value;
      $$('tbody tr[data-status]', card).forEach(row => {
        const s=row.dataset.status;
        const visible = v==='all' || (v==='active' && !['inactive','completed','closed','resolved'].includes(s)) || (v==='completed' && ['completed','resolved','closed'].includes(s)) || (v==='attention' && ['at risk','open','pending','inactive'].includes(s));
        row.style.display=visible?'':'none';
      });
    });
  }

  function showRowMenu(anchor) {
    closeFloating();
    const row=anchor.closest('tr'); if(!row)return;
    const menu=document.createElement('div'); menu.className='context-menu';
    menu.innerHTML='<button data-cmd="view">View details</button><button data-cmd="edit">Edit</button><button data-cmd="duplicate">Duplicate</button><button class="danger" data-cmd="archive">Archive</button>';
    document.body.append(menu); positionFloating(menu, anchor);
    menu.addEventListener('click', async ev => {
      const cmd=ev.target.dataset.cmd; if(!cmd)return;
      if(cmd==='view') toast('Opening record details');
      if(cmd==='edit') {
        if($('#project-drawer')) openDrawer('project-drawer');
        else if($('#user-drawer')) openDrawer('user-drawer');
        toast('Edit mode opened');
      }
      if(cmd==='duplicate') toast('Create a new record from the workspace form.');
      if(cmd==='archive') {
        const id=row.dataset.ticket || row.dataset.recordId;
        const resource=location.pathname.includes('/users') ? 'profiles' : 'projects';
        try { if (!id) throw new Error('This record has no database id.'); await api().archiveRecord?.(resource, id); row.remove(); toast('Record archived'); } catch(err){ toast(err.message || 'Could not archive record'); }
      }
      menu.remove();
    });
  }

  function createFolder() {
    const name=prompt('Folder name'); if(!name)return;
    const grid=$('#folder-grid'); if(!grid)return;
    const node=document.createElement('button'); node.className='folder-card'; node.dataset.action='open-folder'; node.dataset.folder=name.toLowerCase(); node.style.textAlign='left';
    node.innerHTML=`<div class="folder-shape"></div><strong>${escapeHtml(name)}</strong><small>0 items</small>`; grid.append(node); toast(`Folder “${name}” created`);
  }
  function openFolder(key, label='Folder') {
    $$('[data-folder-nav] button').forEach(x=>x.classList.toggle('active',x.dataset.folder===key));
    if($('.files-heading h1')) $('.files-heading h1').textContent=String(label).replace(/\d+/g,'').trim();
    toast(`Opened ${key || 'folder'}`);
  }

  // Search
  $('#global-search')?.addEventListener('input', e => filterRows(e.target.value));
  $('#user-search')?.addEventListener('input', e => filterRows(e.target.value, '#users-table'));
  function filterRows(value, scope='table') {
    const q=value.trim().toLowerCase();
    $$(`${scope} tbody tr[data-row-search]`).forEach(row => row.style.display=!q||row.dataset.rowSearch.toLowerCase().includes(q)?'':'none');
  }

  // Status tabs
  $$('[data-filter-group]').forEach(group => group.addEventListener('click', e => {
    const tab=e.target.closest('.tab'); if(!tab)return;
    $$('.tab',group).forEach(x=>x.classList.toggle('active',x===tab));
    const value=tab.dataset.value; const table=group.closest('.table-card')?.querySelector('table'); if(!table)return;
    $$('tbody tr[data-status]',table).forEach(row=>{
      let match=value==='all'||row.dataset.status===value;
      if(value==='active')match=!['inactive','completed','closed','resolved'].includes(row.dataset.status);
      row.style.display=match?'':'none';
    });
  }));

  // Generic non-filter tabs
  $$('.tabs:not([data-filter-group])').forEach(group=>group.addEventListener('click',e=>{
    const tab=e.target.closest('.tab'); if(!tab)return;
    $$('.tab',group).forEach(x=>x.classList.toggle('active',x===tab));
  }));

  // Project view toggle
  $$('[data-project-view]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('[data-project-view]').forEach(x=>x.classList.toggle('active',x===btn));
    $('#projects-table')?.classList.toggle('card-view',btn.dataset.projectView==='grid');
  }));

  // Project creation
  $('#project-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form));
    data.client = form.querySelector('[name="client_id"] option:checked')?.textContent?.trim() || '';
    try {
      await api().createProject?.(data);
      appendProject(data); form.reset(); closeDrawer('project-drawer'); toast(`Project “${data.name}” created`);
    } catch(err) { toast(err.message || 'Could not create project'); }
  });
  function appendProject(p) {
    const tbody=$('#projects-table tbody'); if(!tbody||!p?.name)return;
    const row=document.createElement('tr'); row.dataset.rowSearch=`${p.name} ${p.code} ${p.client} ${p.status}`; row.dataset.status=(p.status||'Planning').toLowerCase();
    row.innerHTML=`<td><div class="project-cell"><div class="project-thumb">P</div><div class="cell-stack"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.code||'TMG-NEW')}</small></div></div></td><td><span class="client-pill"><span class="client-initial">${escapeHtml((p.client||'C')[0])}</span>${escapeHtml(p.client||'Client')}</span></td><td><div class="progress-cell"><div class="bar"><span style="width:0%"></span></div><span>0%</span></div></td><td><span class="status-pill slate">${escapeHtml(p.status||'Planning')}</span></td><td><div class="team-stack"><span class="avatar avatar-sm avatar-tone-1">TM</span></div></td><td>$${Number(p.budget||0).toLocaleString()}</td><td>${escapeHtml(p.endDate||'—')}</td><td><button class="ellipsis" data-action="row-menu">•••</button></td>`;
    tbody.prepend(row);
  }

  // User creation
  $('#user-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form));
    try {
      await api().createUser?.(data);
      appendUser(data); form.reset(); closeDrawer('user-drawer'); toast(`User “${data.name}” created`);
    } catch(err) { toast(err.message || 'Could not create user'); }
  });
  function appendUser(u) {
    const tbody=$('#users-table tbody'); if(!tbody||!u?.name)return;
    const initials=u.name.split(' ').map(x=>x[0]).slice(0,2).join(''); const row=document.createElement('tr'); row.dataset.status=(u.status||'Active').toLowerCase(); row.dataset.rowSearch=`${u.name} ${u.email} ${u.role} ${u.company}`;
    row.innerHTML=`<td><div class="user-cell"><span class="avatar avatar-md avatar-tone-2">${escapeHtml(initials)}</span><div class="cell-stack"><strong>${escapeHtml(u.name)}</strong><small>${escapeHtml(u.email)}</small></div></div></td><td><span class="role-chip">${escapeHtml(u.role)}</span></td><td><span class="client-pill"><span class="company-dot">${escapeHtml((u.company||'T')[0])}</span>${escapeHtml(u.company||'TechMigos')}</span></td><td><span class="status-pill green">● ${escapeHtml(u.status||'Active')}</span></td><td>Just now</td><td><button class="ellipsis" data-action="row-menu">•••</button></td>`;
    tbody.prepend(row);
  }
  // File view/sort/upload/preview
  $$('[data-file-view]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('[data-file-view]').forEach(x=>x.classList.toggle('active',x===btn));
    $('#file-grid')?.classList.toggle('list-view',btn.dataset.fileView==='list');
  }));
  $('#file-sort')?.addEventListener('change',e=>{
    const grid=$('#file-grid'); if(!grid)return; const cards=$$('.file-card',grid);
    cards.sort((a,b)=> e.target.value==='Name' ? a.dataset.file.localeCompare(b.dataset.file) : e.target.value==='Size' ? parseFloat(a.dataset.size)-parseFloat(b.dataset.size) : 0);
    cards.forEach(c=>grid.append(c));
  });
  const input=$('#file-input'), drop=$('#dropzone');
  input?.addEventListener('change',()=>handleFiles(input.files));
  drop?.addEventListener('click',e=>{if(!e.target.closest('button'))input?.click();});
  ['dragenter','dragover'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>drop?.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag');}));
  drop?.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
  async function handleFiles(fileList) {
    if(!fileList?.length)return;
    for(const file of [...fileList]) {
      try { await api().uploadFile?.(file,window.__TECHMIGOS_DEFAULT_PROJECT_ID__); addFileCard(file); } catch(err){ toast(`${file.name}: ${err.message||'upload failed'}`); }
    }
    toast(`${fileList.length} file${fileList.length>1?'s':''} added to the project`);
  }
  function addFileCard(file) {
    const grid=$('#file-grid'); if(!grid)return; const ext=(file.name.split('.').pop()||'FILE').toUpperCase(); const btn=document.createElement('button'); btn.className='file-card'; btn.dataset.action='select-file'; btn.dataset.file=file.name; btn.dataset.type=ext; btn.dataset.size=(file.size/1024/1024).toFixed(1)+' MB';
    btn.innerHTML=`<span class="ellipsis">•••</span><div class="file-visual ${ext==='PDF'?'pdf':ext==='ZIP'?'zip':ext.includes('DOC')?'doc':''}"></div><strong>${escapeHtml(file.name)}</strong><small>${ext} · ${btn.dataset.size}</small>`; grid.prepend(btn);
  }
  async function selectFile(btn) {
    $$('.file-card').forEach(x=>x.classList.toggle('selected',x===btn)); const detail=$('#file-detail'); detail?.classList.add('open'); if(detail) detail.dataset.fileId=btn.dataset.fileId || ''; 
    const name=btn.dataset.file||'Selected file',type=btn.dataset.type||'FILE',size=btn.dataset.size||'';
    if($('#detail-file-name'))$('#detail-file-name').textContent=name; if($('#detail-type'))$('#detail-type').textContent=type; if($('#detail-size'))$('#detail-size').textContent=size;
    const preview=$('#detail-preview');
    if (preview) {
      preview.src=name.includes('brand')?'/techmigos-ops/assets/brand-preview.png':'/techmigos-ops/assets/file-preview.png';
      if (btn.dataset.fileId && ['PNG','JPG','JPEG','WEBP','PDF'].includes(type)) {
        try { const url=await api().downloadProjectFile?.(btn.dataset.fileId); if (url && type !== 'PDF') preview.src=url; } catch (error) { console.warn('Could not preview project file:', error); }
      }
    }
  }
  $$('[data-folder-nav] button').forEach(btn=>btn.addEventListener('click',()=>openFolder(btn.dataset.folder,btn.textContent)));

  async function downloadDemoFile() {
    const id=$('#file-detail')?.dataset.fileId;
    if (!id) { toast('Select a live project file first.'); return; }
    try { const url=await api().downloadProjectFile?.(id); if (url) window.open(url, '_blank', 'noopener'); toast('Secure download opened'); } catch (err) { toast(err.message || 'Could not download file'); }
  }

  // Ticket detail navigation and reply
  const ticketRows=()=>$$('#tickets-table tr[data-ticket]');
  ticketRows().forEach(row=>row.addEventListener('click',e=>{if(e.target.matches('input,button'))return;showTicket(row);}));
  $$('[data-ticket-nav]').forEach(btn=>btn.addEventListener('click',()=>{
    const rows=ticketRows(); if(!rows.length)return; let idx=rows.findIndex(r=>r.classList.contains('selected')); if(idx<0)idx=0; idx=(idx+Number(btn.dataset.ticketNav)+rows.length)%rows.length; showTicket(rows[idx]);
  }));
  async function showTicket(row) {
    ticketRows().forEach(x=>x.classList.toggle('selected',x===row)); const id=row.dataset.ticket; const title=row.querySelector('.project-cell small')?.textContent; const requester=row.querySelector('.requester-cell strong')?.textContent;
    if($('#ticket-id'))$('#ticket-id').textContent=id; if($('#ticket-title'))$('#ticket-title').textContent=title; if($('#ticket-summary'))$('#ticket-summary').textContent=`${requester} opened this ticket. Continue the support conversation below.`;
    const thread=$('#message-thread');
    if (!thread) return;
    thread.innerHTML='<p class="empty-state" style="min-height:80px">Loading conversation…</p>';
    try {
      const messages=(await api().listTicketMessages?.(id))?.messages || [];
      thread.innerHTML=messages.length ? messages.map(message => `<div class="message ${message.author_role === 'company_admin' ? 'agent' : ''}"><span class="avatar avatar-sm avatar-tone-1">${escapeHtml(initials(message.author_name))}</span><div><div class="message-meta"><strong>${escapeHtml(message.author_name || 'CRM user')}</strong> · ${escapeHtml(dateLabel(message.created_at))}${message.visibility === 'internal' ? ' · Internal note' : ''}</div><div class="message-bubble">${escapeHtml(message.body)}</div></div></div>`).join('') : '<p class="empty-state" style="min-height:80px">No messages yet.</p>';
    } catch (error) { thread.innerHTML='<p class="empty-state" style="min-height:80px">Conversation unavailable.</p>'; console.warn(error); }
  }
  $$('.reply-tabs button').forEach(btn=>btn.addEventListener('click',()=>{$$('.reply-tabs button').forEach(x=>x.classList.toggle('active',x===btn));if($('#reply-input'))$('#reply-input').placeholder=btn.dataset.replyMode==='note'?'Add a private internal note…':'Type a reply…';}));
  async function sendReply() {
    const input=$('#reply-input'),text=input?.value.trim(); if(!text){toast('Type a reply first');return;}
    const note=$('.reply-tabs button.active')?.dataset.replyMode==='note'; const ticketId=$('#ticket-id')?.textContent||'';
    try {
      await api().replyToTicket?.(ticketId,text,note);
      const thread=$('#message-thread'); const node=document.createElement('div'); node.className='message agent'; node.innerHTML=`<span class="avatar avatar-sm avatar-tone-1">AM</span><div><div class="message-meta"><strong>Alex Morgan</strong> · now ${note?'· Internal note':''}</div><div class="message-bubble">${escapeHtml(text)}</div></div>`; thread?.append(node); input.value=''; thread?.scrollTo({top:thread.scrollHeight,behavior:'smooth'}); toast(note?'Internal note added':'Reply sent');
    } catch(err){toast(err.message||'Could not send reply');}
  }

  // Settings
  $$('[data-settings-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('[data-settings-tab]').forEach(x=>x.classList.toggle('active',x===btn)); const target=btn.dataset.settingsTab; const section=$(`[data-settings-section="${target}"]`); section?.scrollIntoView({behavior:'smooth',block:'center'}); if(!section)toast(`${btn.textContent.trim()} is ready for backend configuration`);
  }));
  async function saveSettings() {
    const payload={savedAt:new Date().toISOString(),toggles:$$('.settings-content .switch').map((x,i)=>({index:i,enabled:x.classList.contains('on')}))};
    try { await api().saveSettings?.(payload); toast('Settings saved'); } catch (err) { toast(err.message || 'Could not save settings'); }
  }

  // Pagination controls are intentionally local until backend pagination is connected.
  $$('.pagination').forEach(p=>p.addEventListener('click',e=>{
    const btn=e.target.closest('button'); if(!btn)return; const n=Number(btn.textContent); if(Number.isFinite(n)&&n>0){$$('button',p).forEach(x=>x.classList.remove('active'));btn.classList.add('active');toast(`Page ${n} selected`);}
  }));

  function exportCSV() {
    const table = $('.table');
    const rows = [['Metric', 'Current', 'Previous', 'Change'], ...$$('tbody tr', table).map(row => $$('td', row).slice(0, 4).map(cell => cell.textContent.trim()))];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'techmigos-report.csv'; a.click(); URL.revokeObjectURL(a.href); toast('CSV report exported');
  }

  // Live CRM hydration. The copied screens start with empty collections and are
  // populated only after the authenticated repository returns authorized data.
  const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const statusLabel = value => ({ planning:'Planning', active:'In Progress', review:'In Review', completed:'Completed', on_hold:'On Hold', cancelled:'Cancelled', open:'Open', pending:'Pending', resolved:'Resolved', closed:'Closed', invited:'Pending', inactive:'Inactive' }[String(value || '').toLowerCase()] || String(value || '—'));
  const statusTone = value => ({ planning:'slate', active:'blue', review:'orange', completed:'green', on_hold:'orange', cancelled:'red', open:'blue', pending:'orange', resolved:'green', closed:'slate', invited:'orange', inactive:'slate' }[String(value || '').toLowerCase()] || 'slate');
  const money = value => Number(value || 0).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 });
  const initials = value => String(value || 'User').split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase();
  const setStat = (label, value, progress) => {
    const card = $$('.stat-card').find(item => $('.stat-label', item)?.textContent?.trim() === label);
    if (!card) return;
    $('.stat-value-row strong', card)?.replaceChildren(document.createTextNode(String(value)));
    if (Number.isFinite(progress)) $('.mini-progress .fill', card)?.style.setProperty('width', `${Math.max(0, Math.min(100, progress))}%`);
  };
  const ratio = (value, total) => total ? Math.round((value / total) * 100) : 0;
  const isSettled = value => ['paid', 'received', 'completed'].includes(String(value || '').toLowerCase());
  const isCollectedRevenue = finance => {
    const type = String(finance.transaction_type || '').toLowerCase();
    return isSettled(finance.status) && ['income', 'revenue', 'invoice'].includes(type);
  };
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const activityMarkup = (item, profilesById = new Map()) => {
    const actor = profilesById.get(String(item.user_id));
    const actorLabel = actor?.name || actor?.email || 'TechMigos';
    const activityLabel = item.summary || `${item.action || 'Activity recorded'} ${item.entity_type || 'CRM record'}`;
    return `<div class="activity"><span class="avatar avatar-sm avatar-tone-1">${escapeHtml(initials(actorLabel))}</span><div><p><strong>${escapeHtml(actorLabel)}</strong> ${escapeHtml(activityLabel)}</p><small>${escapeHtml(dateLabel(item.created_at))}</small></div></div>`;
  };
  const dashboardProjectRows = () => $$('#dashboard-projects tbody tr[data-record-id]');
  const bindDashboardProjectRows = () => {
    dashboardProjectRows().forEach(row => {
      row.tabIndex = 0;
      const openProject = () => { if (row.dataset.recordId) window.location.href = `/company/projects?project=${encodeURIComponent(row.dataset.recordId)}`; };
      row.addEventListener('click', openProject);
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProject(); } });
    });
  };
  const renderProjectRow = (p, compact = false) => {
    const name = p.name || 'Untitled project';
    const status = statusLabel(p.status);
    const client = p.client_name || p.client || 'Unassigned';
    if (compact) return `<tr data-record-id="${escapeHtml(String(p.id || ''))}" data-row-search="${escapeHtml(`${name} ${client} ${status}`)}" data-status="${escapeHtml(String(p.status || ''))}"><td><div class="project-cell"><div class="project-thumb">P</div><div class="cell-stack"><strong>${escapeHtml(name)}</strong><small>#${escapeHtml(String(p.id || ''))}</small></div></div></td><td>${escapeHtml(client)}</td><td><div class="progress-cell"><div class="bar"><span style="width:${Number(p.progress || 0)}%"></span></div><span>${Number(p.progress || 0)}%</span></div></td><td><span class="status-pill ${statusTone(p.status)}">${escapeHtml(status)}</span></td><td>${escapeHtml(dateLabel(p.due_date))}</td></tr>`;
    return `<tr data-record-id="${escapeHtml(String(p.id || ''))}" data-row-search="${escapeHtml(`${name} ${client} ${status}`)}" data-status="${escapeHtml(String(p.status || ''))}"><td><div class="project-cell"><div class="project-thumb">P</div><div class="cell-stack"><strong>${escapeHtml(name)}</strong><small>#${escapeHtml(String(p.id || ''))}</small></div></div></td><td><span class="client-pill"><span class="client-initial">${escapeHtml(initials(client).slice(0,1))}</span>${escapeHtml(client)}</span></td><td><div class="progress-cell"><div class="bar"><span style="width:${Number(p.progress || 0)}%"></span></div><span>${Number(p.progress || 0)}%</span></div></td><td><span class="status-pill ${statusTone(p.status)}">● ${escapeHtml(status)}</span></td><td><div class="team-stack"><span class="avatar avatar-sm avatar-tone-1">TM</span></div></td><td>${money(p.budget)}</td><td>${escapeHtml(dateLabel(p.due_date))}</td><td><button class="ellipsis" data-action="row-menu" aria-label="Project actions">•••</button></td></tr>`;
  };
  const renderUserRow = (u, index) => `<tr data-record-id="${escapeHtml(String(u.id || ''))}" data-status="${escapeHtml(String(u.status || ''))}" data-row-search="${escapeHtml(`${u.name || ''} ${u.email || ''} ${u.role || ''}`)}"><td><div class="user-cell"><span class="avatar avatar-md avatar-tone-${index % 6}">${escapeHtml(initials(u.name))}</span><div class="cell-stack"><strong>${escapeHtml(u.name || 'Unnamed user')}</strong><small>${escapeHtml(u.email || '—')}</small></div></div></td><td><span class="role-chip">${escapeHtml(u.role || '—')}</span></td><td><span class="client-pill"><span class="company-dot">T</span>${u.client_id ? `Client #${escapeHtml(String(u.client_id))}` : 'TechMigos'}</span></td><td><span class="status-pill ${statusTone(u.status)}">● ${escapeHtml(statusLabel(u.status))}</span></td><td>${escapeHtml(dateLabel(u.last_login))}</td><td><button class="ellipsis" data-action="row-menu" aria-label="User actions">•••</button></td></tr>`;
  const renderTicketRow = (t, index) => `<tr data-ticket="${escapeHtml(String(t.id))}" data-status="${escapeHtml(String(t.status || ''))}" data-row-search="${escapeHtml(`${t.id} ${t.subject || ''} ${t.description || ''}`)}"><td><input type="checkbox" /></td><td><div class="project-cell"><div class="stat-icon tone-${index % 2 ? 'green' : 'blue'}" style="margin:0;width:34px;height:34px">✉</div><div class="cell-stack"><strong>#${escapeHtml(String(t.id))}</strong><small>${escapeHtml(t.subject || 'Support request')}</small></div></div></td><td><div class="requester-cell"><span class="avatar avatar-sm avatar-tone-${index % 6}">C</span><div class="cell-stack"><strong>Client #${escapeHtml(String(t.client_id || '—'))}</strong><small>CRM account</small></div></div></td><td>Support</td><td><span class="status-pill ${statusTone(t.priority)}">● ${escapeHtml(t.priority || 'Medium')}</span></td><td><span class="status-pill ${statusTone(t.status)}">${escapeHtml(statusLabel(t.status))}</span></td><td>${escapeHtml(dateLabel(t.created_at))}</td><td><button class="ellipsis" aria-label="Ticket actions">•••</button></td></tr>`;
  const fileType = file => String(file.mime_type || file.original_name || '').split('/').pop().split('.').pop().toUpperCase();
  const renderFileCard = file => `<button class="file-card" data-file-id="${escapeHtml(String(file.id))}" data-file="${escapeHtml(file.original_name || 'File')}" data-type="${escapeHtml(fileType(file))}" data-size="${escapeHtml(String(file.size_bytes || 0))}" data-action="select-file"><span class="ellipsis">•••</span><div class="file-visual"><span>${escapeHtml(fileType(file))}</span></div><strong>${escapeHtml(file.original_name || 'File')}</strong><small>${escapeHtml(fileType(file))} · ${escapeHtml(String(Math.max(1, Math.round(Number(file.size_bytes || 0) / 1024))))} KB</small></button>`;

  async function loadLiveData() {
    const path = location.pathname;
    const context = await (await window.tmCrmReady).repository.getContext();
    const isAdmin = context.role === 'company_admin';
    const projectResponse = await api().list?.('projects');
    const projects = projectResponse?.items || [];
    window.__TECHMIGOS_DEFAULT_PROJECT_ID__ = projects[0]?.id || null;
    if (path === '/company' || path === '/company/') {
      const [tickets, users, finances, activities] = isAdmin
        ? await Promise.all([
          api().list?.('tickets').then(response => response?.items || []),
          api().list?.('profiles').then(response => response?.items || []),
          api().list?.('finances').then(response => response?.items || []),
          api().list?.('activities').then(response => response?.items || []),
        ])
        : [[], [], [], []];
      const table = $('#dashboard-projects tbody');
      if (table) {
        const projectRows = projects.slice(0, 5).map(p => renderProjectRow(p, true)).join('');
        table.innerHTML = projectRows || '<tr><td colspan="5" class="empty-state">No projects are assigned to this workspace.</td></tr>';
      }
      const activity = $('#dashboard-activity');
      const profilesById = new Map(users.flatMap(user => [
        user.id == null ? [] : [[String(user.id), user]],
        user.auth_user_id == null ? [] : [[String(user.auth_user_id), user]],
      ]));
      if (activity) activity.innerHTML = isAdmin
        ? activities.slice(0, 5).map(item => activityMarkup(item, profilesById)).join('') || '<p class="empty-state">No recent activity recorded.</p>'
        : '<p class="empty-state">Activity is available to company admins.</p>';
      const activeProjects = projects.filter(p => ['active', 'review'].includes(p.status)).length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const openTickets = tickets.filter(t => ['open', 'pending'].includes(t.status)).length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const monthlyRevenue = finances
        .filter(finance => isCollectedRevenue(finance) && String(finance.transaction_date || finance.created_at || '').slice(0, 7) === currentMonth)
        .reduce((sum, finance) => sum + Number(finance.amount || 0), 0);
      setStat('Active Projects', activeProjects, ratio(activeProjects, projects.length));
      setStat('Completed', completedProjects, ratio(completedProjects, projects.length));
      setStat('Open Tickets', isAdmin ? openTickets : '—', ratio(openTickets, tickets.length));
      setStat('Active Users', isAdmin ? activeUsers : '—', ratio(activeUsers, users.length));
      setStat('Monthly Revenue', isAdmin ? money(monthlyRevenue) : '—');
      const ticketSummary = $('#dashboard-ticket-summary');
      if (ticketSummary) ticketSummary.textContent = isAdmin ? `${openTickets} open tickets need review` : 'Admin support queue';
      setNotificationCount(isAdmin ? openTickets : 0);
      const status = $('#dashboard-status');
      if (status) status.textContent = `Live data synced ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      bindDashboardProjectRows();
    }
    if (path === '/company/projects') {
      const table = $('#projects-table tbody'); if (table) table.innerHTML = projects.map(p => renderProjectRow(p)).join('');
      setStat('Total Projects', projects.length);
      setStat('Active Projects', projects.filter(p => ['active','review'].includes(p.status)).length);
      setStat('At Risk', projects.filter(p => p.health === 'at_risk').length);
      setStat('Completed', projects.filter(p => p.status === 'completed').length);
    }
    if (path === '/company/analytics') {
      const tickets = isAdmin ? (await api().list?.('tickets'))?.items || [] : [];
      const progressValues = projects.map(project => Number(project.progress)).filter(Number.isFinite);
      const averageProgress = progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : '—';
      setStat('Project Velocity', averageProgress === '—' ? '—' : `${averageProgress}%`);
      setStat('Ticket SLA', tickets.length ? `${Math.round((tickets.filter(ticket => ['resolved', 'closed'].includes(ticket.status)).length / tickets.length) * 100)}%` : '—');
      setStat('Delivery Health', projects.length ? `${Math.round((projects.filter(project => project.health !== 'at_risk').length / projects.length) * 100)}%` : '—');
    }
    if (path === '/company/users') {
      const clientSelect = $('#user-client-id');
      if (clientSelect) {
        const clients = (await api().list?.('clients'))?.items || [];
        clientSelect.replaceChildren(new Option('Company user', ''));
        clients.forEach(client => clientSelect.add(new Option(client.company || client.name || `Client #${client.id}`, String(client.id))));
      }
      const users = (await api().list?.('profiles'))?.items || [];
      const table = $('#users-table tbody'); if (table) table.innerHTML = users.map(renderUserRow).join('');
      setStat('Total Users', users.length); setStat('Active', users.filter(u => u.status === 'active').length); setStat('Admins', users.filter(u => u.role === 'company_admin').length);
    }
    if (path === '/company/support') {
      const tickets = (await api().list?.('tickets'))?.items || [];
      const table = $('#tickets-table tbody'); if (table) table.innerHTML = tickets.map(renderTicketRow).join('');
      setStat('Total Tickets', tickets.length); setStat('Open', tickets.filter(t => ['open','pending'].includes(t.status)).length); setStat('Resolved', tickets.filter(t => ['resolved','closed'].includes(t.status)).length);
      setNotificationCount(tickets.filter(t => ['open', 'pending'].includes(t.status)).length);
      ticketRows().forEach(row => row.addEventListener('click', e => { if (!e.target.matches('input,button')) showTicket(row); }));
      if (ticketRows()[0]) showTicket(ticketRows()[0]);
      else {
        $('#ticket-id')?.replaceChildren(document.createTextNode('No tickets'));
        $('#ticket-title')?.replaceChildren(document.createTextNode('No support tickets found'));
        $('#ticket-summary')?.replaceChildren(document.createTextNode('Tickets created by clients will appear here.'));
        $('#message-thread')?.replaceChildren(document.createTextNode(''));
      }
    }
    if (path === '/company/files') {
      const files = (await api().list?.('project_files'))?.items || [];
      const grid = $('#file-grid'); if (grid) grid.innerHTML = files.map(renderFileCard).join('');
      if ($('#file-count')) $('#file-count').textContent = `${files.length} items`;
      if (files[0]) { const first = grid?.querySelector('.file-card'); if (first) selectFile(first); }
      else $('#file-detail')?.classList.remove('open');
    }
  }

  window.tmCrmReady?.then(() => loadLiveData().catch(error => { console.error(error); toast(error.message || 'Could not load live CRM data.'); }));

  // Sidebar preference + keyboard shortcuts
  if(innerWidth>900) setSidebarState(localStorage.getItem('techmigos.sidebar') === 'collapsed');
  else setMobileSidebarState(false);
  new MutationObserver(()=>{if(innerWidth>900)localStorage.setItem('techmigos.sidebar',document.body.classList.contains('sidebar-collapsed')?'collapsed':'expanded');}).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize', () => {
    if (innerWidth > 900) {
      setMobileSidebarState(false);
      setSidebarState(localStorage.getItem('techmigos.sidebar') === 'collapsed');
    } else {
      setSidebarState(false);
      syncMobileSidebar();
    }
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.nav-item') && innerWidth <= 900) setMobileSidebarState(false);
  });
  addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#global-search')?.focus();}
    if(e.key==='Escape'){closeFloating();$$('.drawer.open').forEach(x=>x.classList.remove('open'));$('.detail-panel.open')?.classList.remove('open');setMobileSidebarState(false);}
  });
})();

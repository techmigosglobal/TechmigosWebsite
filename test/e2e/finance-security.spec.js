import { test, expect } from '@playwright/test';
import { seedEmulators, TEST_PROJECT } from '../../scripts/firebase/emulator-fixture.mjs';
import { financeFixture } from '../fixtures/finance-state.js';

test.beforeEach(async()=>seedEmulators());
async function token(email='vinay@techmigos.com',password='LocalAdmin@12345'){
  const response=await fetch('http://127.0.0.1:9097/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
  const body=await response.json();if(!response.ok)throw Error('Demo sign-in failed');return body.idToken;
}
async function api(data,accessToken){
  const response=await fetch(`http://127.0.0.1:5007/${TEST_PROJECT}/asia-south1/financeApi`,{method:'POST',headers:{'content-type':'application/json',...(accessToken?{authorization:`Bearer ${accessToken}`}:{})},body:JSON.stringify({data})});
  return {status:response.status,body:await response.json()};
}
test('rules deny anonymous access, other teams, raw ledger and profile escalation',async()=>{
  const member=await token('member-one@example.com','Example@123');
  const url=path=>`http://127.0.0.1:8187/v1/projects/${TEST_PROJECT}/databases/(default)/documents/${path}`;
  expect((await fetch(url('finance_transactions/tx-income'))).status).toBe(403);
  for(const path of ['finance_transactions/tx-income','finance_team_views/team-2','finance_users/owner-vinay'])expect((await fetch(url(path),{headers:{authorization:`Bearer ${member}`}})).status).toBe(403);
  expect((await fetch(url('finance_team_views/team-1'),{headers:{authorization:`Bearer ${member}`}})).status).toBe(200);
  expect((await fetch(`${url('finance_users/member-one')}?updateMask.fieldPaths=role`,{method:'PATCH',headers:{authorization:`Bearer ${member}`,'content-type':'application/json'},body:JSON.stringify({fields:{role:{stringValue:'admin'}}})})).status).toBe(403);
  expect((await api({action:'members'},member)).status).toBe(403);
  expect((await api({action:'save',state:financeFixture(),revision:1},member)).status).toBe(403);
  const view=await api({action:'load'},member);
  expect(view.status).toBe(200);expect(view.body.result.state).toBeUndefined();
  expect(view.body.result.view.projects.map(p=>p.id)).toEqual(['p-arish']);
  expect(view.body.result.view.payouts).toHaveLength(1);expect(view.body.result.view.payouts[0].notes).toBeUndefined();
});
test('server validates saves and rejects stale concurrent revisions',async()=>{
  const admin=await token(),state=financeFixture();
  const invalid=structuredClone(state);invalid.transactions[0].amount=-10;
  expect((await api({action:'save',state:invalid,revision:1},admin)).status).toBe(400);
  state.teams[0].name='Renamed team';
  expect((await api({action:'save',state,revision:1},admin)).status).toBe(200);
  expect((await api({action:'save',state:financeFixture(),revision:1},admin)).status).toBe(409);
  const latest=await api({action:'load'},admin);
  expect(latest.body.result.state.teams.find(t=>t.id==='team-1').name).toBe('Renamed team');
});
test('server requires fixed values for new projects and preserves values from older clients',async()=>{
  const admin=await token(),state=financeFixture();
  state.projects.push({id:'new-project',name:'New project',client:'',status:'Active',shares:[]});
  expect((await api({action:'save',state,revision:1},admin)).status).toBe(400);
  state.projects.pop();delete state.projects[0].projectValue;
  const saved=await api({action:'save',state,revision:1},admin);expect(saved.status).toBe(200);expect(saved.body.result.state.projects[0].projectValue).toBe(10000);
  const companyState=saved.body.result.state;companyState.invoices[0].companyOnly=true;companyState.invoices[0].status='Paid';
  const settled=await api({action:'save',state:companyState,revision:2},admin);expect(settled.status).toBe(200);
  const legacy=settled.body.result.state;delete legacy.invoices[0].companyOnly;for(const tx of legacy.transactions)delete tx.companyOnly;
  const preserved=await api({action:'save',state:legacy,revision:3},admin);expect(preserved.status).toBe(200);expect(preserved.body.result.state.invoices[0].companyOnly).toBe(true);expect(preserved.body.result.state.transactions.find(tx=>tx.linkedInvoiceId===legacy.invoices[0].id).companyOnly).toBe(true);
});

test('team administrators appear in their teams and retain full administrator access',async({page})=>{
  for(const [email,password] of [['vinay@techmigos.com','LocalAdmin@12345'],['vishal@techmigos.com','LocalAdmin@67890']]){
    const admin=await token(email,password),loaded=await api({action:'load'},admin);
    expect(loaded.body.result.profile.role).toBe('admin');
    expect(loaded.body.result.state.projects.map(project=>project.id).sort()).toEqual(['p-arish','p-focus']);
    await page.goto('/login');await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.locator('#login-submit').click();
    await expect(page.getByRole('heading',{name:'Dashboard Overview'})).toBeVisible();
    await page.locator('.sidebar [data-page="teams"]').click();
    for(const [teamId,adminEmail] of [['team-1','vinay@techmigos.com'],['team-2','vishal@techmigos.com']]){
      const card=page.locator('.project-card').filter({has:page.locator(`[data-act="edit-team"][data-id="${teamId}"]`)});
      const row=card.locator('.list-row').filter({hasText:adminEmail});
      await expect(row).toContainText('Administrator');await expect(row.getByRole('button',{name:'Edit access'})).toHaveCount(0);
    }
    await expect(page.locator('.list-row').filter({hasText:'member-one@example.com'}).getByRole('button',{name:'Edit access'})).toBeVisible();
    await page.evaluate(async()=>window.TechmigosFinanceAuth.signOut());
    await expect(page).toHaveURL(/\/login\/?$/);
  }
});

test('Teams creates a login, propagates its name and restricts the member workspace',async({page,browser})=>{
  await page.goto('/login');await page.locator('#email').fill('vinay@techmigos.com');await page.locator('#password').fill('LocalAdmin@12345');await page.locator('#login-submit').click();
  await expect(page.getByRole('heading',{name:'Dashboard Overview'})).toBeVisible();
  await page.locator('.sidebar [data-page="teams"]').click();
  await page.locator('[data-act="edit-team"][data-id="team-1"]').click();await page.locator('#modalHost [name="name"]').fill('Delivery group');await page.locator('[data-form="teamForm"]').click();
  await expect(page.getByRole('heading',{name:'Delivery group',exact:true})).toBeVisible();
  await page.locator('[data-act="add-member"][data-team="team-1"]').click();
  await page.locator('#memberForm [name="name"]').fill('Team colleague');await page.locator('#memberForm [name="email"]').fill('colleague@example.com');await page.locator('#memberForm [name="password"]').fill('Colleague@123');
  await page.locator('[data-form="memberForm"]').click();await expect(page.getByText('colleague@example.com',{exact:false})).toBeVisible();
  const context=await browser.newContext(),memberPage=await context.newPage();
  await memberPage.goto(`${process.env.PLAYWRIGHT_BASE_URL}/login`);await memberPage.locator('#email').fill('colleague@example.com');await memberPage.locator('#password').fill('Colleague@123');await memberPage.locator('#login-submit').click();
  await expect(memberPage.getByRole('heading',{name:'Your team’s projects'})).toBeVisible();await expect(memberPage.locator('.brand-title')).toHaveText('Delivery group');
  await expect(memberPage.getByRole('button',{name:'Add Transaction',exact:true})).toHaveCount(0);await expect(memberPage.getByText('Example Beta',{exact:true})).toHaveCount(0);
  await memberPage.locator('.sidebar [data-page="payouts"]').click();await expect(memberPage.getByRole('heading',{name:'Your team’s payouts'})).toBeVisible();
  await page.locator('[data-act="assign-team-projects"][data-id="team-1"]').click();await page.locator('#teamProjectsForm [name="project_p-focus"]').check();await page.locator('[data-form="teamProjectsForm"]').click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await memberPage.locator('.sidebar [data-page="projects"]').click();await expect(memberPage.getByRole('heading',{name:'Example Beta',exact:true})).toBeVisible();
  await page.locator('.list-row').filter({hasText:'colleague@example.com'}).getByRole('button',{name:'Edit access'}).click();
  await page.locator('#memberForm [name="active"]').uncheck();await page.locator('[data-form="memberForm"]').click();
  await expect(memberPage).toHaveURL(/\/login\/?$/);await context.close();
});

test('image, PDF, audio, video and generic proof files preview safely for the assigned team',async({page,browser})=>{
  await page.goto('/login');await page.locator('#email').fill('vinay@techmigos.com');await page.locator('#password').fill('LocalAdmin@12345');await page.locator('#login-submit').click();
  await expect(page.getByRole('heading',{name:'Dashboard Overview'})).toBeVisible();
  const pdf=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await (await buildInvoicePdf(state.invoices[0])).arrayBuffer()))));
  const video=Buffer.from(await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='blue';ctx.fillRect(0,0,64,64);
    const stream=canvas.captureStream(5),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
    return new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())))};recorder.start();setTimeout(()=>{ctx.fillStyle='green';ctx.fillRect(0,0,64,64)},150);setTimeout(()=>recorder.stop(),500)});
  }));
  const wav=Buffer.alloc(1644);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(1600,40);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5H8AAAAASUVORK5CYII=','base64');
  await page.locator('[data-act="add-tx"]').first().click();await page.locator('[data-act="switch-tx-type"][data-type="salary"]').click();
  await page.locator('#transactionForm [name="projectId"]').selectOption('p-arish');await page.locator('#transactionForm [name="teamId"]').selectOption('team-1');await page.locator('#transactionForm [name="amount"]').fill('50');await page.locator('#transactionForm [name="description"]').fill('Media proof check');
  await page.locator('#tx-file').setInputFiles([{name:'receipt.png',mimeType:'image/png',buffer:png},{name:'receipt.pdf',mimeType:'application/pdf',buffer:pdf},{name:'receipt.wav',mimeType:'audio/wav',buffer:wav},{name:'receipt.webm',mimeType:'video/webm',buffer:video},{name:'receipt.txt',mimeType:'text/plain',buffer:Buffer.from('Example proof attachment')},{name:'mislabelled.pdf',mimeType:'text/html',buffer:Buffer.from('<script>parent.document.body.dataset.unsafeProof="executed"</script>')}]);
  await page.locator('[data-form="transactionForm"]').click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.sidebar [data-page="transactions"]').click();await expect(page.locator('#proofArea img')).toBeVisible();
  await page.locator('#proofArea [data-act="select-proof"]').nth(1).click();await expect(page.locator('#proofArea iframe')).toBeVisible();
  await page.locator('#proofArea [data-act="select-proof"]').nth(2).click();await expect(page.locator('#proofArea audio')).toBeVisible();
  await page.locator('#proofArea [data-act="select-proof"]').nth(3).click();await expect(page.locator('#proofArea video')).toBeVisible();
  await page.locator('#proofArea [data-act="select-proof"]').nth(4).click();await expect(page.locator('#proofArea')).toContainText('Preview is unavailable for this file type');
  await page.locator('#proofArea [data-act="select-proof"]').nth(5).click();await expect(page.locator('#proofArea')).toContainText('Preview is unavailable for this file type');await expect(page.locator('#proofArea iframe')).toHaveCount(0);expect(await page.locator('body').getAttribute('data-unsafe-proof')).toBeNull();
  const context=await browser.newContext(),memberPage=await context.newPage();await memberPage.goto(`${process.env.PLAYWRIGHT_BASE_URL}/login`);await memberPage.locator('#email').fill('member-one@example.com');await memberPage.locator('#password').fill('Example@123');await memberPage.locator('#login-submit').click();
  await expect(memberPage.getByRole('heading',{name:'Your team’s projects'})).toBeVisible();await memberPage.locator('.sidebar [data-page="payouts"]').click();await memberPage.locator('tr').filter({hasText:'Media proof check'}).getByRole('button',{name:'Preview'}).click();
  await expect(memberPage.locator('#proofArea img')).toBeVisible();await expect(memberPage.locator('[data-act="remove-proof"]')).toHaveCount(0);await context.close();
});

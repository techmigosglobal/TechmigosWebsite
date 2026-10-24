import fs from 'node:fs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadLocalEnv } from '../local-env.mjs';
import { installTemporaryADC, PROJECT_ID } from './cli-context.mjs';
const config=loadLocalEnv();
if(config.PUBLIC_FIREBASE_PROJECT_ID!==PROJECT_ID)throw Error('Unexpected verification project.');
const require=createRequire(new URL('../../functions/package.json',import.meta.url));
const{initializeApp,applicationDefault}=require('firebase-admin/app');
const{initializeFirestore,FieldValue}=require('firebase-admin/firestore');
const{getAuth}=require('firebase-admin/auth');
const cleanup=installTemporaryADC(),app=initializeApp({projectId:PROJECT_ID,credential:applicationDefault()},'live-finance-verification');
const db=initializeFirestore(app,{preferRest:true}),auth=getAuth(app);
async function signIn(email,password){
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.PUBLIC_FIREBASE_API_KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(60000)});
  const data=await response.json();if(!response.ok)throw Error(`Login failed: ${data.error?.message}`);return data.idToken;
}
async function call(data,token){
  const response=await fetch(`https://asia-south1-${PROJECT_ID}.cloudfunctions.net/financeApi`,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify({data}),signal:AbortSignal.timeout(65000)});
  return {status:response.status,body:await response.json()};
}
function assert(value,message){if(!value)throw Error(message)}
function canonical(value){if(Array.isArray(value))return value.map(canonical).sort((a,b)=>(a?.id||'').localeCompare(b?.id||''));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value}
const results={projectId:PROJECT_ID};let memberUid='',proofId='';
try{
  const admin=await signIn('vinay@techmigos.com',process.env.FINANCE_VINAY_PASSWORD);
  const second=await signIn('vishal@techmigos.com',process.env.FINANCE_VISHAL_PASSWORD);
  assert((await call({action:'load'},second)).status===200,'Vishal cannot load finance.');results.bothFounderLogins=true;
  const loaded=await call({action:'load'},admin);assert(loaded.status===200,'Administrator cannot load finance.');
  const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const comparable=structuredClone(loaded.body.result.state);
  for(const project of comparable.projects)if(!backup.state.projects.find(item=>item.id===project.id)?.invoiceTemplate)delete project.invoiceTemplate;
  assert(JSON.stringify(canonical(comparable))===JSON.stringify(canonical(backup.state)),'Cloud records differ from the current browser backup.');results.exactDataVerified=true;
  assert((await call({action:'load'})).status===401,'Anonymous callable access was not denied.');results.anonymousDenied=true;
  const requestId=randomUUID(),email=`qa-finance-${Date.now()}@example.invalid`,password=`Qa@${randomBytes(16).toString('hex')}`;
  const member=await call({action:'member',member:{name:'Temporary finance verification',email,password,teamId:'team-1',active:true,requestId}},admin);
  assert(member.status===200,'Administrator cannot create a member login.');memberUid=member.body.result.uid;
  assert(memberUid===`fin_${createHash('sha256').update(requestId).digest('hex').slice(0,28)}`,'Unexpected temporary member ID.');
  const memberToken=await signIn(email,password),view=await call({action:'load'},memberToken);
  assert(view.status===200&&!view.body.result.state&&view.body.result.view.team.id==='team-1','Member data is not scoped to their team.');
  assert((await call({action:'members'},memberToken)).status===403,'Member can list other users.');
  assert((await call({action:'save',state:backup.state,revision:loaded.body.result.revision},memberToken)).status===403,'Member can modify the finance ledger.');
  const privateRead=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/finance_transactions/tx-excel-001`,{headers:{authorization:`Bearer ${memberToken}`}});
  assert(privateRead.status===403,'Member can read the raw company ledger.');results.memberLoginAndIsolation=true;
  proofId=`proof-qa-${randomUUID()}`;
  const object=`finance/proofs/${proofId}/file`,bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5H8AAAAASUVORK5CYII=','base64');
  const base=`https://firebasestorage.googleapis.com/v0/b/${config.PUBLIC_FIREBASE_STORAGE_BUCKET}/o`;
  const upload=await fetch(`${base}?uploadType=media&name=${encodeURIComponent(object)}`,{method:'POST',headers:{authorization:`Bearer ${admin}`,'content-type':'image/png'},body:bytes});
  assert(upload.ok,'Proof upload was denied.');
  const registration=await call({action:'registerProof',id:proofId,name:'verification.png'},admin);assert(registration.status===200,'Proof metadata could not be registered.');
  const download=await fetch(`${base}/${encodeURIComponent(object)}?alt=media`,{headers:{authorization:`Bearer ${admin}`,origin:'http://127.0.0.1:4321'}});
  assert(download.ok&&Buffer.from(await download.arrayBuffer()).equals(bytes),'Proof bytes could not be previewed.');
  const denied=await fetch(`${base}/${encodeURIComponent(object)}?alt=media`,{headers:{authorization:`Bearer ${memberToken}`}});assert(denied.status===403,'A member can read an unrelated proof.');
  assert((await call({action:'removeProof',id:proofId},admin)).status===200,'Proof cleanup was denied.');proofId='';results.proofUploadPreviewAndIsolation=true;
  const disabled=await call({action:'member',member:{uid:memberUid,name:'Temporary finance verification',email,teamId:'team-1',active:false}},admin);assert(disabled.status===200,'Member disabling failed.');
  assert((await call({action:'load'},memberToken)).status===403,'Disabled member retains finance access.');results.disabledSessionDenied=true;
  console.log(JSON.stringify(results,null,2));fs.writeFileSync('reports/firebase-finance-live-verification.json',JSON.stringify(results,null,2));
}finally{
  if(memberUid&&memberUid.startsWith('fin_')){
    const profile=(await db.doc(`finance_users/${memberUid}`).get()).data();
    if(profile?.email?.startsWith('qa-finance-')&&profile.email.endsWith('@example.invalid')){await auth.deleteUser(memberUid);await db.doc(`finance_users/${memberUid}`).delete();await db.doc('finance_workspace/main').update({revision:FieldValue.increment(1)})}
  }
  if(proofId){const{getStorage}=require('firebase-admin/storage');const bucket=config.PUBLIC_FIREBASE_STORAGE_BUCKET;await getStorage(app).bucket(bucket).file(`finance/proofs/${proofId}/file`).delete({ignoreNotFound:true});await db.doc(`finance_proofs/${proofId}`).delete()}
  cleanup();
}

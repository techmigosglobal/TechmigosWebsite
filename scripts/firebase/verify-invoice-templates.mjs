import fs from 'node:fs';
import {loadLocalEnv} from '../local-env.mjs';
import {validateState} from '../../functions/domain.js';
import {PROJECT_ID} from './cli-context.mjs';
const config=loadLocalEnv();if(config.PUBLIC_FIREBASE_PROJECT_ID!==PROJECT_ID)throw Error('Unexpected finance project.');
const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function canonical(value){if(Array.isArray(value))return value.map(canonical).sort((a,b)=>(a?.id||'').localeCompare(b?.id||''));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value}
async function login(email,password){const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.PUBLIC_FIREBASE_API_KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok)throw Error('Founder login verification failed.');return data.idToken;}
async function call(data,token){const response=await fetch(`https://asia-south1-${PROJECT_ID}.cloudfunctions.net/financeApi`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({data}),signal:AbortSignal.timeout(65000)});const payload=await response.json();if(!response.ok)throw Error(payload.error?.message||'Finance callable verification failed.');return payload.result;}
const first=await login('vinay@techmigos.com',process.env.FINANCE_VINAY_PASSWORD),second=await login('vishal@techmigos.com',process.env.FINANCE_VISHAL_PASSWORD);
const loaded=await call({action:'load'},first);validateState(loaded.state);
const core=structuredClone(loaded.state);for(const project of core.projects)delete project.invoiceTemplate;
if(JSON.stringify(canonical(core))!==JSON.stringify(canonical(backup.state)))throw Error('Original financial records differ from the migration backup.');
if(loaded.state.projects.some(p=>!p.invoiceTemplate?.signatureDataUrl||p.invoiceTemplate.upiId!=='v5219@slc'))throw Error('Reference templates are missing.');
const saved=await call({action:'save',state:loaded.state,revision:loaded.revision},first),verified=await call({action:'load'},second);
if(verified.revision!==saved.revision||JSON.stringify(canonical(verified.state))!==JSON.stringify(canonical(loaded.state)))throw Error('The saved template round-trip differs.');
const report={projectId:PROJECT_ID,bothFounderLogins:true,originalFinancialDataUnchanged:true,templatesSavedAndReloaded:true,projects:verified.state.projects.length,transactions:verified.state.transactions.length,invoices:verified.state.invoices.length};fs.writeFileSync('reports/firebase-invoice-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

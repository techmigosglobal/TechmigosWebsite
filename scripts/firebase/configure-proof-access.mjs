import { googleRequest, PROJECT_ID } from './cli-context.mjs';
import { loadLocalEnv } from '../local-env.mjs';
const config = loadLocalEnv();
const info = await googleRequest(`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT_ID}/locations/asia-south1/functions/financeApi`);
const resource = `projects/_/buckets/${config.PUBLIC_FIREBASE_STORAGE_BUCKET}/objects/finance/proofs/`;
const member = `serviceAccount:${info.serviceConfig.serviceAccountEmail}`;
const policy = await googleRequest(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:getIamPolicy`,{method:'POST',body:JSON.stringify({options:{requestedPolicyVersion:3}})});
const exists=policy.bindings.some(binding=>binding.role==='roles/storage.objectAdmin'&&binding.members?.includes(member)&&binding.condition?.expression===`resource.name.startsWith('${resource}')`);
if(!exists){
  policy.version=3;
  policy.bindings.push({role:'roles/storage.objectAdmin',members:[member],condition:{title:'FinanceProofManagement',description:'Manage only finance proof objects for the finance backend.',expression:`resource.name.startsWith('${resource}')`}});
  await googleRequest(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:setIamPolicy`,{method:'POST',body:JSON.stringify({policy})});
}
console.log(JSON.stringify({proofAccessConfigured:true,scope:'finance/proofs/',alreadyConfigured:exists}));

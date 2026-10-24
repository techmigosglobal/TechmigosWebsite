import { googleRequest, PROJECT_ID } from './cli-context.mjs';
const functionInfo = await googleRequest(`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT_ID}/locations/asia-south1/functions/financeApi`);
const policy = await googleRequest(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:getIamPolicy`, {method:'POST',body:'{}'});
const account = functionInfo.serviceConfig.serviceAccountEmail;
console.log(JSON.stringify({serviceAccount:account,url:functionInfo.serviceConfig.uri,roles:policy.bindings.filter(binding=>binding.members?.includes(`serviceAccount:${account}`)).map(binding=>binding.role)},null,2));

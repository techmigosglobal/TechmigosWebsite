import { googleRequest, PROJECT_ID, PROJECT_NUMBER } from './cli-context.mjs';
const results = await Promise.allSettled([
  googleRequest(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`),
  googleRequest(`https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`),
  googleRequest(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`),
]);
console.log(JSON.stringify(results.map((result, index) => result.status === 'rejected'
  ? { check: index, error: result.reason.message }
  : index === 0 ? { projectId: result.value.projectId, projectNumber: result.value.projectNumber, expectedNumber: PROJECT_NUMBER, resources: result.value.resources }
  : index === 1 ? { billingEnabled: result.value.billingEnabled }
  : { emailPasswordEnabled: result.value.signIn?.email?.enabled, authorizedDomains: result.value.authorizedDomains }), null, 2));

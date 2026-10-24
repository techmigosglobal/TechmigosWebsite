import { createRequire } from 'node:module';
import { financeFixture } from '../../test/fixtures/finance-state.js';
import { COLLECTIONS, buildTeamView } from '../../functions/domain.js';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
export const TEST_PROJECT = 'demo-techmigos-finance';
function assertEmulators() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8187' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9097' || process.env.GCLOUD_PROJECT !== TEST_PROJECT) throw new Error('Finance tests require isolated demo Firebase emulators. Run npm run test:finance.');
}
export async function seedEmulators() {
  assertEmulators();
  const reset = await Promise.all([
    fetch(`http://127.0.0.1:8187/emulator/v1/projects/${TEST_PROJECT}/databases/(default)/documents`,{method:'DELETE'}),
    fetch(`http://127.0.0.1:9097/emulator/v1/projects/${TEST_PROJECT}/accounts`,{method:'DELETE'}),
  ]);
  if (reset.some(response=>!response.ok)) throw new Error('Unable to reset the demo emulators.');
  const app=getApps().find(app=>app.name==='finance-tests')||initializeApp({projectId:TEST_PROJECT,storageBucket:`${TEST_PROJECT}.appspot.com`},'finance-tests');
  const db=getFirestore(app),auth=getAuth(app),state=financeFixture();
  const accounts=[
    {uid:'owner-vinay',name:'Vinay',email:'vinay@techmigos.com',password:'LocalAdmin@12345',role:'admin',teamId:''},
    {uid:'owner-vishal',name:'Vishal',email:'vishal@techmigos.com',password:'LocalAdmin@67890',role:'admin',teamId:''},
    {uid:'member-one',name:'Example member',email:'member-one@example.com',password:'Example@123',role:'member',teamId:'team-1'},
  ];
  const batch=db.batch();
  for(const account of accounts){await auth.createUser({uid:account.uid,email:account.email,password:account.password,displayName:account.name});const{password,...profile}=account;batch.set(db.doc(`finance_users/${account.uid}`),{...profile,active:true,validAfter:0})}
  for(const[key,collection]of Object.entries(COLLECTIONS))for(const record of state[key])batch.set(db.doc(`${collection}/${record.id}`),record);
  batch.set(db.doc('finance_settings/main'),state.settings);batch.set(db.doc('finance_workspace/main'),{revision:1});batch.set(db.doc('finance_initial/main'),{state});
  for(const team of state.teams)batch.set(db.doc(`finance_team_views/${team.id}`),{...buildTeamView(state,team.id),revision:1});
  await batch.commit();
}

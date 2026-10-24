import { spawn } from 'node:child_process';
import path from 'node:path';
const cli=process.env.FIREBASE_CLI_ROOT||path.join(process.env.APPDATA||'','npm/node_modules/firebase-tools');
const child=spawn(process.execPath,[path.join(cli,'lib/bin/firebase.js'),'emulators:exec','--project','demo-techmigos-finance','--only','auth,firestore,functions,storage','node scripts/firebase/run-e2e.mjs'],{stdio:'inherit',env:{...process.env,FUNCTIONS_DISCOVERY_TIMEOUT:'120',FIREBASE_CLI_DISABLE_USAGE_WARNING:'true'}});
child.on('exit',code=>process.exitCode=code??1);

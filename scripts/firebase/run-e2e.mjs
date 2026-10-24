import { spawn } from 'node:child_process';
const env={...process.env,GCLOUD_PROJECT:'demo-techmigos-finance',PUBLIC_FINANCE_EMULATORS:'true',PUBLIC_FIREBASE_PROJECT_ID:'demo-techmigos-finance',PUBLIC_FIREBASE_API_KEY:'demo-api-key',PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-techmigos-finance.firebaseapp.com',PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-techmigos-finance.appspot.com',PLAYWRIGHT_BASE_URL:'http://127.0.0.1:4325',PLAYWRIGHT_STATIC_ROOT:'.tmp-finance-dist',PLAYWRIGHT_STATIC_PORT:'4325'};
const build=spawn(process.execPath,['node_modules/astro/bin/astro.mjs','build','--outDir','.tmp-finance-dist'],{stdio:'inherit',env});
if(await new Promise(resolve=>build.on('exit',resolve))!==0)throw new Error('The isolated test build failed.');
const server=spawn(process.execPath,['scripts/playwright-static-server.mjs'],{stdio:'inherit',env});
try{
  let ready=false;
  for(let attempt=0;attempt<90;attempt++){
    try{if((await fetch(`${env.PLAYWRIGHT_BASE_URL}/login`)).ok){ready=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!ready)throw new Error('The demo frontend did not start.');
  // Warm the local Functions worker before browser timing assertions. On Windows
  // its first SDK import can exceed the UI's timeout even after discovery passes.
  const warm=await fetch('http://127.0.0.1:5007/demo-techmigos-finance/asia-south1/financeApi',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:{action:'load'}}),signal:AbortSignal.timeout(150000)});
  if(warm.status!==401)throw new Error(`The demo finance callable did not initialize correctly (${warm.status}).`);
  const tests=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.finance.config.js',...process.argv.slice(2)],{stdio:'inherit',env});
  process.exitCode=await new Promise(resolve=>tests.on('exit',code=>resolve(code??1)));
}finally{server.kill('SIGTERM')}

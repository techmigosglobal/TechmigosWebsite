import fs from 'node:fs';
import {createRequire} from 'node:module';
import {installTemporaryADC,PROJECT_ID} from './cli-context.mjs';
import {validateInvoiceTemplate} from '../../functions/domain.js';
const require=createRequire(new URL('../../functions/package.json',import.meta.url));
const {initializeApp,applicationDefault}=require('firebase-admin/app');
const {initializeFirestore}=require('firebase-admin/firestore');
const cleanup=installTemporaryADC();
try{
  const app=initializeApp({projectId:PROJECT_ID,credential:applicationDefault()},'invoice-template-initialization'),db=initializeFirestore(app,{preferRest:true});
  const signatureDataUrl=process.argv[2]?`data:image/png;base64,${fs.readFileSync(process.argv[2]).toString('base64')}`:'';
  const defaults={sellerName:'TechMigos',sellerAddress:'Hyderabad, Hyderabad, Telangana, 500097',sellerPhone:'+919959703547',sellerEmail:'info@techmigos.com',clientName:'',clientPhone:'',clientAddress:'',terms:'1. Goods once sold will not be taken back or exchanged\n2. All disputes are subject to Hyderabad jurisdiction only',upiId:'v5219@slc',payeeName:'TechMigos',signatoryName:'TechMigos',logoDataUrl:'/icon.png',signatureDataUrl};
  const before=await db.collection('finance_projects').get();fs.mkdirSync('.backend-export',{recursive:true});fs.writeFileSync('.backend-export/pre-invoice-templates.json',JSON.stringify(before.docs.map(doc=>doc.data()),null,2));
  const result=await db.runTransaction(async tx=>{
    const [projects,meta]=await Promise.all([tx.get(db.collection('finance_projects')),tx.get(db.doc('finance_workspace/main'))]);if(!meta.exists)throw Error('Finance migration must run first.');const updated=[];
    for(const doc of projects.docs){const p=doc.data();if(p.invoiceTemplate)continue;
      const template={...defaults,clientName:p.id==='p-arish'?'ArishVille School':p.name,clientPhone:p.id==='p-arish'?'9912744311':''};validateInvoiceTemplate(template);tx.update(doc.ref,{invoiceTemplate:template});updated.push(p.id);
    }
    if(updated.length)tx.update(meta.ref,{revision:meta.data().revision+1});return{projectId:PROJECT_ID,updated,unchanged:projects.size-updated.length,financialRecordsChanged:false};
  });
  fs.writeFileSync('reports/firebase-invoice-templates.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{cleanup()}

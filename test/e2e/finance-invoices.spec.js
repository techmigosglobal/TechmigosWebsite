import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {seedEmulators} from '../../scripts/firebase/emulator-fixture.mjs';

test('both project templates persist independently; services, PDF and landscape print share the document',async({page,context})=>{
  await seedEmulators();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/login');await page.locator('#email').fill('vinay@techmigos.com');await page.locator('#password').fill('LocalAdmin@12345');await page.locator('#login-submit').click();
  await expect(page.getByRole('heading',{name:'Dashboard Overview'})).toBeVisible();
  const initialCash=await page.evaluate(()=>globalMetrics().income);
  await page.locator('.sidebar [data-page="invoices"]').click();await page.getByRole('button',{name:'Project templates',exact:true}).click();
  await page.locator('[data-act="invoice-template"][data-id="p-arish"]').click();
  await page.getByLabel('Business name',{exact:true}).fill('TechMigos');await page.getByLabel('Bill to',{exact:true}).fill('ArishVille School');await page.getByLabel('Client phone',{exact:true}).fill('9912744311');
  const signature=process.env.FINANCE_REFERENCE_SIGNATURE||{name:'sample-signature.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=70;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,200,70);ctx.fillStyle='black';ctx.font='20px cursive';ctx.fillText('Sample signature',8,45);return canvas.toDataURL('image/png').split(',')[1]}),'base64')};
  await page.locator('#template-signature').setInputFiles(signature);await expect(page.locator('#signatureDataUrl-status')).toHaveText('Image ready to save');
  await page.getByLabel('UPI ID (blank to hide payment QR)').fill('invalid');await page.getByRole('button',{name:'Save project template'}).click();await expect(page.locator('.form-error')).toContainText('valid UPI');
  await page.getByLabel('UPI ID (blank to hide payment QR)').fill('v5219@slc');await page.getByRole('button',{name:'Save project template'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Project templates',exact:true}).click();await page.locator('[data-act="invoice-template"][data-id="p-focus"]').click();await page.getByLabel('Bill to',{exact:true}).fill('FocusToday');await page.getByRole('button',{name:'Save project template'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  const invoice=await page.evaluate(()=>state.invoices[0]);
  await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();await page.locator('[data-act="edit-invoice"]').click();await page.locator('#invoiceForm [name="projectId"]').selectOption('p-arish');await page.locator('#invoiceForm [name="invoiceNo"]').fill('TM_INV21');await page.locator('#invoiceForm [name="issuedDate"]').fill('2026-09-03');await page.locator('[data-form="invoiceForm"]').click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();await expect(page.locator('.invoice-page')).toHaveCount(1);
  await page.getByRole('button',{name:'Services & notes',exact:true}).click();
  await page.locator('[data-item-row] [name="description"]').fill('Phase 3 Amount of Android and IOS App of ArishVille');await page.locator('[data-item-row] [name="rate"]').fill('10000');
  await page.getByRole('button',{name:'Add service',exact:true}).click();const second=page.locator('[data-item-row]').nth(1);await second.locator('[name="description"]').fill('Application Maintenance & Technical Backend and Database Support Services');await second.locator('[name="rate"]').fill('1499');
  await page.getByLabel('Notes',{exact:true}).fill('Services for the Month of August 2026');await expect(page.locator('#invoiceItemsTotal')).toContainText('11,499.00');await page.getByRole('button',{name:'Save services & notes'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>globalMetrics().income)).toBe(initialCash);
  await page.reload();await expect(page.getByRole('heading',{name:'Dashboard Overview'})).toBeVisible();
  expect(await page.evaluate(()=>state.projects.map(p=>p.invoiceTemplate.clientName))).toEqual(['ArishVille School','FocusToday']);
  await page.locator('.sidebar [data-page="invoices"]').click();await page.locator(`[data-act="view-invoice"][data-id="${invoice.id}"]`).click();await expect(page.locator('.invoice-page')).toHaveCount(1);
  await page.screenshot({path:'reports/finance-invoice-template.png',fullPage:true});
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();const download=await pending;const data=await fs.readFile(await download.path());expect(data.subarray(0,8).toString()).toBe('%PDF-1.4');await fs.writeFile('reports/finance-invoice-template.pdf',data);
  await context.addInitScript(()=>{window.print=()=>{document.body.dataset.printed='true'}});
  const popupPromise=context.waitForEvent('page');await page.getByRole('button',{name:'Print',exact:true}).click();const popup=await popupPromise;await expect(popup.locator('body')).toHaveAttribute('data-printed','true');await expect(popup.locator('img')).toHaveCount(1);await expect(popup.locator('img')).toHaveJSProperty('naturalWidth',3369);await popup.close();
  // Long documents paginate without clipping services or terms.
  const pages=await page.evaluate(async()=>{const model=invoiceDocumentModel(state.invoices[0]);model.items=Array.from({length:24},(_,n)=>({description:`Service ${n+1} — full detail`,quantity:1,unit:'Service',rate:10,total:10}));model.amount=240;model.template.terms='Extended service terms. '.repeat(70);return(await window.FinanceInvoiceDocument.render(model)).pages.length});expect(pages).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

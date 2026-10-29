import { invoicePagesPdf } from './invoice-document.js';

const image = source => new Promise((resolve, reject) => {
  const value = new Image(); value.onload = () => resolve(value); value.onerror = () => reject(Error('Unable to load the saved signature or stamp.')); value.src = source;
});

export async function approvalDocument(model) {
  const pages = [];
  let canvas = document.createElement('canvas'); canvas.width = 3369; canvas.height = 2382;
  let ctx = canvas.getContext('2d'); ctx.scale(3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1123, 794);
  const write = (text, x, y, size = 16, bold = false, color = '#10274b') => {
    ctx.fillStyle = color; ctx.font = `${bold ? '700' : '400'} ${size}px Arial`; ctx.textAlign = 'left'; ctx.fillText(String(text || '—'), x, y);
  };
  const wrap = (text, x, y, width, size = 16, spacing = 22) => {
    ctx.font = `${size}px Arial`; let line = '', top = y;
    if (top > 485) { continuePage(); top = 190; ctx.font = `${size}px Arial`; }
    for (const character of String(text || '—')) {
      if (ctx.measureText(line + character).width > width) {
        write(line, x, top, size); top += spacing; line = '';
        if (top > 505) { continuePage(); top = 190; ctx.font = `${size}px Arial`; }
      }
      line += character;
    }
    write(line, x, top, size); return top + spacing + 2;
  };
  const continuePage = () => {
    pages.push(canvas.toDataURL('image/jpeg', .92));
    canvas = document.createElement('canvas'); canvas.width = 3369; canvas.height = 2382;
    ctx = canvas.getContext('2d'); ctx.scale(3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1123, 794);
    ctx.strokeStyle = '#dce5f3'; ctx.lineWidth = 2; ctx.strokeRect(35, 30, 1053, 730);
    write(model.businessName, 65, 78, 27, true); write('TRANSACTION APPROVAL — CONTINUED', 65, 118, 21, true);
    write(`Reference: ${model.id}`, 65, 151, 13);
  };
  const picture = (value, x, y, width, height) => { const scale = Math.min(width / value.width, height / value.height); ctx.drawImage(value, x, y, value.width * scale, value.height * scale); };
  ctx.strokeStyle = '#dce5f3'; ctx.lineWidth = 2; ctx.strokeRect(35, 30, 1053, 730);
  write(model.businessName, 65, 78, 27, true);
  write('INTERNAL TRANSACTION APPROVAL', 65, 118, 23, true);
  write('Original receipt unavailable · Approved internal voucher', 65, 150, 15, false, '#70809a');
  write(`Reference: ${model.id}`, 65, 187, 13);
  const transaction = model.transaction;
  write(`${transaction.type.toUpperCase()} · ${transaction.status}`, 65, 229, 16, true);
  write(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(transaction.amount), 785, 229, 28, true);
  let y = wrap(transaction.description, 65, 269, 965, 16, 19);
  write(`Transaction date: ${transaction.date}`, 65, y + 12); write(`Transaction ID: ${transaction.id}`, 570, y + 12, 13);
  y = wrap(`Project: ${model.projectName}`, 65, y + 40, 965, 13, 16);
  if (model.teamName) y = wrap(`Team: ${model.teamName}`, 65, y, 965);
  y = wrap(`Payee / payer: ${transaction.payee || 'Not specified'}`, 65, y, 965);
  if (y > 440) { continuePage(); y = 190; }
  write('Reason original receipt is missing', 65, y + 22, 16, true);
  wrap(model.reason, 65, y + 49, 965, 12, 15);
  write(`Approved by ${model.approvedByName} · Administrator`, 65, 554, 18, true);
  write(new Date(model.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long' }), 65, 581, 14);
  picture(await image(model.signatureDataUrl), 65, 602, 240, 78);
  write('Authorised signature', 65, 706, 13);
  if (model.stampDataUrl) picture(await image(model.stampDataUrl), 805, 548, 170, 170);
  else {
    ctx.save(); ctx.translate(910, 635); ctx.strokeStyle = '#175de8'; ctx.lineWidth = 3;
    for (const radius of [73, 65]) { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#175de8'; ctx.font = '700 18px Arial'; ctx.fillText('TECHMIGOS', 0, -22);
    ctx.font = '700 15px Arial'; ctx.fillText('APPROVED', 0, 7); ctx.font = '700 11px Arial'; ctx.fillText('ADMINISTRATOR', 0, 31); ctx.restore();
  }
  write('Internal approval of this recorded transaction; this voucher does not replace a supplier receipt or verify bank settlement.', 65, 739, 11, false, '#70809a');
  const page = canvas.toDataURL('image/jpeg', .92); pages.push(page);
  return { page, blob: invoicePagesPdf(pages) };
}
window.FinanceApprovalDocument = { render: approvalDocument };

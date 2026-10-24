import QRCode from 'qrcode';

// One document renderer supplies the preview, print pages and downloadable PDF.
// The landscape grid follows the user's TM_INV21-1 reference.
const WIDTH = 1123, HEIGHT = 794, LEFT = 39, RIGHT = 1084, MIDDLE = 562;
const cash = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value);
const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Unable to load the invoice image. Choose another PNG or JPEG.')); image.src = source;
});
export async function renderInvoiceDocument(model) {
  const pages = []; let canvas, ctx, y, paymentPage, paymentRect;
  const label = (value, x, top, size = 14, bold = false, align = 'left') => {
    ctx.font = `${bold ? '700' : '400'} ${size}px Arial, sans-serif`; ctx.fillStyle = '#111'; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(String(value ?? ''), x, top);
  };
  const line = (x1, y1, x2, y2) => { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const fit = (value,x,top,width,size=14,bold=false,align='left') => {let chosen=size;ctx.font=`${bold?'700':'400'} ${chosen}px Arial, sans-serif`;while(ctx.measureText(String(value)).width>width&&chosen>6){chosen-=.5;ctx.font=`${bold?'700':'400'} ${chosen}px Arial, sans-serif`;}label(value,x,top,chosen,bold,align);};
  const box = (x, top, width, height, fill) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, top, width, height); } ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.strokeRect(x, top, width, height); };
  const picture = (image,x,top,width,height) => {const scale=Math.min(width/image.width,height/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,x+(width-w)/2,top+(height-h)/2,w,h);};
  const wrap = (value, maxWidth, size = 14, bold = false) => {
    ctx.font = `${bold ? '700' : '400'} ${size}px Arial, sans-serif`; const result = [];
    for (const paragraph of String(value || '').split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        if (ctx.measureText(`${current} ${word}`.trim()).width <= maxWidth) { current = `${current} ${word}`.trim(); continue; }
        if (current) result.push(current); current = '';
        for (const char of word) { if (ctx.measureText(current + char).width > maxWidth) { result.push(current); current = ''; } current += char; }
      }
      result.push(current);
    }
    return result;
  };
  const paragraph = (value, x, top, width, size = 14, bold = false) => { const lines = wrap(value, width, size, bold); lines.forEach((text, index) => label(text, x, top + index * (size + 4), size, bold)); return lines.length * (size + 4); };
  const logo = model.template.logoDataUrl === '' ? null : await loadImage(model.template.logoDataUrl || '/icon.png');
  const signature = model.template.signatureDataUrl ? await loadImage(model.template.signatureDataUrl) : null;
  const payment = model.template.upiId && model.balance > 0 ? `upi://pay?${new URLSearchParams({pa:model.template.upiId,pn:model.template.payeeName || model.template.sellerName,am:model.balance.toFixed(2),cu:'INR',tn:`Invoice ${model.invoiceNo}`})}` : '';
  const qr = payment ? await loadImage(await QRCode.toDataURL(payment, { width: 300, margin: 2, errorCorrectionLevel: 'M' })) : null;
  const begin = () => {
    canvas = document.createElement('canvas'); canvas.width = WIDTH * 3; canvas.height = HEIGHT * 3; ctx = canvas.getContext('2d'); ctx.scale(3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT); pages.push(canvas);
    box(LEFT, 1, RIGHT - LEFT, 788); if (logo) picture(logo, 56, 16, 79, 79);
    fit(model.template.sellerName, 562, 27, 700, 23, true, 'center'); fit(model.template.sellerAddress, 562, 59, 800, 12, false, 'center');
    label([model.template.sellerPhone, model.template.sellerEmail].filter(Boolean).join(' | '), 562, 81, 12, false, 'center');
    line(LEFT, 116, RIGHT, 116); line(MIDDLE, 116, MIDDLE, 216);
    label('BILL TO', 54, 134, 17, true); fit(model.template.clientName, 54, 159, 490, 14, true);
    [model.template.clientPhone ? `Mobile: ${model.template.clientPhone}` : '',model.template.clientAddress].filter(Boolean).forEach((value,index)=>fit(value,54,179+index*16,490,12));
    label('Invoice No.', 700, 148, 16, true, 'center'); fit(model.invoiceNo, 700, 171, 230, 14, false, 'center');
    label('Invoice Date', 950, 148, 16, true, 'center'); label(model.issuedDate, 950, 171, 14, false, 'center');
    y = 216;
  };
  const room = height => { if (y + height > 789) { label(`Continued on page ${pages.length + 1}`, RIGHT - 12, 769, 10, false, 'right'); begin(); } };
  const columns = [LEFT, 113, 781, 906, 994, RIGHT];
  const cells = (top, height, fill) => { box(LEFT, top, RIGHT - LEFT, height, fill); for (const x of columns.slice(1, -1)) line(x, top, x, top + height); };
  const tableHead = () => { cells(y, 40, '#ddd'); ['S.NO.', 'SERVICES', 'QTY.', 'RATE', 'AMOUNT'].forEach((text, index) => label(text, (columns[index] + columns[index+1])/2, y+13, 13, true, 'center')); y += 40; };
  begin(); tableHead();
  model.items.forEach((item, index) => {
    const description = wrap(item.description, 645, 14, true), height = Math.max(47, description.length * 18 + 20);
    if (y + height > 735) { room(HEIGHT); tableHead(); }
    cells(y, height); label(index+1, 76, y+14, 14, false, 'center'); description.forEach((text, n) => label(text, 124, y+13+n*18, 14, true));
    fit(`${item.quantity} ${item.unit}`, 895, y+14, 105, 12, false, 'right'); fit(cash(item.rate), 985, y+14, 72, 12, false, 'right'); fit(cash(item.total), 1073, y+14, 74, 12, false, 'right'); y += height;
  });
  if (model.items.length < 2) { box(LEFT, y, RIGHT-LEFT, 47); y+=47; }
  room(154); box(LEFT, y, RIGHT-LEFT, 29); y+=29;
  box(LEFT,y,RIGHT-LEFT,54,'#ddd');columns.slice(2,-1).forEach(x=>line(x,y,x,y+54));label('TOTAL',770,y+12,14,true,'right');label(model.items.reduce((n,item)=>n+item.quantity,0),844,y+12,14,true,'center');label('₹',1039,y+10,13,true,'center');fit(cash(model.amount).replace('₹','').trim(),1039,y+31,78,12,true,'center');y+=54;
  label(`Subtotal: ${cash(model.amount)}`,1069,y+10,12,false,'right');label(`Grand Total: ${cash(model.amount)}`,1069,y+33,16,true,'right');y+=58;
  line(LEFT,y+40,RIGHT,y+40);line(MIDDLE,y,MIDDLE,y+40);label(`Received Amount: ${cash(model.received)}`,54,y+13,14,true);label(`Balance Amount: ${cash(model.balance)}`,577,y+13,14,true);y+=40;
  const notes = wrap(`Notes: ${model.notes || 'Thank you for your business.'}`, 1010, 14);
  while(notes.length){room(40);const count=Math.max(1,Math.floor((789-y-16)/18)),chunk=notes.splice(0,count),height=Math.max(40,chunk.length*18+16);box(LEFT,y,RIGHT-LEFT,height);chunk.forEach((text,n)=>label(text,54,y+12+n*18,14));y+=height;}
  room(218);const footerTop=y,footerHeight=Math.max(218,789-y);box(LEFT,footerTop,RIGHT-LEFT,footerHeight);line(MIDDLE,footerTop,MIDDLE,footerTop+footerHeight);
  label('Terms and Conditions',54,y+17,16,true);
  const terms=wrap(model.template.terms,480,13), available=Math.floor((footerHeight-58)/17);
  terms.slice(0,available).forEach((text,index)=>label(text,54,y+48+index*17,13));
  if(qr){paymentPage=pages.length-1;paymentRect=[687,y+15,120,195];ctx.drawImage(qr,687,y+15,120,120);label('Scan or tap to Pay',747,y+139,12,true,'center');fit(model.template.payeeName||model.template.sellerName,747,y+157,250,12,false,'center');fit(`${model.template.upiId} · ${cash(model.balance)}`,747,y+175,250,11,false,'center');label('Tap to pay',747,y+193,12,true,'center');}
  if(signature)picture(signature,945,y+124,90,40);
  label('Authorised Signatory For',989,y+170,13,false,'center');label(model.template.signatoryName||model.template.sellerName,989,y+188,13,false,'center');
  // Long terms continue on clearly marked pages instead of disappearing.
  if(terms.length>available){let rest=terms.slice(available);while(rest.length){begin();label('Terms and Conditions — continued',54,y+20,16,true);y+=54;const count=Math.floor((770-y)/17);rest.splice(0,count).forEach((text,index)=>label(text,54,y+index*17,13));}}
  return {pages:pages.map(page=>page.toDataURL('image/jpeg',.96)),payment,paymentPage,paymentRect};
}

export function invoicePagesPdf(pages, options={}) {
  const encoder = new TextEncoder(), parts = []; let length=0; const offsets=[0];
  const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
  const object=(id,value)=>{offsets[id]=length;add(`${id} 0 obj\n`);value();add('\nendobj\n');};
  add('%PDF-1.4\n%Techmigos\n');object(1,()=>add('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2,()=>add(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,n)=>`${3+n*3} 0 R`).join(' ')}] >>`));
  pages.forEach((data,n)=>{
    const id=3+n*3,binary=atob(data.split(',')[1]),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    let link='';if(options.payment&&options.paymentPage===n){const[x,y,w,h]=options.paymentRect,sx=842/WIDTH,sy=595.33/HEIGHT,uri=options.payment.replace(/[\\()]/g,char=>'\\'+char);link=` /Annots [<< /Type /Annot /Subtype /Link /Rect [${x*sx} ${(HEIGHT-y-h)*sy} ${(x+w)*sx} ${(HEIGHT-y)*sy}] /Border [0 0 0] /A << /S /URI /URI (${uri}) >> >>]`;}
    object(id,()=>add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595.33] /Resources << /XObject << /Im${n} ${id+1} 0 R >> >> /Contents ${id+2} 0 R${link} >>`));
    object(id+1,()=>{add(`<< /Type /XObject /Subtype /Image /Width ${WIDTH*3} /Height ${HEIGHT*3} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);add(bytes);add('\nendstream');});
    const stream=`q 842 0 0 595.33 0 0 cm /Im${n} Do Q\n`;object(id+2,()=>add(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`));
  });
  const count=3+pages.length*3,xref=length;add(`xref\n0 ${count}\n0000000000 65535 f \n`);for(let id=1;id<count;id++)add(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts,{type:'application/pdf'});
}

window.FinanceInvoiceDocument={render:renderInvoiceDocument,pdf:invoicePagesPdf};

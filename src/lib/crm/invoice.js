export function invoiceBranding(invoice) {
  const branding = invoice?.invoice_branding;
  return branding && typeof branding === 'object' && !Array.isArray(branding) ? branding : {};
}

export function buildUpiPaymentUri(upiId, merchantName, invoiceNumber, amount) {
  if (!String(upiId || '').trim()) return '';
  const balanceAmount = Math.max(Number(amount) || 0, 0).toFixed(2);
  const paymentNote = `Invoice ${invoiceNumber}`;
  return `upi://pay?pa=${encodeURIComponent(String(upiId).trim())}&pn=${encodeURIComponent(merchantName || '')}&am=${balanceAmount}&cu=INR&tn=${encodeURIComponent(paymentNote)}&tr=${encodeURIComponent(invoiceNumber || '')}`;
}

export function buildUpiQrUrl(upiPaymentUri) {
  if (!upiPaymentUri) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&format=png&data=${encodeURIComponent(upiPaymentUri)}`;
}

export function getInvoicePrintName(value) {
  return String(value || 'invoice').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'invoice';
}

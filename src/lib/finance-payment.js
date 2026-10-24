const MAX_CENTS = 100000000000000;
export function paymentDetails(input) {
  const upiId = String(input.pa || '').trim(), payee = String(input.pn || '').trim(), amount = String(input.am || ''), note = String(input.tn || '').trim();
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId) || upiId.length > 100 || !payee || payee.length > 100
    || /[\x00-\x1f\x7f]/.test(String(input.pn || '') + String(input.tn || '')) || note.length > 150 || !/^\d{1,13}(\.\d{1,2})?$/.test(amount)) throw Error('This payment link is incomplete or invalid. Ask the sender for an updated invoice.');
  const value = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_CENTS) throw Error('This payment link has an invalid amount. Ask the sender for an updated invoice.');
  return { pa: upiId, pn: payee, am: (value / 100).toFixed(2), cu: 'INR', tn: note };
}
export function upiPaymentUri(details) {
  const checked = paymentDetails(details);
  return `upi://pay?${Object.entries(checked).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}
export function invoicePaymentUrl(details, origin) {
  const url = new URL('/pay', origin);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw Error('The invoice payment website must use HTTPS.');
  // Fragment data stays out of HTTP access logs and referrer headers.
  url.hash = new URLSearchParams(paymentDetails(details)).toString();
  return url.href;
}

import QRCode from 'qrcode';
import { paymentDetails, upiPaymentUri } from '../lib/finance-payment.js';

let currentPayment;
async function showPayment() {
  currentPayment?.abort();
  const task = new AbortController();currentPayment = task;
  const get = id => document.getElementById(id);
  get('payment-details').hidden = true;get('payment-error').hidden = true;
  get('payment-status').textContent = '';get('payment-loading').hidden = false;
  try {
    const details = paymentDetails(Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
    const uri = upiPaymentUri(details);
    get('payment-note').textContent = details.tn;
    get('payment-amount').textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(details.am));
    get('payment-payee').textContent = details.pn;
    get('payment-upi').textContent = details.pa;
    const qr = get('payment-qr');
    const qrSource = await QRCode.toDataURL(uri, { width: 480, margin: 2, errorCorrectionLevel: 'M' });
    if (task.signal.aborted) return;
    qr.src = qrSource;
    get('payment-open').setAttribute('href', uri);
    get('payment-open').addEventListener('click', () => { get('payment-status').textContent = 'Opening your UPI app. If it does not open, scan the QR or copy the UPI ID.'; }, { signal: task.signal });
    get('payment-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(details.pa); if (!task.signal.aborted) get('payment-status').textContent = 'UPI ID copied.'; }
      catch { if (!task.signal.aborted) get('payment-status').textContent = 'Copy is unavailable. Select the UPI ID shown above and copy it manually.'; }
    }, { signal: task.signal });
    get('payment-details').hidden = false;
  } catch (error) {
    if (task.signal.aborted) return;
    get('payment-error').textContent = error instanceof Error ? error.message : 'Unable to show payment details. Ask the sender for an updated invoice.';
    get('payment-error').hidden = false;
  } finally { if (!task.signal.aborted) get('payment-loading').hidden = true; }
}
window.addEventListener('hashchange', showPayment);
showPayment();

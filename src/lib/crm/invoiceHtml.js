import { invoiceBalance, invoicePaidAmount, invoiceTotal } from './finance.js';
import { buildUpiPaymentUri, buildUpiQrUrl, invoiceBranding } from './invoice.js';
import { escapeHtml, safeUrl } from './ui.js';

function numberLabel(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Render the canonical printable invoice used by both company and client
 * workspaces. All user-controlled values are escaped here before becoming
 * document markup; callers only provide the authenticated invoice detail.
 */
export function renderInvoiceHtml(detail = {}, { paymentProfile = null } = {}) {
  const inv = detail.invoice || {};
  const branding = invoiceBranding(inv);
  const currency = String(inv.currency || 'INR');
  const currencyLabel = escapeHtml(currency === 'INR' ? '₹' : currency);
  const formatMoney = (value) => `${currencyLabel} ${numberLabel(value)}`;
  const esc = escapeHtml;
  const billName = inv.customer_name || detail.client?.name || '';
  const billCompany = inv.customer_company || detail.client?.company || '';
  const billPhone = inv.customer_phone || detail.client?.phone || '';
  const billEmail = inv.customer_email || detail.client?.email || '';
  const billAddress = inv.billing_address || '';
  const logoUrl = safeUrl(branding.logo_url, { fallback: '/icon.png' });
  const signatureUrl = safeUrl(branding.signature_url || inv.sign_url);
  const companyName = branding.company_name || branding.companyName || 'TechMigos';
  const companyAddress = branding.company_address || branding.companyAddress || '';
  const companyPhone = branding.company_phone || branding.companyPhone || '';
  const companyEmail = branding.company_email || branding.companyEmail || '';
  const configuredPayment = paymentProfile || {
    id: String(branding.upi_id || branding.upiId || '').trim(),
    merchant: branding.upi_merchant_name || branding.upiMerchantName || companyName,
  };
  const invoiceNumber = String(inv.invoice_number || inv.id || 'invoice');
  const total = invoiceTotal(inv);
  const received = invoicePaidAmount(inv);
  const balance = invoiceBalance(inv);
  const upiPaymentUri = buildUpiPaymentUri(configuredPayment.id, configuredPayment.merchant, invoiceNumber, balance);
  const upiQrUrl = safeUrl(buildUpiQrUrl(upiPaymentUri));
  const paymentMarkup = upiPaymentUri
    ? `<a href="${esc(upiPaymentUri)}" style="display:inline-block;line-height:0;" aria-label="Pay invoice ${esc(invoiceNumber)} using UPI"><img src="${esc(upiQrUrl)}" style="width:92px;height:92px;object-fit:contain;" alt="UPI payment QR code for invoice ${esc(invoiceNumber)}" /></a><div style="margin-top:4px;font-size:9px;font-weight:900;">Scan or tap to pay</div><div style="margin-top:2px;font-size:8px;word-break:break-word;">${esc(configuredPayment.id)} · ${formatMoney(balance)}</div>`
    : '<div style="color:#777;font-size:10px;">Payment details are not configured.</div>';
  const items = Array.isArray(detail.items) ? detail.items : [];
  const itemRows = items.map((item, index) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;vertical-align:top;">${index + 1}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;height:92px;vertical-align:top;">
        <strong>${esc(item.description || '')}</strong>
        ${item.notes ? `<br><span style="color:#666;font-size:9px;">${esc(item.notes)}</span>` : ''}
        ${inv.service_title && index === 0 && item.description !== inv.service_title ? `<br><span style="color:#888;font-size:9px;">${esc(inv.service_title)}</span>` : ''}
      </td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;vertical-align:top;">${numberLabel(item.quantity)} ${esc(item.unit || 'SERVICE')}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:right;vertical-align:top;">${numberLabel(item.rate)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:right;vertical-align:top;">${numberLabel(item.amount)}</td>
    </tr>`).join('');
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || (Number(item.quantity || 0) * Number(item.rate || 0)) || 0), 0);
  const quantityTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return `<article class="invoice-print-sheet" style="width:100%;max-width:840px;margin:0 auto;border:1px solid #222;font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="width:24%;padding:10px 12px;text-align:center;vertical-align:middle;border-bottom:1px solid #222;"><img src="${esc(logoUrl)}" class="inv-logo" style="width:74px;height:74px;object-fit:contain;" alt="TechMigos" onerror="this.style.display='none'" /></td>
      <td style="width:52%;padding:10px 8px;text-align:center;vertical-align:middle;border-bottom:1px solid #222;"><div style="font-size:18px;font-weight:900;letter-spacing:-0.01em;">${esc(companyName)}</div>${companyAddress ? `<div style="font-size:10px;color:#333;margin-top:2px;white-space:pre-line;">${esc(companyAddress)}</div>` : ''}${companyPhone || companyEmail ? `<div style="font-size:10px;color:#333;margin-top:4px;">${companyPhone ? `<strong>Mobile:</strong> ${esc(companyPhone)}` : ''}${companyPhone && companyEmail ? ' &nbsp;&nbsp; ' : ''}${companyEmail ? `<strong>Email:</strong> ${esc(companyEmail)}` : ''}</div>` : ''}</td>
      <td style="width:24%;border-bottom:1px solid #222;"></td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-top:0;" class="inv-no-break"><tr>
      <td style="border-bottom:1px solid #222;border-right:1px solid #222;padding:9px 12px;width:50%;vertical-align:top;"><div style="font-size:11px;font-weight:900;text-transform:uppercase;">Bill To</div><div style="font-size:13px;font-weight:900;margin-top:3px;">${esc(billName)}${billCompany && billCompany !== billName ? `<br><span style="font-size:11px;font-weight:600;">${esc(billCompany)}</span>` : ''}</div>${billPhone ? `<div style="font-size:10px;margin-top:2px;"><strong>Mobile:</strong> ${esc(billPhone)}</div>` : ''}${billEmail ? `<div style="font-size:10px;"><strong>Email:</strong> ${esc(billEmail)}</div>` : ''}${billAddress ? `<div style="font-size:10px;margin-top:2px;white-space:pre-line;">${esc(billAddress)}</div>` : ''}</td>
      <td style="border-bottom:1px solid #222;padding:9px 12px;width:25%;vertical-align:top;text-align:center;"><strong>Invoice No.</strong><br>${esc(invoiceNumber)}</td>
      <td style="border-bottom:1px solid #222;padding:9px 12px;width:25%;vertical-align:top;text-align:center;"><strong>Invoice Date</strong><br>${esc(inv.invoice_date || '')}</td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-top:0;" class="inv-no-break"><thead><tr style="background:#f3f4f6;">
      <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:40px;">S.NO.</th><th style="border:1px solid #ccc;padding:6px 8px;text-align:center;">SERVICES</th><th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:90px;">QTY.</th><th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:70px;">RATE</th><th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px;">AMOUNT</th>
    </tr></thead><tbody>${itemRows || '<tr><td colspan="5" style="border:1px solid #ccc;padding:6px 8px;text-align:center;color:#999;">No line items</td></tr>'}<tr style="height:30px;"><td colspan="5" style="border-left:1px solid #ccc;border-right:1px solid #ccc;"></td></tr></tbody>
    <tfoot><tr style="background:#f3f4f6;"><td colspan="2" style="border:1px solid #ccc;padding:8px;text-align:right;font-weight:900;">TOTAL</td><td style="border:1px solid #ccc;padding:8px;text-align:center;font-weight:900;">${quantityTotal}</td><td style="border:1px solid #ccc;padding:8px;"></td><td style="border:1px solid #ccc;padding:8px;text-align:right;font-weight:900;">${formatMoney(total)}</td></tr></tfoot></table>
    <div style="padding:7px 12px;text-align:right;font-size:10px;line-height:1.5;"><div><strong>Subtotal:</strong> ${formatMoney(subtotal)}</div><div style="font-size:11px;font-weight:900;"><strong>Grand Total:</strong> ${formatMoney(total)}</div></div>
    <table style="width:100%;border-collapse:collapse;margin-top:0;" class="inv-no-break"><tr><td style="border-top:1px solid #222;border-bottom:1px solid #222;border-right:1px solid #222;padding:8px 12px;width:50%;"><strong>Received Amount: ${formatMoney(received)}</strong></td><td style="border-top:1px solid #222;border-bottom:1px solid #222;padding:8px 12px;width:50%;"><strong>Balance Amount: ${formatMoney(balance)}</strong></td></tr></table>
    ${inv.notes ? `<div style="border-bottom:1px solid #222;padding:8px 12px;font-size:10px;"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:0;" class="inv-no-break"><tr><td style="border-right:1px solid #222;padding:10px 12px;vertical-align:top;width:50%;min-height:108px;">${inv.terms ? `<div><strong>Terms and Conditions</strong><div style="margin-top:4px;font-size:10px;white-space:pre-line;">${esc(inv.terms)}</div></div>` : ''}</td><td style="border-right:1px solid #222;padding:10px 8px;text-align:center;vertical-align:middle;width:22%;">${paymentMarkup}${inv.payment_instructions ? `<div style="margin-top:4px;font-size:8px;color:#555;">${esc(inv.payment_instructions)}</div>` : ''}</td><td style="padding:10px 8px;text-align:center;vertical-align:bottom;width:28%;">${signatureUrl ? `<img src="${esc(signatureUrl)}" style="max-height:52px;max-width:140px;object-fit:contain;" alt="Signature" onerror="this.style.display='none'" />` : '<div style="height:44px;"></div>'}<div style="border-top:1px solid #555;padding-top:4px;font-size:10px;font-weight:700;">Authorised Signatory For<br>${esc(companyName)}</div></td></tr></table>
  </article>`;
}

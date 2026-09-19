/* Shared company invoice preview, print, and detail behavior. */

export function createInvoicePreviewRuntime({
  els,
  portal,
  setStatus,
  showToast,
  invoicePaymentProfile,
  invoiceEffectiveStatus,
  invoiceTotal,
  invoicePaidAmount,
  invoiceBalance,
  statusTone,
  badge,
  money,
  escapeHtml,
  clientName,
  renderInvoiceHtml,
  replaceSafeMarkup,
  setPopupDocument,
  windowRef = globalThis.window,
}) {
  const hoverCache = new Map();
  let hoverGeneration = 0;

  async function printInvoiceMarkup(markup, filename = 'invoice') {
        const printWindow = window.open('', '_blank', 'popup,width=900,height=1100');
        if (!printWindow) {
          showToast('Allow pop-ups to print or save the invoice as PDF.', 'error');
          return false;
        }
        const safeTitle = escapeHtml(filename);
        setPopupDocument(printWindow, `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; color: #111; }
          body { font-family: Arial, Helvetica, sans-serif; }
          .invoice-print-sheet, .inv-preview-sheet { width: 277mm; max-width: 277mm !important; margin: 0 auto; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.35; }
          .invoice-print-sheet *, .inv-preview-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-print-sheet table, .inv-preview-sheet table { border-collapse: collapse; width: 100%; }
          .inv-no-break, .inv-project-summary, .inv-preview-border { break-inside: avoid; page-break-inside: avoid; }
          img { max-width: 100%; }
          .inv-preview-wrap { padding: 0 !important; background: #fff !important; }
          .inv-preview-border { box-shadow: none !important; }
          .inv-sheet { background:#fff; color:#111; width:100%; max-width:none; margin:0 auto; border:2px solid #111; font-family:Arial,Helvetica,sans-serif; }
          .inv-sheet-header { display:grid; grid-template-columns:140px 1fr 140px; align-items:center; min-height:100px; border-bottom:2px solid #111; padding:14px 16px; gap:8px; }
          .inv-sheet-logo { max-width:100px; max-height:80px; object-fit:contain; }
          .inv-sheet-company { text-align:center; }
          .inv-sheet-company h2 { margin:0 0 4px; font-size:22px; }
          .inv-sheet-company p { margin:3px 0; font-size:12px; }
          .inv-sheet .inv-bill-row { display:grid; grid-template-columns:1fr 1fr; border-bottom:2px solid #111; min-height:100px; }
          .inv-sheet .inv-bill-left { border-right:2px solid #111; padding:14px; }
          .inv-sheet .inv-bill-left h3 { margin:0 0 4px; font-size:16px; }
          .inv-sheet .inv-bill-left p, .inv-sheet .inv-bill-right p { margin:2px 0; font-size:13px; line-height:1.25; }
          .inv-sheet .inv-bill-right { display:grid; grid-template-columns:1fr 1fr; place-items:center; text-align:center; padding:14px; }
          .inv-sheet .inv-bill-right strong { display:block; font-size:15px; margin-bottom:3px; }
          .inv-sheet .inv-table { width:100%; border-collapse:collapse; table-layout:fixed; }
          .inv-sheet .inv-table th, .inv-sheet .inv-table td { border-right:2px solid #111; border-bottom:2px solid #111; padding:10px; vertical-align:top; }
          .inv-sheet .inv-table th:last-child, .inv-sheet .inv-table td:last-child { border-right:0; }
          .inv-sheet .inv-table th { background:#ddd; text-align:center; font-size:13px; }
          .inv-sheet .inv-table td { font-size:13px; }
          .inv-sheet .inv-table .col-sno { width:7%; text-align:center; }
          .inv-sheet .inv-table .col-services { width:64%; }
          .inv-sheet .inv-table .col-qty { width:12%; text-align:right; white-space:nowrap; }
          .inv-sheet .inv-table .col-rate, .inv-sheet .inv-table .col-amount { width:8.5%; text-align:right; white-space:nowrap; }
          .inv-sheet .inv-svc-title { font-weight:800; font-size:14px; margin-bottom:6px; }
          .inv-sheet .inv-svc-desc { color:#555; font-size:12px; line-height:1.35; }
          .inv-sheet .inv-total-row td { background:#ddd; font-weight:800; padding:8px 10px; }
          .inv-sheet .inv-paid-row { display:grid; grid-template-columns:1fr 1fr; border-bottom:2px solid #111; }
          .inv-sheet .inv-paid-row div { padding:10px 14px; font-size:14px; }
          .inv-sheet .inv-paid-row div:first-child { border-right:2px solid #111; }
          .inv-sheet .inv-notes-row { border-bottom:2px solid #111; padding:10px 14px; font-size:14px; }
          .inv-sheet .inv-bottom-row { display:grid; grid-template-columns:1fr 1fr; min-height:160px; }
          .inv-sheet .inv-terms-box { border-right:2px solid #111; padding:14px; }
          .inv-sheet .inv-terms-box h3 { margin:0 0 10px; font-size:15px; }
          .inv-sheet .inv-sign-box { padding:14px; display:grid; grid-template-columns:1fr 140px; gap:14px; align-items:end; }
          .inv-sheet .inv-qr-panel { align-self:start; text-align:center; color:#333; font-size:11px; }
          .inv-sheet .inv-qr-panel img { width:120px; height:120px; object-fit:contain; border:1px solid #ccc; padding:4px; }
          .inv-sheet .inv-sign-panel { text-align:center; align-self:end; }
          .inv-sheet .inv-sign-panel img { max-width:140px; max-height:60px; object-fit:contain; margin-bottom:6px; }
        </style></head><body><main>${markup}</main></body></html>`);
        printWindow.document.title = filename;
        const images = Array.from(printWindow.document.images || []);
        await Promise.all(images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        }));
        printWindow.onafterprint = () => printWindow.close();
        printWindow.focus();
        window.setTimeout(() => printWindow.print(), 80);
        return true;
      }

      function buildInvoicePreviewHtml(invoice, items) {
        const effectiveStatus = invoiceEffectiveStatus(invoice);
        const statusClass = statusTone(effectiveStatus);
        const total = invoiceTotal(invoice);
        const received = invoicePaidAmount(invoice);
        const balance = invoiceBalance(invoice);
        const itemRows = (items || []).map((item) => `<tr><td>${escapeHtml(item.description || '')}</td><td style="text-align:right">${Number(item.quantity || 0)}</td><td style="text-align:right">${escapeHtml(item.unit || 'N/A')}</td><td style="text-align:right">${money(item.rate || item.unit_price)}</td><td style="text-align:right">${money(item.amount || item.total || 0)}</td></tr>`).join('');
        return `<div class="ihp-head"><h4>${escapeHtml(invoice.invoice_number || 'Invoice')}</h4>${badge(effectiveStatus, statusClass)}</div>
          <dl class="ihp-grid">
            <dt>Client</dt><dd>${escapeHtml(invoice.customer_company || invoice.customer_name || clientName(invoice.client_id))}</dd>
            <dt>Date</dt><dd>${escapeHtml(invoice.invoice_date || '').slice(0, 10) || '-'}</dd>
            <dt>Due</dt><dd>${escapeHtml(invoice.due_date || '').slice(0, 10) || '-'}</dd>
            <dt>Service</dt><dd>${escapeHtml(invoice.service_title || '-')}</dd>
          </dl>
          ${items && items.length ? `<div class="ihp-items"><table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}</tbody></table></div>` : ''}
          <div class="ihp-foot"><span>Total</span><span>${money(total)}</span></div>
          <div class="ihp-foot"><span>Paid</span><span>${money(received)}</span></div>
          <div class="ihp-foot"><span>Balance</span><span>${money(balance)}</span></div>`;
      }

      async function handleHover(event, isSurface = () => true) {
        const target = event.target?.closest?.('[data-invoice-view]');
        if (!target || !isSurface(target) || isRelatedInvoiceTarget(event, target)) return;
        const invoiceId = target.dataset.invoiceView;
        const preview = els.invoiceHover;
        if (!preview || !invoiceId) return;
        const generation = ++hoverGeneration;
        let detail = hoverCache.get(invoiceId);
        if (!detail) {
          try {
            const result = await portal(`/api/portal/invoices/${invoiceId}`);
            detail = result.detail;
            hoverCache.set(invoiceId, detail);
          } catch {
            if (generation === hoverGeneration) preview.classList.remove('visible');
            return;
          }
        }
        if (generation !== hoverGeneration) return;
        replaceSafeMarkup(preview, buildInvoicePreviewHtml(detail.invoice, detail.items));
        const rect = target.getBoundingClientRect();
        preview.style.left = `${Math.min(rect.left, windowRef.innerWidth - 440)}px`;
        preview.style.top = `${rect.bottom + 8}px`;
        preview.classList.add('visible');
      }

      function handleHoverEnd(event, isSurface = () => true) {
        const target = event.target?.closest?.('[data-invoice-view]');
        if (!target || !isSurface(target) || isRelatedInvoiceTarget(event, target)) return;
        hoverGeneration += 1;
        els.invoiceHover?.classList.remove('visible');
      }

      function isRelatedInvoiceTarget(event, target) {
        const related = event.relatedTarget;
        return typeof Node !== 'undefined' && related instanceof Node && target.contains(related);
      }

      async function showInvoice(id) {
        try {
          const result = await portal(`/api/portal/invoices/${id}`);
          const detail = result.detail;
          els.invoicePreviewTitle.textContent = `Invoice ${detail.invoice.invoice_number}`;
          replaceSafeMarkup(els.invoicePreview, renderInvoiceHtml(detail, { paymentProfile: invoicePaymentProfile(detail.invoice) }));
          els.invoicePreview.dataset.invoiceNumber = detail.invoice.invoice_number || id;
          els.invoiceModal.classList.add('open');
        } catch (error) {
          setStatus(error instanceof Error ? error.message : 'Could not load invoice.', 'error');
        }
      }



  return { printInvoiceMarkup, buildInvoicePreviewHtml, showInvoice, handleHover, handleHoverEnd };
}

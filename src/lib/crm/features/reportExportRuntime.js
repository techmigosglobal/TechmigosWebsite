/**
 * Report and finance export actions. Data selection stays in reportData.js and
 * finance.js; this module owns only CSV/PDF/print delivery.
 */
export function createReportExportRuntime(context) {
  const {
    state,
    currentReport,
    financeSheetRows,
    invoiceTotal,
    invoicePaidAmount,
    isSettledFinance,
    invoiceEffectiveStatus,
    compactMoney,
    resolveProofUrl,
    escapeHtml,
    downloadCsv,
    setPopupDocument,
    toast,
    renderReports,
    bindActions,
    documentRef = globalThis.document,
  } = context;

  function reportCsv(report = currentReport()) {
    const headers = report.columns.map(([, label]) => label);
    const rows = report.rows.map((row) => report.columns.map(([key]) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  function exportCurrentReport() {
    downloadCsv(reportCsv(), `techmigos-${state.reportType}-report-${state.reportFrom}-to-${state.reportTo}.csv`);
  }

  function downloadCurrentReportPdf() {
    const report = { ...currentReport(), key: state.reportType };
    const companyName = state.companySettings?.company_name || 'TechMigos';
    if (!window.tmCrmPdf?.downloadCrmReportPdf) {
      toast('The PDF generator is still loading. Please try again.');
      return;
    }
    try {
      const fileName = window.tmCrmPdf.downloadCrmReportPdf({ report, from: state.reportFrom, to: state.reportTo, companyName });
      toast(`${fileName} downloaded.`);
    } catch (error) {
      console.error(error);
      toast('Could not generate the PDF report.');
    }
  }

  function financePdfRows() {
    return financeSheetRows().map((item) => {
      const total = invoiceTotal(item);
      const received = item.record_kind === 'invoice' ? invoicePaidAmount(item) : isSettledFinance(item) ? total : 0;
      const proofLabel = item.proof_url ? (/\.(png|jpe?g|webp|gif|avif)$/i.test(item.proof_url) ? 'Image proof' : 'PDF/link proof') : '-';
      return {
        date: item.transaction_date || item.invoice_date || String(item.created_at || '').slice(0, 10),
        type: item.transaction_type || 'invoice',
        title: item.title || item.reference_id || item.invoice_number || '-',
        client: item.client || item.customer_name || '-',
        amount: compactMoney(item.record_kind === 'invoice' && state.financeSheet === 'income' ? received : total),
        status: item.record_kind === 'invoice' ? invoiceEffectiveStatus(item) : item.status || '-',
        proof: proofLabel,
        proof_url: item.proof_url || item.sign_url || '',
        received: compactMoney(received),
      };
    });
  }

  async function printFinancePdf() {
    const rows = financePdfRows();
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!popup) return toast('Allow popups to export finance PDF.');
    setPopupDocument(popup, '<!doctype html><html><head><title>TechMigos Finance PDF</title></head><body style="font-family:Arial,sans-serif;margin:24px;color:#111;"><p style="margin:0;color:#475569;font-weight:700;">Preparing finance PDF...</p></body></html>');
    const rowsWithResolvedProofs = await Promise.all(rows.map(async (row) => {
      if (!row.proof_url) return { ...row, proof_href: '', proof_embed: '' };
      try {
        const proofHref = await resolveProofUrl(row.proof_url);
        const isImage = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(proofHref);
        return { ...row, proof_href: proofHref, proof_embed: isImage ? proofHref : '' };
      } catch {
        return { ...row, proof_href: '', proof_embed: '' };
      }
    }));
    setPopupDocument(popup, `<!doctype html><html><head><title>TechMigos Finance PDF</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px;}h1{margin:0;font-size:24px;}p{margin:6px 0 14px;color:#555;}.meta{font-size:12px;color:#555;margin-bottom:16px;}.card{border:1px solid #d8e0ea;border-radius:10px;padding:14px;margin:0 0 14px;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;}th,td{border:1px solid #d8e0ea;padding:8px;vertical-align:top;text-align:left;}th{background:#f5f8fc;font-weight:800;}.proof{max-width:190px;}.proof img{max-width:190px;max-height:120px;object-fit:cover;border:1px solid #d8e0ea;border-radius:8px;display:block;margin-top:4px;}.proof a{color:#1f7aff;text-decoration:none;word-break:break-all;}</style></head><body><h1>TechMigos Finance Export</h1><p>Transactions with proof attachments</p><div class="meta">Sheet: ${escapeHtml(state.financeSheet)} · Generated: ${new Date().toLocaleString('en-IN')}</div>${rowsWithResolvedProofs.map((row) => `<div class="card"><strong>${escapeHtml(row.title)}</strong><div style="margin-top:6px;font-size:12px;color:#333;">${escapeHtml(row.date)} · ${escapeHtml(row.type)} · ${escapeHtml(row.client)} · ${escapeHtml(row.amount)} · ${escapeHtml(row.status)}</div><div style="margin-top:8px;font-size:12px;"><strong>Proof:</strong> ${escapeHtml(row.proof)}</div><div class="proof">${row.proof_href ? (row.proof_embed ? `<a href="${escapeHtml(row.proof_href)}" target="_blank" rel="noopener"><img src="${escapeHtml(row.proof_embed)}" alt="Proof" /></a>` : `<a href="${escapeHtml(row.proof_href)}" target="_blank" rel="noopener">Open attached proof</a>`) : '<div style="color:#888;font-size:12px;">No preview available</div>'}</div></div>`).join('')}</body></html>`);
    popup.focus();
    popup.print();
  }

  function printCurrentReport() {
    const report = currentReport();
    const rows = report.rows.map((row) => `<tr>${report.columns.map(([key]) => `<td>${escapeHtml(String(row[key] ?? '-'))}</td>`).join('')}</tr>`).join('');
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!popup) return toast('Allow pop-ups in your browser to print/export reports.');
    const htmlContent = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(report.title)}</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:28px;}.header{border-bottom:3px solid #6366f1;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end;}.header h1{font-size:22px;font-weight:900;color:#1e293b;}.header .brand{font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;}p.subtitle{font-size:12px;color:#64748b;margin:4px 0 0;}.meta{font-size:11px;font-weight:700;color:#475569;margin:12px 0 18px;background:#f8fafc;padding:8px 12px;border-radius:6px;}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0;}.metric{border:1px solid #e2e8f0;padding:12px;border-radius:6px;background:#fafbfc;}.metric .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}.metric .value{font-size:20px;font-weight:900;color:#1e293b;margin-top:4px;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;}th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left;vertical-align:top;}th{background:#f1f5f9;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#475569;}tr:nth-child(even) td{background:#fafbfc;}.footer{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px;}@media print{body{margin:14px;padding:14px;}.header{page-break-inside:avoid;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style></head><body><div class="header"><div><h1>${escapeHtml(report.title)}</h1><p class="subtitle">${escapeHtml(report.subtitle)}</p></div><div class="brand">TECHMIGOS OPERATIONS</div></div><div class="meta">Period: ${escapeHtml(state.reportFrom)} to ${escapeHtml(state.reportTo)} &nbsp;&bull;&nbsp; Generated: ${new Date().toLocaleString('en-IN')} &nbsp;&bull;&nbsp; Report type: ${escapeHtml(state.reportType)}</div><div class="metrics">${report.metrics.map(([label, value]) => `<div class="metric"><div class="label">${escapeHtml(String(label))}</div><div class="value">${escapeHtml(String(value))}</div></div>`).join('')}</div><table><thead><tr>${report.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${report.columns.length}" style="text-align:center;color:#94a3b8;padding:20px;">No records found for this period</td></tr>`}</tbody></table><div class="footer">TechMigos &bull; ${report.title} &bull; Confidential</div></body></html>`;
    setPopupDocument(popup, htmlContent);
    popup.onload = () => { popup.focus(); popup.print(); };
    setTimeout(() => { try { if (!popup.closed) { popup.focus(); popup.print(); } } catch (_) {} }, 800);
  }

  function handleClick(element) {
    if (element.matches('[data-report-refresh]')) {
      state.reportType = documentRef.getElementById('report-type')?.value || state.reportType;
      state.reportFrom = documentRef.getElementById('report-from')?.value || state.reportFrom;
      state.reportTo = documentRef.getElementById('report-to')?.value || state.reportTo;
      renderReports();
      bindActions();
      return true;
    }
    if (element.matches('[data-report-export]')) {
      exportCurrentReport();
      return true;
    }
    if (element.matches('[data-report-download-pdf]')) {
      downloadCurrentReportPdf();
      return true;
    }
    if (!element.matches('[data-report-print]')) return false;
    printCurrentReport();
    return true;
  }

  function handleChange(element) {
    if (element?.matches?.('#report-type')) {
      state.reportType = element.value;
      renderReports();
      return true;
    }
    if (element?.matches?.('#report-from')) state.reportFrom = element.value;
    else if (element?.matches?.('#report-to')) state.reportTo = element.value;
    else return false;
    return true;
  }

  return { reportCsv, exportCurrentReport, downloadCurrentReportPdf, financePdfRows, printFinancePdf, printCurrentReport, handleClick, handleChange };
}

import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderReports(context) {
  const { state, els, pageHead, crmProjectIcon, escapeHtml, table, reportTableRows, metric, report, typeOptions } = context;
  replaceSafeMarkup(els.view, `
    <div class="crm-reports-page">
      ${pageHead('Report Generation', 'Generate operational reports from live Supabase Operations & Management data.', `<button class="crm-button primary report-head-button" data-report-download-pdf type="button">${crmProjectIcon('download')} Download PDF</button><button class="crm-button report-head-button" data-report-print type="button">${crmProjectIcon('print')} Print</button><button class="crm-button report-head-button" data-report-export type="button">${crmProjectIcon('download')} Export CSV</button>`)}
      <section class="crm-card reports-controls-card">
        <div class="crm-card-head reports-controls-head"><h2 class="crm-card-title">Report Controls</h2></div>
        <div class="reports-controls-grid">
          <label class="reports-field">Report Type
            <select id="report-type" class="crm-select">${typeOptions.map(([key, label]) => `<option value="${key}" ${state.reportType === key ? 'selected' : ''}>${label}</option>`).join('')}</select>
          </label>
          <label class="reports-field">From
            <input id="report-from" type="date" class="crm-input" value="${escapeHtml(state.reportFrom)}" />
          </label>
          <label class="reports-field">To
            <input id="report-to" type="date" class="crm-input" value="${escapeHtml(state.reportTo)}" />
          </label>
          <div class="reports-control-actions">
            <button class="crm-button primary" data-report-refresh type="button">Generate</button>
            <button class="crm-button" data-report-download-pdf type="button">PDF</button>
            <button class="crm-button" data-report-export type="button">CSV</button>
          </div>
        </div>
      </section>
      <div class="crm-grid crm-kpis reports-kpis">
        ${report.metrics.map(([label, value, icon, color]) => metric(label, value, crmProjectIcon(icon), color)).join('')}
      </div>
      <div class="reports-summary-grid">
        <section class="crm-card reports-table-card" id="report-preview">
          <div class="crm-card-head reports-summary-head">
            <div><h2 class="crm-card-title">${escapeHtml(report.title)}</h2><p class="reports-summary-meta">${escapeHtml(report.subtitle)} &bull; ${escapeHtml(state.reportFrom)} to ${escapeHtml(state.reportTo)}</p></div>
          </div>
          ${table(report.columns.map(([, label]) => label), reportTableRows(report), 'No report records for this date range.', 'reports-table')}
        </section>
        <section class="crm-card reports-chart-card">
          <div class="crm-card-head reports-summary-head"><h2 class="crm-card-title">Report Summary Chart</h2></div>
          <div class="reports-chart-area"><canvas id="report-chart"></canvas></div>
          <div class="reports-chart-list">
            ${report.metrics.map(([label, value]) => `<div class="reports-chart-row"><span>${label}</span><strong>${value}</strong></div>`).join('')}
          </div>
        </section>
      </div>
    </div>`);

  // Render chart
  requestAnimationFrame(() => {
    const ctx = document.getElementById('report-chart')?.getContext('2d');
    if (ctx && window.Chart) {
      const labels = report.metrics.map(([l]) => l);
      const values = report.metrics.map(([, v]) => parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0);
      new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: report.title, data: values, backgroundColor: ['#6366f1','#22c55e','#f59e0b','#ef4444','#10b981'].slice(0, labels.length), borderRadius: 8 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } } },
      });
    }
  });
}

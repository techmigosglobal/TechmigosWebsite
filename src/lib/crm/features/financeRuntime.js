import { replaceSafeMarkup } from '../safeMarkup.js';

export function initAccounting(context) {
  const { bindActions, expenseRows, incomeRows } = context;

      // Finance controls are delegated from the CRM root. This renderer only
      // prepares the data visualization and never attaches handlers to rows
      // that will be replaced by the next render.
      // ── Cash flow canvas ──
      const canvas = document.getElementById('acc-cashflow-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.offsetWidth || 248, H = 80;
        canvas.width = W; canvas.height = H;
        const monthMap = {};
        [...incomeRows(), ...expenseRows()].forEach(r => {
          const mk = (r.transaction_date || '').slice(0, 7); if (!mk) return;
          if (!monthMap[mk]) monthMap[mk] = 0;
          monthMap[mk] += ['income', 'revenue', 'invoice'].includes(r.transaction_type) ? Number(r.amount || 0) : -Number(r.amount || 0);
        });
        const months = Object.keys(monthMap).sort().slice(-4);
        const labelsEl = document.getElementById('acc-cf-labels');
        if (labelsEl) replaceSafeMarkup(labelsEl, months.map(m => `<span style="flex:1;text-align:center;font-size:9px;color:#555;">${new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' })}</span>`).join(''));
        const vals = months.map(m => monthMap[m]);
        if (vals.length >= 2) {
          const min = Math.min(...vals), max = Math.max(...vals, 1);
          const sy = v => H - ((v - min) / (max - min || 1)) * (H - 14) - 7;
          // Grid lines
          ctx.strokeStyle = '#1e2a1e'; ctx.lineWidth = 0.5;
          [0.25, 0.5, 0.75].forEach(f => { const y = H - f * (H - 14) - 7; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
          // Points
          const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (W - 16) + 8, sy(v)]);
          // Fill gradient
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, 'rgba(34,242,90,.3)');
          grad.addColorStop(1, 'rgba(34,242,90,0)');
          ctx.beginPath();
          pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
          ctx.strokeStyle = '#22f25a'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
          ctx.lineTo(pts[pts.length - 1][0], H); ctx.lineTo(pts[0][0], H); ctx.closePath();
          ctx.fillStyle = grad; ctx.fill();
          // Dots
          pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#22f25a'; ctx.fill(); });
          // % change
          const ch = Math.round(((vals[vals.length - 1] - vals[0]) / (Math.abs(vals[0]) || 1)) * 100);
          const pctEl = document.getElementById('acc-cf-pct');
          if (pctEl) pctEl.textContent = (ch >= 0 ? '+' : '') + ch + '%';
        } else {
          ctx.fillStyle = '#555'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('No data yet', W / 2, H / 2);
        }
      }
      bindActions();

}

export function initFinanceCharts(context) {
  const { compactMoney, expenseRows, incomeRows, invoiceBalance, state } = context;

      // Invoice Aging: real computed from invoice data
      const today = new Date();
      const aging = { '0\u201330 Days': 0, '31\u201360 Days': 0, '61\u201390 Days': 0, '90+ Days': 0 };
      state.data.invoices
        .filter((inv) => invoiceBalance(inv) > 0)
        .forEach((inv) => {
          const daysLate = inv.due_date ? Math.floor((today - new Date(inv.due_date)) / 86400000) : 0;
          const amt = invoiceBalance(inv);
          if (daysLate <= 30) aging['0\u201330 Days'] += amt;
          else if (daysLate <= 60) aging['31\u201360 Days'] += amt;
          else if (daysLate <= 90) aging['61\u201390 Days'] += amt;
          else aging['90+ Days'] += amt;
        });
      const agingEl = document.getElementById('invoice-aging-list');
      if (agingEl) {
        replaceSafeMarkup(agingEl, Object.entries(aging).map(([label, amt]) =>
          `<div class="crm-list-row"><span>${label}</span><strong style="color:${amt > 0 ? '#dc2626' : '#64748b'}">${compactMoney(amt)}</strong></div>`
        ).join(''));
      }
      // Monthly Cash Flow: last 6 months bar chart
      const monthMap = {};
      [...incomeRows(), ...expenseRows()].forEach((item) => {
        const d = item.transaction_date || (item.created_at || '').slice(0, 10);
        const monthKey = d.slice(0, 7);
        if (!monthKey || monthKey.length < 7) return;
        if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expense: 0 };
        if (['income', 'revenue'].includes(item.transaction_type)) monthMap[monthKey].income += Number(item.amount || 0);
        else monthMap[monthKey].expense += Number(item.amount || 0);
      });
      const monthKeys = Object.keys(monthMap).sort().slice(-6);
      const maxFlow = Math.max(...monthKeys.flatMap((k) => [monthMap[k].income, monthMap[k].expense]), 1);
      const chartEl = document.getElementById('cashflow-chart-container');
      if (chartEl) {
        if (monthKeys.length === 0) {
          replaceSafeMarkup(chartEl, '<p style="font-size:11px;color:#94a3b8;padding:8px">No transaction data yet</p>');
        } else {
          const bars = monthKeys.map((k) => {
            const incH = Math.round((monthMap[k].income / maxFlow) * 60);
            const expH = Math.round((monthMap[k].expense / maxFlow) * 60);
            const lbl = new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short' });
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1">
              <div style="display:flex;gap:2px;align-items:flex-end;height:64px">
                <div title="Income \u20b9${monthMap[k].income.toLocaleString('en-IN')}" style="width:10px;height:${incH}px;background:#16a34a;border-radius:2px 2px 0 0"></div>
                <div title="Expense \u20b9${monthMap[k].expense.toLocaleString('en-IN')}" style="width:10px;height:${expH}px;background:#dc2626;border-radius:2px 2px 0 0"></div>
              </div>
              <span style="font-size:9px;color:#64748b">${lbl}</span>
            </div>`;
          }).join('');
          replaceSafeMarkup(chartEl, `<div style="display:flex;align-items:flex-end;gap:4px;height:80px">${bars}</div><div style="display:flex;gap:12px;margin-top:6px"><span style="font-size:10px;color:#16a34a;font-weight:700">&#9632; Income</span><span style="font-size:10px;color:#dc2626;font-weight:700">&#9632; Expense</span></div>`);
        }
      }

}

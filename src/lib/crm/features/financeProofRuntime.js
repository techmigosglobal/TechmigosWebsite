import { replaceSafeMarkup } from '../safeMarkup.js';

/**
 * Private finance-proof actions and markup. Signed URLs are resolved through
 * the repository; raw storage paths are never rendered as public assets.
 */
export function createFinanceProofRuntime(context) {
  const {
    state,
    els,
    escapeHtml,
    proofIconMarkup,
    portal,
    toast,
    loadData,
    render,
  } = context;

  function getResolvedProofUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return '';
  }

  function proofStoragePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
      const match = raw.match(/\/finance-proofs\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    return raw;
  }

  async function resolveProofUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const path = proofStoragePath(raw);
    if (!path && /^https?:\/\//i.test(raw)) return raw;
    if (!path) throw new Error('The stored proof path is invalid.');
    try {
      return await window.tmCrm.repository.getFinanceProofUrl(path);
    } catch (error) {
      throw error instanceof Error ? error : new Error('Could not create secure proof URL.');
    }
  }

  function proofDocumentMarkup(rawUrl, resolvedUrl, compact = false) {
    const safeUrl = escapeHtml(resolvedUrl);
    const fileName = escapeHtml(String(rawUrl || '').split('/').pop() || 'Proof document');
    const isPdf = /\.pdf(\?|$)/i.test(resolvedUrl) || /\.pdf(\?|$)/i.test(rawUrl);
    const isImg = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(resolvedUrl) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(rawUrl);
    if (isPdf) {
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;${compact ? 'max-width:260px;' : 'margin-bottom:10px;'}"><iframe src="${safeUrl}#toolbar=0" style="width:100%;height:${compact ? '140px' : '320px'};border:none;display:block;background:#f8fafc;" title="PDF Preview"></iframe><div style="padding:6px 8px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:10px;color:#64748b;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${fileName}">${fileName}</span><a class="crm-mini-action" href="${safeUrl}" target="_blank" rel="noopener" style="font-size:10px;text-decoration:none;white-space:nowrap;">Open ↗</a></div></div>`;
    }
    if (isImg) {
      return `<a href="${safeUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;"><img src="${safeUrl}" alt="Proof preview" style="max-width:${compact ? '220px' : '100%'};max-height:${compact ? '160px' : '320px'};width:auto;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff;" /></a>`;
    }
    return `<a href="${safeUrl}" target="_blank" rel="noopener" class="crm-mini-action" style="display:inline-flex;text-decoration:none;">${proofIconMarkup('paperclip', 14)} ${fileName}</a>`;
  }

  function proofPreviewMarkup(url) {
    if (!url) return '';
    const resolvedUrl = getResolvedProofUrl(url);
    const safeRawUrl = escapeHtml(url);
    if (!resolvedUrl) return `<div data-proof-auto-preview data-proof-value="${safeRawUrl}" style="border:1px dashed #cbd5e1;border-radius:8px;padding:12px;text-align:center;color:#64748b;font-size:11px;">Loading secure preview…</div>`;
    return proofDocumentMarkup(url, resolvedUrl, true);
  }

  function proofSummaryMarkup(url) {
    if (!url) return '<span class="crm-proof-summary">No proof</span>';
    if (/\.pdf(\?|$)/i.test(url)) return '<span class="crm-proof-summary">PDF attached</span>';
    if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)) return '<span class="crm-proof-summary">Image attached</span>';
    return '<span class="crm-proof-summary">Proof attached</span>';
  }

  async function loadProofPreviewTarget(target, value) {
    if (!target || !value || target.dataset.proofLoading === 'true') return;
    target.dataset.proofLoading = 'true';
    replaceSafeMarkup(target, '<div style="border:1px dashed #cbd5e1;border-radius:8px;padding:12px;text-align:center;color:#64748b;font-size:11px;">Loading secure preview…</div>');
    try {
      const resolvedUrl = await resolveProofUrl(value);
      if (target.isConnected) replaceSafeMarkup(target, proofDocumentMarkup(value, resolvedUrl, target.dataset.proofCompact === 'true'));
    } catch (error) {
      if (target.isConnected) replaceSafeMarkup(target, `<div style="border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;color:#b91c1c;font-size:11px;">${escapeHtml(error instanceof Error ? error.message : 'Could not load secure proof preview.')}</div>`);
    } finally {
      delete target.dataset.proofLoading;
    }
  }

  function loadAutoProofPreviews(root = document) {
    root.querySelectorAll('[data-proof-auto-preview]').forEach((target) => {
      loadProofPreviewTarget(target, target.dataset.proofValue);
    });
  }

  async function openProofPreview(value) {
    if (!value || !els.proofPreviewModal || !els.proofPreviewBody) return;
    replaceSafeMarkup(els.proofPreviewBody, '<p style="margin:0;color:#475569;font-weight:700;">Loading proof preview...</p>');
    els.proofPreviewModal.classList.add('open');
    try {
      const resolvedUrl = await resolveProofUrl(value);
      const safeUrl = escapeHtml(resolvedUrl);
      const isPdf = /\.pdf(\?|$)/i.test(resolvedUrl) || /\.pdf(\?|$)/i.test(value);
      const isImg = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(resolvedUrl) || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value);
      if (isPdf) replaceSafeMarkup(els.proofPreviewBody, `<iframe src="${safeUrl}" title="Proof PDF preview" style="width:100%;height:75vh;border:0;border-radius:10px;background:#fff;"></iframe>`);
      else if (isImg) replaceSafeMarkup(els.proofPreviewBody, `<img src="${safeUrl}" alt="Proof preview" style="max-height:75vh;width:auto;max-width:100%;margin:0 auto;display:block;object-fit:contain;border-radius:10px;" />`);
      else replaceSafeMarkup(els.proofPreviewBody, `<p style="margin:0 0 12px;color:#475569;font-weight:700;">Inline preview is not available for this proof type.</p><a class="crm-button primary" href="${safeUrl}" target="_blank" rel="noopener" style="text-decoration:none;">Open Proof</a>`);
    } catch (error) {
      replaceSafeMarkup(els.proofPreviewBody, `<p style="margin:0;color:#b91c1c;font-weight:700;">${escapeHtml(error instanceof Error ? error.message : 'Could not open proof preview')}</p>`);
    }
  }

  async function openProofInNewTab(value) {
    try {
      const resolvedUrl = await resolveProofUrl(value);
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not open proof');
    }
  }

  function financeProofFieldMarkup(values = {}) {
    const proofUrl = String(values.proof_url || '');
    const recordId = Number.isInteger(Number(values.id)) ? String(values.id) : '';
    return `<div class="wide" style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;"><strong style="font-size:12px;">Payment Proof Attachment</strong><span style="display:block;font-size:10px;color:#667599;margin-bottom:6px;">${recordId ? 'Upload a receipt, screenshot, or PDF proof. It will be saved with the transaction and can be included in reports.' : 'Save the finance record first, then reopen it to attach proof.'}</span>${proofUrl ? `<div id="finance-proof-preview" style="margin-bottom:8px;">${proofPreviewMarkup(proofUrl)}</div>` : '<div id="finance-proof-preview" style="margin-bottom:8px;"><span class="crm-proof-summary">No proof</span></div>'}<input type="file" id="finance-proof-file" data-record-id="${escapeHtml(recordId)}" accept="image/*,.pdf,.jpg,.jpeg,.png,.webp" style="display:block;" ${recordId ? '' : 'disabled'} /><input type="hidden" name="proof_url" id="finance-proof-url" value="${escapeHtml(proofUrl)}" /><span id="finance-proof-status" style="font-size:10px;color:#667599;"></span></div>`;
  }

  async function uploadFinanceProof(file, recordId = '') {
    if (!recordId || !Number.isInteger(Number(recordId))) throw new Error('Save the finance record before attaching proof.');
    const fd = new FormData();
    fd.append('file', file);
    return portal(`/api/portal/finances/${encodeURIComponent(recordId)}/upload-proof`, { method: 'POST', body: fd, headers: {} });
  }

  function bindFinanceProofField() {
    const preview = document.getElementById('finance-proof-preview');
    if (preview) loadAutoProofPreviews(preview);
  }

  async function handleFinanceProofField(input) {
    const file = input?.files?.[0];
    const urlInput = document.getElementById('finance-proof-url');
    const preview = document.getElementById('finance-proof-preview');
    const status = document.getElementById('finance-proof-status');
    if (!file || !urlInput || !preview || !status) return;
    status.textContent = 'Uploading proof...';
    status.style.color = '#667599';
    try {
      const res = await uploadFinanceProof(file, input.dataset.recordId);
      urlInput.value = res.proof_url || '';
      replaceSafeMarkup(preview, proofPreviewMarkup(res.proof_url));
      status.textContent = '✓ Proof uploaded';
      status.style.color = 'var(--crm-green)';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Proof upload failed';
      status.style.color = 'var(--crm-red)';
    }
    input.value = '';
  }

  async function handleFinanceProofUpload(input) {
    const file = input?.files?.[0];
    const row = input?.closest('[data-row-id]');
    const proofCell = input?.closest('[data-proof-cell]');
    const preview = proofCell?.querySelector('[data-proof-preview]');
    const status = proofCell?.querySelector('[data-proof-status]');
    const rowId = input?.dataset.proofUpload || input?.dataset.proofRow || row?.dataset.rowId;
    if (!file || !rowId) return;
    if (status) {
      status.textContent = 'Uploading proof...';
      status.style.color = '#667599';
    }
    try {
      const res = await uploadFinanceProof(file, rowId);
      if (preview) replaceSafeMarkup(preview, proofSummaryMarkup(res.proof_url));
      if (status) {
        status.textContent = `✓ ${file.name}`;
        status.style.color = 'var(--crm-green)';
      }
      toast('Proof uploaded');
      await loadData();
      state.accSelectedId = rowId;
      render();
    } catch (error) {
      if (status) {
        status.textContent = error instanceof Error ? error.message : 'Proof upload failed';
        status.style.color = 'var(--crm-red)';
      }
      toast(error instanceof Error ? error.message : 'Proof upload failed');
    }
    input.value = '';
  }

  async function handleChange(element) {
    if (element?.matches?.('#finance-proof-file')) {
      await handleFinanceProofField(element);
      return true;
    }
    if (!element?.matches?.('[data-proof-upload]')) return false;
    await handleFinanceProofUpload(element);
    return true;
  }

  return {
    getResolvedProofUrl,
    proofPreviewMarkup,
    proofSummaryMarkup,
    proofDocumentMarkup,
    resolveProofUrl,
    loadAutoProofPreviews,
    openProofPreview,
    openProofInNewTab,
    financeProofFieldMarkup,
    uploadFinanceProof,
    bindFinanceProofField,
    handleFinanceProofField,
    handleFinanceProofUpload,
    handleChange,
  };
}

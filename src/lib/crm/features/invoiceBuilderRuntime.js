import { replaceSafeMarkup } from '../safeMarkup.js';

export async function handleInvoiceBuilderClick(element, event, actions) {
  if (!element) return false;
  if (element.matches('#inv-save-settings')) {
    await actions.saveBuilderSettings();
    return true;
  }
  if (element.matches('#inv-save-invoice')) {
    await actions.saveInvoice();
    return true;
  }
  if (!element.closest?.('#inv-builder-form')) return false;
  if (element.matches('#inv-clear-signature')) {
    actions.clearSignature();
    return true;
  }
  if (element.matches('#inv-save-drawn-signature')) {
    await actions.saveDrawnSignature();
    return true;
  }
  if (element.matches('#inv-add-item')) {
    actions.addItemRow();
    return true;
  }
  if (element.matches('.inv-remove-item')) {
    element.closest('tr')?.remove();
    actions.updatePreview();
    return true;
  }
  if (element.matches('[data-delete-invoice-asset]')) {
    await actions.deleteLocalAsset(element.dataset.deleteInvoiceAsset);
    return true;
  }
  if (element.matches('.inv-upload-box') && !event.target?.closest?.('label, input')) {
    element.querySelector('input[type="file"]')?.click();
    return true;
  }
  return false;
}

export function handleInvoiceBuilderInput(element, actions) {
  if (!element?.closest?.('#inv-builder-form')) return false;
  actions.updatePreview();
  return true;
}

export async function handleInvoiceBuilderChange(element, actions) {
  if (!element?.closest?.('#inv-builder-form')) return false;
  if (element.matches('input[type="file"]')) {
    await actions.handleFileInput(element);
    return true;
  }
  if (element.id === 'inv-project-select') {
    await actions.selectProject(element.value);
    return true;
  }
  if (element.id === 'inv-client-select') {
    await actions.applyClientDetails(element.value);
    return true;
  }
  actions.updatePreview();
  return true;
}

export function initInvoiceBuilder(context) {
  const {
    bindActions,
    buildUpiPaymentUri,
    buildUpiQrUrl,
    escapeHtml,
    invoiceBranding,
    invoiceEffectiveStatus,
    invoicePaidAmount,
    invoicePaymentProfile,
    loadData,
    portal,
    renderFinance,
    showToast,
    state,
    upsertInvoiceRecord,
  } = context;

      const LOCAL_ASSETS_KEY = 'techmigos.invoice.local-assets.v1';
      let signing = false;
      let hasSignatureInk = false;

      function readLocalAssets() {
        try {
          const value = JSON.parse(localStorage.getItem(LOCAL_ASSETS_KEY) || '[]');
          return Array.isArray(value) ? value : [];
        } catch { return []; }
      }

      function writeLocalAssets(assets) {
        try {
          localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(assets));
        } catch { throw new Error('Browser storage is full. Delete an old asset and try again.'); }
      }

      function getValue(id) { return (document.getElementById(id)?.value || '').trim(); }
      function isChecked(id) { return !!document.getElementById(id)?.checked; }
      function getPreviewSrc(id) { return document.getElementById(id)?.querySelector('img')?.src || ''; }
      async function resolveInvoiceAsset(path, fallback = '') {
        if (!path) return fallback;
        try {
          return await window.tmCrm.repository.getInvoiceAssetUrl(path);
        } catch (error) {
          setAssetStatus(error instanceof Error ? error.message : 'Could not resolve invoice branding asset.', true);
          return fallback;
        }
      }
      async function resolveStoredInvoiceAsset(value, path, fallback = '') {
        const candidate = String(value || '').trim();
        if (/^https?:\/\//i.test(candidate)) return candidate;
        return resolveInvoiceAsset(candidate || path, fallback);
      }
      function setFieldValue(id, value, dispatch = false) {
        const element = document.getElementById(id);
        if (!element) return;
        element.value = value === null || value === undefined ? '' : String(value);
        if (dispatch) element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      function selectedProject() {
        const projectId = getValue('inv-project-select');
        return state.data.projects.find((project) => String(project.id) === String(projectId)) || null;
      }
      function projectFieldSnapshot() {
        const project = selectedProject() || {};
        const numberValue = (id, fallback) => {
          const value = getValue(id);
          return value === '' ? (fallback ?? null) : Number(value);
        };
        return {
          id: project.id || getValue('inv-project-select') || null,
          client_id: project.client_id || getValue('inv-client-select') || null,
          name: getValue('inv-project-name'),
          client_name: project.client_name || getValue('inv-client-name'),
          project_manager: getValue('inv-project-manager'),
          status: getValue('inv-project-status'),
          health: getValue('inv-project-health'),
          progress: numberValue('inv-project-progress', null),
          due_date: getValue('inv-project-due-date') || null,
          budget: numberValue('inv-project-budget', null),
          expenses: numberValue('inv-project-expenses', null),
          revenue: numberValue('inv-project-revenue', null),
          summary: getValue('inv-project-summary'),
          notes: getValue('inv-project-notes'),
        };
      }
      function applyProjectFields(project = {}, snapshot = {}) {
        const source = { ...project, ...snapshot };
        setFieldValue('inv-project-name', source.name);
        setFieldValue('inv-project-manager', source.project_manager);
        setFieldValue('inv-project-status', source.status);
        setFieldValue('inv-project-health', source.health);
        setFieldValue('inv-project-progress', source.progress);
        setFieldValue('inv-project-due-date', source.due_date ? String(source.due_date).slice(0, 10) : '');
        setFieldValue('inv-project-budget', source.budget);
        setFieldValue('inv-project-expenses', source.expenses);
        setFieldValue('inv-project-revenue', source.revenue);
        setFieldValue('inv-project-summary', source.summary);
        setFieldValue('inv-project-notes', source.notes);
        const message = document.getElementById('inv-project-status-message');
        if (message) {
          message.textContent = source.name
            ? `Loaded ${source.name}. Project finance fields are internal and will not be printed on the customer invoice.`
            : 'Project details will appear here after selection.';
        }
      }
      function applyClientDetails(clientId) {
        const client = state.data.clients.find((item) => String(item.id) === String(clientId));
        if (!client) return;
        setFieldValue('inv-client-name', client.company || client.name, true);
        setFieldValue('inv-client-contact', client.name, true);
        setFieldValue('inv-client-email', client.email, true);
        setFieldValue('inv-client-phone', client.phone, true);
        setFieldValue('inv-client-address', client.notes || '', true);
      }
      function selectProject(projectId, snapshot = null) {
        const select = document.getElementById('inv-project-select');
        if (select) select.value = projectId ? String(projectId) : '';
        const project = selectedProject() || {};
        applyProjectFields(project, snapshot || {});
        const clientId = project.client_id || snapshot?.client_id;
        if (clientId) {
          const clientSelect = document.getElementById('inv-client-select');
          if (clientSelect) clientSelect.value = String(clientId);
          applyClientDetails(clientId);
        }
        updatePreview();
      }
      function setAssetStatus(message, isError = false) {
        const element = document.getElementById('inv-asset-status');
        if (!element) return;
        element.textContent = message;
        element.style.color = isError ? 'var(--crm-red)' : 'var(--crm-muted)';
      }

      function setPreview(id, url) {
        const element = document.getElementById(id);
        if (!element) return;
        replaceSafeMarkup(element, url
          ? `<img src="${escapeHtml(url)}" alt="Saved invoice asset" style="max-height:40px;border-radius:4px;">`
          : '<span>No asset selected</span>');
      }

      function setCurrentSignature(url) {
        const element = document.getElementById('inv-current-signature');
        if (!element) return;
        replaceSafeMarkup(element, url
          ? `<img src="${escapeHtml(url)}" alt="Current saved signature">`
          : '<span style="display:block;margin-top:8px;color:#94a3b8;font-size:11px;">No saved signature</span>');
      }

      function renderAssetList() {
        const element = document.getElementById('inv-asset-list');
        if (!element) return;
        const assets = readLocalAssets().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        replaceSafeMarkup(element, assets.length ? assets.map((asset) => `<div class="inv-asset-row">
          <div style="min-width:0;"><strong>${escapeHtml(asset.file_name || 'Asset')}</strong><span>${escapeHtml(asset.category || 'asset')} · ${escapeHtml(asset.mime_type || 'file')}</span></div>
          <div style="display:flex;align-items:center;gap:8px;"><a href="${escapeHtml(asset.url || '')}" target="_blank" rel="noopener">Open</a><button class="crm-button danger" type="button" data-delete-invoice-asset="${escapeHtml(asset.id)}" style="min-height:28px;padding:0 8px;font-size:11px;">Delete</button></div>
        </div>`).join('') : '<div style="color:#94a3b8;font-size:11px;">No browser-stored assets yet.</div>');
      }

      async function deleteLocalAsset(assetId) {
        const assets = readLocalAssets();
        const asset = assets.find((row) => row.id === assetId);
        if (!asset || !confirm('Delete this asset from browser storage?')) return;
        try {
          if (asset.object_key && asset.storage_mode === 'cloud') await window.tmCrm.repository.deleteInvoiceAsset(asset.object_key);
          writeLocalAssets(assets.filter((row) => row.id !== assetId));
        } catch (error) {
          setAssetStatus(error instanceof Error ? error.message : 'Could not delete cloud asset.', true);
          return;
        }
        if (asset.category === 'signature' && getPreviewSrc('inv-sign-preview') === asset.url) {
          setPreview('inv-sign-preview', '');
          setCurrentSignature('');
          updatePreview();
        }
        if (asset.category === 'qr_code' && getPreviewSrc('inv-qr-preview') === asset.url) {
          setPreview('inv-qr-preview', '');
          updatePreview();
        }
        renderAssetList();
        setAssetStatus('Asset deleted.');
      }

      async function saveAsset(file, category, previewId) {
        if (!file) return null;
        const fileName = file.name || 'asset';
        let url = '';
        let objectKey = '';
        setAssetStatus('Saving asset...');
        try {
          const result = await window.tmCrm.repository.uploadInvoiceAsset(category, file);
          url = result.url;
          objectKey = result.path || '';
        } catch (error) {
          setAssetStatus(error instanceof Error ? error.message : 'Could not save asset.', true);
          throw error;
        }
        if (!url) throw new Error('Could not create an asset preview.');
        const asset = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, object_key: objectKey || fileName, url, file_name: fileName, mime_type: file.type || '', size_bytes: file.size || 0, category, storage_mode: 'cloud', created_at: new Date().toISOString() };
        writeLocalAssets([asset, ...readLocalAssets().filter((row) => row.id !== asset.id)]);
        if (previewId) setPreview(previewId, url);
        if (category === 'signature') setCurrentSignature(url);
        renderAssetList();
        updatePreview();
        try {
          await saveSharedInvoiceBranding();
        } catch (error) {
          setAssetStatus(error instanceof Error ? error.message : 'Could not save shared invoice branding.', true);
          throw error;
        }
        setAssetStatus(`${fileName} saved.`);
        return asset;
      }

      async function saveSharedInvoiceBranding() {
        const assets = readLocalAssets();
        const assetPath = (category) => assets.find((asset) => asset.category === category && asset.storage_mode === 'cloud')?.object_key || '';
        const settingsFields = {
          logoUrl: '',
          qrUrl: '',
          signUrl: '',
          logoPath: assetPath('logo'),
          qrPath: assetPath('qr_code'),
          signPath: assetPath('signature'),
        };
        await portal('/api/portal/settings/invoice', { method: 'PATCH', body: JSON.stringify(settingsFields) });
      }

      // Load saved company settings from the project's category/settings schema.
      async function loadBuilderSettings() {
        try {
          // Company-wide configuration is loaded during workspace boot. Do not
          // restore customer or invoice draft fields from settings: those values
          // belong to a single invoice and can otherwise overwrite a new draft.
          const s = state.invoiceSettings || {};
          if (Object.keys(s).length) {
            const setVal = (id, val) => {
              const el = document.getElementById(id);
              if (el && val !== undefined && val !== null) el.value = String(val);
            };

            setVal('inv-company-name', s.companyName || state.companySettings?.company_name || 'TechMigos');
            setVal('inv-company-tagline', s.companyTagline || '');
            setVal('inv-contact-person', s.contactPerson || '');
            setVal('inv-contact-number', s.contactNumber || state.companySettings?.company_phone || '');
            setVal('inv-contact-email', s.contactEmail || state.companySettings?.company_email || '');
            setVal('inv-gst', s.gst || '');
            setVal('inv-payment', s.default_payment_instructions ?? s.paymentTerms ?? '');
            setVal('inv-terms', s.default_terms ?? s.terms ?? '');
            setVal('inv-currency', s.currency || state.companySettings?.currency || 'INR');
            setVal('inv-tax-rate', s.tax_rate ?? s.taxRate ?? 18);
            const localAssets = readLocalAssets();
            setPreview('inv-logo-preview', s.logoUrl || await resolveInvoiceAsset(s.logoPath || s.logo_path, localAssets.find((asset) => asset.category === 'logo')?.url || ''));
            setPreview('inv-qr-preview', s.qrUrl || await resolveInvoiceAsset(s.qrPath || s.qr_path, localAssets.find((asset) => asset.category === 'qr_code')?.url || ''));
            setPreview('inv-sign-preview', s.signUrl || await resolveInvoiceAsset(s.signPath || s.sign_path, localAssets.find((asset) => asset.category === 'signature')?.url || ''));
            setCurrentSignature(getPreviewSrc('inv-sign-preview'));
          }
        } catch (e) { console.warn('Could not load builder settings:', e); }
        renderAssetList();
        updatePreview();
      }

      async function loadInvoiceData(invoiceId) {
        try {
          const res = await portal(`/api/portal/invoices/${invoiceId}`);
          const { invoice, items } = res.detail;
          if (invoice) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            const setCheckbox = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

            setVal('inv-number', invoice.invoice_number);
            setVal('inv-date', invoice.invoice_date ? invoice.invoice_date.slice(0, 10) : '');
            setVal('inv-due-date', invoice.due_date ? invoice.due_date.slice(0, 10) : '');
            setVal('inv-status', invoiceEffectiveStatus(invoice) || 'auto');
            setVal('inv-currency', invoice.currency || 'INR');
            setVal('inv-tax-rate', invoice.total_amount ? (Number(invoice.tax_amount || 0) / Math.max(Number(invoice.total_amount || 0) - Number(invoice.tax_amount || 0) + Number(invoice.discount_amount || 0), 1) * 100).toFixed(2) : 18);
            setVal('inv-discount', invoice.discount_amount || 0);
            setVal('inv-received', invoicePaidAmount(invoice));
            setVal('inv-notes', invoice.notes);
            setVal('inv-payment', invoice.payment_instructions);
            setVal('inv-terms', invoice.terms);
            setVal('inv-client-name', invoice.customer_name);
            setVal('inv-client-email', invoice.customer_email);
            setVal('inv-client-phone', invoice.customer_phone);
            setVal('inv-client-address', invoice.billing_address);
            setCheckbox('inv-is-recurring', invoice.is_recurring);
            const clientSelect = document.getElementById('inv-client-select');
            if (clientSelect && invoice.client_id) clientSelect.value = String(invoice.client_id);
            const projectSnapshot = invoice.project_snapshot && typeof invoice.project_snapshot === 'object'
              ? invoice.project_snapshot
              : state.data.projects.find((project) => String(project.id) === String(invoice.project_id)) || {};
            selectProject(invoice.project_id || projectSnapshot.id, projectSnapshot);
            setVal('inv-client-name', invoice.customer_name);
            setVal('inv-client-email', invoice.customer_email);
            setVal('inv-client-phone', invoice.customer_phone);
            setVal('inv-client-address', invoice.billing_address);

            if (invoice.company_name) setVal('inv-company-name', invoice.company_name);
            if (invoice.gst_number) setVal('inv-gst', invoice.gst_number);
            const savedBranding = invoiceBranding(invoice);
            const signatureUrl = await resolveStoredInvoiceAsset(savedBranding.signature_url, savedBranding.signature_path || invoice.sign_url, getPreviewSrc('inv-sign-preview'));
            if (savedBranding.logo_url || savedBranding.logo_path) setPreview('inv-logo-preview', await resolveStoredInvoiceAsset(savedBranding.logo_url, savedBranding.logo_path));
            if (savedBranding.qr_url || savedBranding.qr_path) setPreview('inv-qr-preview', await resolveStoredInvoiceAsset(savedBranding.qr_url, savedBranding.qr_path));
            if (signatureUrl) setPreview('inv-sign-preview', signatureUrl);
            setCurrentSignature(signatureUrl);

            const tbody = document.getElementById('inv-items-tbody');
            if (tbody) {
              tbody.replaceChildren();
              if (items && items.length) {
                items.forEach(item => addItemRow({
                  desc: item.description,
                  qty: item.quantity,
                  unit: item.unit,
                  notes: item.notes,
                  rate: item.rate
                }));
              }
            }
            updatePreview();
          }
        } catch (e) {
          console.error('Failed to load invoice data:', e);
          showToast('Failed to load invoice: ' + e.message, 'error');
        }
      }

      // File uploads are routed through the CRM root's delegated change handler.
      async function handleFileInput(input) {
        const file = input?.files?.[0];
        if (!file) return;
        const configuration = {
          'inv-logo-input': ['logo', 'inv-logo-preview'],
          'inv-qr-input': ['qr_code', 'inv-qr-preview'],
          'inv-sign-input': ['signature', 'inv-sign-preview'],
          'inv-asset-input': ['asset', ''],
          'inv-signature-asset-input': ['signature', 'inv-sign-preview'],
        }[input.id];
        if (!configuration) return;
        try { await saveAsset(file, configuration[0], configuration[1] || null); }
        catch (error) { setAssetStatus(error instanceof Error ? error.message : 'Could not save asset.', true); }
        input.value = '';
      }

      const signaturePad = document.getElementById('inv-signature-pad');
      const signatureContext = signaturePad?.getContext('2d');
      function signaturePoint(event) {
        const rect = signaturePad.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * (signaturePad.width / rect.width), y: (event.clientY - rect.top) * (signaturePad.height / rect.height) };
      }
      signaturePad?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        signaturePad.setPointerCapture(event.pointerId);
        const point = signaturePoint(event);
        signing = true;
        hasSignatureInk = true;
        signatureContext.beginPath();
        signatureContext.moveTo(point.x, point.y);
      });
      signaturePad?.addEventListener('pointermove', (event) => {
        if (!signing) return;
        event.preventDefault();
        const point = signaturePoint(event);
        signatureContext.lineTo(point.x, point.y);
        signatureContext.strokeStyle = '#111827';
        signatureContext.lineWidth = 4;
        signatureContext.lineCap = 'round';
        signatureContext.lineJoin = 'round';
        signatureContext.stroke();
      });
      signaturePad?.addEventListener('pointerup', () => { signing = false; });
      signaturePad?.addEventListener('pointercancel', () => { signing = false; });
      function clearSignature() {
        if (!signatureContext || !signaturePad) return;
        signatureContext.clearRect(0, 0, signaturePad.width, signaturePad.height);
        hasSignatureInk = false;
      }
      async function saveDrawnSignature() {
        if (!signaturePad || !hasSignatureInk) return setAssetStatus('Draw a signature before saving.', true);
        try {
          const blob = await new Promise((resolve) => signaturePad.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Could not read the signature pad.');
          const file = new File([blob], `signature-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
          await saveAsset(file, 'signature', 'inv-sign-preview');
        } catch (error) { setAssetStatus(error.message, true); }
      }

      // Add item row
      function addItemRow(data) {
        const tbody = document.getElementById('inv-items-tbody');
        if (!tbody) return;
        const table = document.createElement('div');
        replaceSafeMarkup(table, `<table><tbody><tr>
          <td><input type="text" class="inv-item-desc" value="${escapeHtml(data?.desc || '')}" placeholder="Service description" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"><textarea class="inv-item-notes" placeholder="Optional line-item note" rows="1" style="width:100%;margin-top:5px;padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;resize:vertical;">${escapeHtml(data?.notes || '')}</textarea></td>
          <td><input type="number" class="inv-item-qty" value="${Number(data?.qty || 1)}" min="0" step="0.01" style="width:60px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"></td>
          <td><input type="text" class="inv-item-unit" value="${escapeHtml(data?.unit || 'SERVICE')}" placeholder="Unit" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"></td>
          <td><input type="number" class="inv-item-rate" value="${Number(data?.rate || 0)}" min="0" step="0.01" style="width:90px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"></td>
          <td class="inv-item-total" style="font-weight:600;padding:6px 8px;">${formatCurrency((data?.qty || 1) * (data?.rate || 0))}</td>
          <td><button type="button" class="inv-remove-item crm-button" style="background:#fee2e2;color:#dc2626;padding:4px 8px;font-size:12px;">✕</button></td>
        </tr></tbody></table>`);
        const tr = table.querySelector('tbody > tr');
        if (!tr) return;
        tbody.appendChild(tr);
        updatePreview();
      }

      // Format currency
      function formatCurrency(amount) {
        const currency = getValue('inv-currency') || 'INR';
        const symbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || currency;
        return `${symbol} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // Live preview update
      function updatePreview() {
        const preview = document.getElementById('inv-preview-container');
        if (!preview) return;
        const g = getValue;
        const logoSrc = getPreviewSrc('inv-logo-preview') || '/icon.png';
        const signSrc = getPreviewSrc('inv-sign-preview');

        // Collect items
        const rows = document.querySelectorAll('#inv-items-tbody tr');
        const items = [];
        let subtotal = 0;
        rows.forEach(row => {
          const desc = row.querySelector('.inv-item-desc')?.value || '';
          const qty = Math.max(Number(row.querySelector('.inv-item-qty')?.value || 1) || 0, 0);
          const unit = row.querySelector('.inv-item-unit')?.value || 'SERVICE';
          const rate = Math.max(Number(row.querySelector('.inv-item-rate')?.value || 0) || 0, 0);
          const total = qty * rate;
          subtotal += total;
          const totalCell = row.querySelector('.inv-item-total');
          if (totalCell) totalCell.textContent = formatCurrency(total);
          items.push({ desc, qty, unit, rate, total });
        });

        const taxRate = Math.max(Number(g('inv-tax-rate') || 0) || 0, 0);
        const discount = Math.min(Math.max(Number(g('inv-discount') || 0) || 0, 0), subtotal);
        const taxable = Math.max(subtotal - discount, 0);
        const taxAmount = taxable * taxRate / 100;
        const grandTotal = taxable + taxAmount;
        const selectedStatus = g('inv-status') || 'auto';
        const requestedReceived = Math.max(Number(g('inv-received') || 0) || 0, 0);
        const received = selectedStatus === 'paid' ? grandTotal : Math.min(requestedReceived, grandTotal);
        const balance = Math.max(grandTotal - received, 0);
        const contact = [g('inv-contact-person'), g('inv-contact-number'), g('inv-contact-email')].filter(Boolean).join(' | ');
        const companyAddress = String(state.companySettings?.company_address || '').trim();
        const invoiceNumber = String(g('inv-number') || 'INV-001');
        const paymentProfile = invoicePaymentProfile();
        const companyName = String(g('inv-company-name') || paymentProfile.merchant);
        const upiPaymentUri = buildUpiPaymentUri(paymentProfile.id, paymentProfile.merchant, invoiceNumber, balance);
        const upiQrUrl = buildUpiQrUrl(upiPaymentUri);
        const paymentMarkup = upiPaymentUri
          ? `<a href="${escapeHtml(upiPaymentUri)}" aria-label="Pay invoice ${escapeHtml(invoiceNumber)} using UPI"><img src="${escapeHtml(upiQrUrl)}" alt="UPI payment QR code for invoice ${escapeHtml(invoiceNumber)}"></a><div><strong>Scan or tap to Pay</strong></div><div>${escapeHtml(paymentProfile.merchant)}</div><div>${escapeHtml(paymentProfile.id)} · ${formatCurrency(balance)}</div><a href="${escapeHtml(upiPaymentUri)}" style="display:block;margin-top:4px;color:#0f766e;font-weight:700;text-decoration:underline;">Tap to pay</a>`
          : '<div style="color:#777;">Payment details are not configured.</div>';
        const terms = String(g('inv-terms') || '').trim();
        const termsMarkup = terms
          ? `<div style="white-space:pre-line;">${escapeHtml(terms)}</div>`
          : '<div style="color:#777;">No terms specified.</div>';
        const itemRowsMarkup = items.length
          ? items.map((item, index) => `<tr>
              <td class="col-sno">${index + 1}</td>
              <td class="col-services"><div class="inv-svc-title">${escapeHtml(item.desc || 'Service')}</div>${item.notes ? `<div class="inv-svc-desc">${escapeHtml(item.notes)}</div>` : ''}</td>
              <td class="col-qty">${escapeHtml(String(item.qty))} ${escapeHtml(item.unit)}</td>
              <td class="col-rate">${formatCurrency(item.rate)}</td>
              <td class="col-amount">${formatCurrency(item.total)}</td>
            </tr>`).join('')
          : '<tr><td colspan="5" style="padding:18px;text-align:center;color:#777;">No items added</td></tr>';

        replaceSafeMarkup(preview, `
          <div class="inv-preview-sheet">
            <div class="inv-sheet">
              <div class="inv-sheet-header">
                <div><img src="${escapeHtml(logoSrc)}" class="inv-sheet-logo" alt="Company logo"></div>
                <div class="inv-sheet-company">
                  <h2>${escapeHtml(companyName)}</h2>
                  ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
                  ${g('inv-company-tagline') ? `<p>${escapeHtml(g('inv-company-tagline'))}</p>` : ''}
                  ${g('inv-gst') ? `<p>GST: ${escapeHtml(g('inv-gst'))}</p>` : ''}
                  ${contact ? `<p>${escapeHtml(contact)}</p>` : ''}
                </div>
                <div class="inv-sheet-top-right"></div>
              </div>
              <div class="inv-bill-row">
                <div class="inv-bill-left">
                  <h3>BILL TO</h3>
                  <p><strong>${escapeHtml(g('inv-client-name')) || 'Client Name'}</strong></p>
                  ${g('inv-client-address') ? `<p>${escapeHtml(g('inv-client-address'))}</p>` : ''}
                  ${g('inv-client-phone') ? `<p>Mobile: ${escapeHtml(g('inv-client-phone'))}</p>` : ''}
                  ${g('inv-client-email') ? `<p>Email: ${escapeHtml(g('inv-client-email'))}</p>` : ''}
                </div>
                <div class="inv-bill-right">
                  <div><strong>Invoice No.</strong><p>${escapeHtml(invoiceNumber)}</p></div>
                  <div><strong>Invoice Date</strong><p>${escapeHtml(g('inv-date') || new Date().toISOString().split('T')[0])}</p></div>
                </div>
              </div>
              <table class="inv-table">
                <thead><tr><th class="col-sno">S.NO.</th><th class="col-services">SERVICES</th><th class="col-qty">QTY.</th><th class="col-rate">RATE</th><th class="col-amount">AMOUNT</th></tr></thead>
                <tbody>${itemRowsMarkup}<tr style="height:30px;"><td colspan="5"></td></tr></tbody>
                <tfoot><tr class="inv-total-row"><td colspan="2" style="text-align:right;">TOTAL</td><td style="text-align:center;">${items.reduce((sum, item) => sum + item.qty, 0)}</td><td></td><td style="text-align:right;">${formatCurrency(grandTotal)}</td></tr></tfoot>
              </table>
              <div style="padding:7px 14px;text-align:right;font-size:12px;line-height:1.45;">
                <div>Subtotal: <strong>${formatCurrency(subtotal)}</strong></div>
                ${discount ? `<div>Discount: <strong>- ${formatCurrency(discount)}</strong></div>` : ''}
                ${taxRate ? `<div>Tax (${taxRate}%): <strong>${formatCurrency(taxAmount)}</strong></div>` : ''}
                <div style="font-size:15px;margin-top:3px;">Grand Total: <strong>${formatCurrency(grandTotal)}</strong></div>
              </div>
              <div class="inv-paid-row"><div><strong>Received Amount: ${formatCurrency(received)}</strong></div><div><strong>Balance Amount: ${formatCurrency(balance)}</strong></div></div>
              ${g('inv-notes') ? `<div class="inv-notes-row"><strong>Notes:</strong> ${escapeHtml(g('inv-notes'))}</div>` : ''}
              <div class="inv-bottom-row">
                <div class="inv-terms-box"><h3>Terms and Conditions</h3>${termsMarkup}</div>
                <div class="inv-sign-box">
                  <div class="inv-qr-panel">
                    ${paymentMarkup}
                    ${g('inv-payment') ? `<div style="margin-top:4px;font-size:9px;white-space:pre-line;">${escapeHtml(g('inv-payment'))}</div>` : ''}
                  </div>
                  <div class="inv-sign-panel">${signSrc ? `<img src="${escapeHtml(signSrc)}" alt="Authorised signature">` : '<div style="height:60px;"></div>'}<div>Authorised Signatory For<br>${escapeHtml(companyName)}</div></div>
                </div>
              </div>
            </div>
          </div>
        `);
      }

      // Save draft settings
      async function saveBuilderSettings() {
        const g = getValue;
        const logoSrc = getPreviewSrc('inv-logo-preview');
        const qrSrc = getPreviewSrc('inv-qr-preview');
        const signSrc = getPreviewSrc('inv-sign-preview');
        const settings = {
          companyName: g('inv-company-name'),
          companyTagline: g('inv-company-tagline'),
          contactPerson: g('inv-contact-person'),
          contactNumber: g('inv-contact-number'),
          contactEmail: g('inv-contact-email'),
          gst: g('inv-gst'),
          default_payment_instructions: g('inv-payment'),
          default_terms: g('inv-terms'),
          currency: g('inv-currency') || 'INR',
          tax_rate: Number(g('inv-tax-rate') || 0),
          logoUrl: logoSrc,
          qrUrl: qrSrc,
          signUrl: signSrc,
        };
        try {
          const response = await portal('/api/portal/settings/invoice', { method: 'PATCH', body: JSON.stringify(settings) });
          state.invoiceSettings = response.settings || { ...(state.invoiceSettings || {}), ...settings };
          showToast('Invoice builder settings saved', 'success');
        } catch (e) { showToast('Failed to save: ' + e.message, 'error'); }
      }

      // Save invoice to Supabase crm_invoices / crm_invoice_items
      async function saveInvoice() {
        const g = getValue;
        const clientNameInput = g('inv-client-name');
        if (!clientNameInput) { showToast('Client name is required', 'error'); return; }
        if (!g('inv-number')) { showToast('Invoice number is required', 'error'); return; }

        const projectSnapshot = projectFieldSnapshot();
        const selectedClientId = g('inv-client-select') || projectSnapshot.client_id;
        const matchedClient = state.data.clients.find(c => String(c.id) === String(selectedClientId)) || state.data.clients.find(c => (c.company || c.name || '').toLowerCase() === clientNameInput.toLowerCase());

        const rows = document.querySelectorAll('#inv-items-tbody tr');
        let totalAmount = 0;
        const invoiceItems = [];
        rows.forEach(row => {
          const desc = row.querySelector('.inv-item-desc')?.value || '';
          const qty = Math.max(Number(row.querySelector('.inv-item-qty')?.value || 1) || 0, 0);
          const unit = row.querySelector('.inv-item-unit')?.value || 'SERVICE';
          const rate = Math.max(Number(row.querySelector('.inv-item-rate')?.value || 0) || 0, 0);
          const notes = row.querySelector('.inv-item-notes')?.value || '';
          const total = qty * rate;
          totalAmount += total;
          if (desc.trim()) invoiceItems.push({ description: desc.trim(), quantity: qty, unit: unit.trim(), rate, notes: notes.trim(), total });
        });
        if (!invoiceItems.length) { showToast('Add at least one service item', 'error'); return; }
        const taxRate = Math.max(Number(g('inv-tax-rate') || 0) || 0, 0);
        const discountAmount = Math.min(Math.max(Number(g('inv-discount') || 0) || 0, 0), totalAmount);
        const taxAmount = Math.max(totalAmount - discountAmount, 0) * taxRate / 100;
        const grandTotal = Math.max(totalAmount - discountAmount, 0) + taxAmount;
        const selectedStatus = g('inv-status') || 'auto';
        const requestedReceivedAmount = Math.max(Number(g('inv-received') || 0) || 0, 0);
        const receivedAmount = selectedStatus === 'paid' ? grandTotal : Math.min(requestedReceivedAmount, grandTotal);
        const dueDate = g('inv-due-date');
        const dueDatePassed = dueDate && new Date(`${dueDate}T23:59:59`) < new Date();
        const balanceAmount = Math.max(grandTotal - receivedAmount, 0);
        const status = selectedStatus === 'auto'
          ? (grandTotal > 0 && balanceAmount <= 0 ? 'paid' : dueDatePassed && balanceAmount > 0 ? 'overdue' : receivedAmount > 0 ? 'sent' : 'draft')
          : selectedStatus;

        const localAssets = readLocalAssets();
        const assetPath = (category) => localAssets.find((asset) => asset.category === category && asset.storage_mode === 'cloud')?.object_key || '';
        const branding = {
          logo_url: '',
          qr_url: '',
          signature_url: '',
          logo_path: assetPath('logo'),
          qr_path: assetPath('qr_code'),
          signature_path: assetPath('signature'),
          company_name: g('inv-company-name'),
          company_tagline: g('inv-company-tagline'),
          company_address: state.companySettings?.company_address || '',
          company_phone: g('inv-contact-number') || state.companySettings?.company_phone || '',
          company_email: g('inv-contact-email') || state.companySettings?.company_email || '',
          upi_id: invoicePaymentProfile().id,
          upi_merchant_name: invoicePaymentProfile().merchant,
        };
        const projectId = projectSnapshot.id ? Number(projectSnapshot.id) : null;
        const payload = {
          client_id: matchedClient?.id || null,
          project_id: Number.isFinite(projectId) ? projectId : null,
          invoice_number: g('inv-number') || 'INV-' + Date.now(),
          customer_name: clientNameInput,
          customer_email: g('inv-client-email'),
          customer_phone: g('inv-client-phone'),
          billing_address: g('inv-client-address'),
          currency: g('inv-currency') || 'INR',
          service_title: invoiceItems[0]?.description || '',
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: grandTotal,
          received_amount: receivedAmount,
          status,
          invoice_date: g('inv-date') || new Date().toISOString().split('T')[0],
          due_date: g('inv-due-date') || null,
          notes: g('inv-notes'),
          payment_instructions: g('inv-payment'),
          terms: g('inv-terms'),
          sign_url: branding.signature_path,
          project_snapshot: projectSnapshot,
          invoice_branding: branding,
          is_recurring: isChecked('inv-is-recurring'),
          items: invoiceItems
        };

        // Keep line items out of the invoice row itself. Passing an `items: undefined`
        // property relies on the client serializer to drop it and can make the
        // PostgREST insert/update fail instead of returning the saved invoice.
        const invoicePayload = { ...payload };
        delete invoicePayload.items;
        let savedInvoice = null;

        try {
          const endpoint = state.invoiceBuilderId
            ? `/api/portal/invoices/${encodeURIComponent(state.invoiceBuilderId)}`
            : '/api/portal/invoices';
          const result = await portal(endpoint, {
            method: state.invoiceBuilderId ? 'PATCH' : 'POST',
            body: JSON.stringify({ ...invoicePayload, items: invoiceItems }),
          });
          savedInvoice = result.item;
          if (savedInvoice) upsertInvoiceRecord(savedInvoice);
          showToast(state.invoiceBuilderId ? 'Invoice updated successfully' : 'Invoice created successfully');

          // Open the actual invoice records view after saving. The default
          // overview only contains finance transactions, so it cannot show
          // invoices even when the insert succeeded.
          state.financeSheet = 'invoices';
          state.accTab = 'invoices';
          state.invoiceBuilderActive = false;
          state.invoiceBuilderId = null;

          // loadData starts from sessionStorage for a fast render. Re-apply the
          // just-saved row afterwards so a stale cache or a temporary list-fetch
          // failure cannot hide a successful save from the records table.
          await loadData();
          if (savedInvoice) upsertInvoiceRecord(savedInvoice);
          renderFinance();
          bindActions();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Save invoice failed';
          console.error('Invoice save failed:', error);
          showToast(message);
        }
      }

      state.invoiceBuilderActions = {
        addItemRow,
        applyClientDetails,
        clearSignature,
        deleteLocalAsset,
        handleClick: (element, event) => handleInvoiceBuilderClick(element, event, state.invoiceBuilderActions),
        handleInput: (element) => handleInvoiceBuilderInput(element, state.invoiceBuilderActions),
        handleChange: (element) => handleInvoiceBuilderChange(element, state.invoiceBuilderActions),
        handleFileInput,
        saveBuilderSettings,
        saveDrawnSignature,
        saveInvoice,
        selectProject,
        updatePreview,
      };

      // Initial preview
      const today = new Date().toISOString().slice(0, 10);
      if (!getValue('inv-company-name')) document.getElementById('inv-company-name').value = 'TechMigos';
      if (!getValue('inv-number')) {
        const settings = state.invoiceSettings || {};
        const prefix = String(settings.prefix || 'TM/INV').trim();
        const firstNumber = Math.max(Number(settings.starting_number) || 1, 1);
        const usedNumbers = new Set((state.data.invoices || []).map((invoice) => String(invoice.invoice_number || '').toLowerCase()));
        let nextNumber = firstNumber;
        while (usedNumbers.has(`${prefix}-${nextNumber}`.toLowerCase())) nextNumber += 1;
        document.getElementById('inv-number').value = `${prefix}-${nextNumber}`;
      }
      if (!getValue('inv-date')) document.getElementById('inv-date').value = today;
      if (!getValue('inv-due-date')) document.getElementById('inv-due-date').value = today;
      if (!document.querySelector('#inv-items-tbody tr')) addItemRow();
      updatePreview();

      // Load settings or invoice details
      if (state.invoiceBuilderId) {
        loadBuilderSettings().then(() => loadInvoiceData(state.invoiceBuilderId));
      } else {
        loadBuilderSettings();
      }

}

export function renderInvoiceBuilder(context) {
  const { state, escapeHtml } = context;
  return `<div class="crm-card mt-5" style="padding:0;overflow:visible;">
    <div class="inv-builder-layout">
      <div class="inv-builder-form" id="inv-builder-form">
        <div class="crm-card inv-project-card" style="padding:18px;border:2px solid #bfdbfe;background:#f8fbff;">
          <div class="inv-section-title" style="margin-top:0;">Project & Invoice Context</div>
          <p style="margin:0 0 12px;color:#64748b;font-size:12px;line-height:1.5;">Select the project first. Its client and project information will be copied into this invoice and preserved with the saved document.</p>
          <label style="display:block;font-size:12px;font-weight:800;color:#27364a;margin-bottom:12px;">Project
            <select id="inv-project-select" class="crm-select" style="width:100%;margin-top:6px;">
              <option value="">— Select a project —</option>
              ${state.data.projects.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name || 'Untitled project')}${project.client_name ? ` · ${escapeHtml(project.client_name)}` : ''}</option>`).join('')}
            </select>
          </label>
          <div id="inv-project-status-message" class="inv-project-status-message" role="status">Project details will appear here after selection.</div>
          <div class="crm-form-grid">
            <label>Project Name<input id="inv-project-name" class="crm-input" placeholder="Project name" value="" style="width:100%;" /></label>
            <label>Project Manager<input id="inv-project-manager" class="crm-input" placeholder="Project manager" value="" style="width:100%;" /></label>
            <label>Project Status<select id="inv-project-status" class="crm-select" style="width:100%;"><option value="">—</option><option value="planning">Planning</option><option value="active">Active</option><option value="review">Review</option><option value="completed">Completed</option><option value="on_hold">On hold</option><option value="cancelled">Cancelled</option></select></label>
            <label>Project Health<select id="inv-project-health" class="crm-select" style="width:100%;"><option value="">—</option><option value="on_track">On track</option><option value="watch">Watch</option><option value="at_risk">At risk</option><option value="breached">Breached</option></select></label>
            <label>Progress (%)<input id="inv-project-progress" type="number" min="0" max="100" step="1" class="crm-input" placeholder="0" value="" style="width:100%;" /></label>
            <label>Project Due Date<input id="inv-project-due-date" type="date" class="crm-input" style="width:100%;" /></label>
            <label>Project Budget <span style="font-weight:500;color:#64748b;">(internal)</span><input id="inv-project-budget" type="number" min="0" step="0.01" class="crm-input" placeholder="0" value="" style="width:100%;" /></label>
            <label>Project Expenses <span style="font-weight:500;color:#64748b;">(internal)</span><input id="inv-project-expenses" type="number" min="0" step="0.01" class="crm-input" placeholder="0" value="" style="width:100%;" /></label>
            <label>Project Revenue <span style="font-weight:500;color:#64748b;">(internal)</span><input id="inv-project-revenue" type="number" min="0" step="0.01" class="crm-input" placeholder="0" value="" style="width:100%;" /></label>
            <label class="full">Project Summary / Scope<textarea id="inv-project-summary" class="crm-input" placeholder="Short project scope or deliverables" rows="2" style="width:100%;min-height:48px;"></textarea></label>
            <label class="full">Project Notes <span style="font-weight:500;color:#64748b;">(internal)</span><textarea id="inv-project-notes" class="crm-input" placeholder="Internal project notes" rows="2" style="width:100%;min-height:48px;"></textarea></label>
          </div>
        </div>

        <div class="crm-card" style="padding:18px;">
          <div class="inv-section-title">Company Settings</div>
          <div class="crm-form-grid">
            <label>Company Name<input id="inv-company-name" class="crm-input" placeholder="Your Company" value="" style="width:100%;" /></label>
            <label>Company Tagline<input id="inv-company-tagline" class="crm-input" placeholder="Excellence in Digital" value="" style="width:100%;" /></label>
            <label>Contact Person<input id="inv-contact-person" class="crm-input" placeholder="Full Name" value="" style="width:100%;" /></label>
            <label>Contact Number<input id="inv-contact-number" class="crm-input" placeholder="+91 XXXXX XXXXX" value="" style="width:100%;" /></label>
            <label>Contact Email<input id="inv-contact-email" class="crm-input" placeholder="billing@company.com" value="" style="width:100%;" /></label>
            <label>GST / Tax ID<input id="inv-gst" class="crm-input" placeholder="GST Number" value="" style="width:100%;" /></label>
          </div>
          <div class="inv-upload-grid" style="margin-top:14px;">
            <div class="inv-upload-box"><label>Company Logo<input type="file" id="inv-logo-input" accept="image/*" style="display:none;" /></label><div class="inv-upload-preview" id="inv-logo-preview"><span>No logo selected</span></div></div>
            <div class="inv-upload-box"><label>UPI QR (generated automatically)</label><div class="inv-upload-preview" id="inv-qr-preview"><span>Generated from invoice number and balance</span></div></div>
            <div class="inv-upload-box"><label>Signature<input type="file" id="inv-sign-input" accept="image/*" style="display:none;" /></label><div class="inv-upload-preview" id="inv-sign-preview"><span>No signature selected</span></div></div>
          </div>
          <div class="inv-assets-panel">
            <h4>Invoice assets</h4>
            <p>Logo and signature are shared invoice defaults for every project. The UPI QR is generated per invoice from its number and balance, so issued PDFs always carry the correct payment details.</p>
            <div class="inv-assets-tools">
              <div class="inv-signature-pad-wrap">
                <strong style="font-size:12px;color:#27364a;">Draw signature</strong>
                <canvas id="inv-signature-pad" class="inv-signature-pad" width="760" height="260" aria-label="Invoice signature pad"></canvas>
                <div class="inv-asset-actions">
                  <button class="crm-button primary" type="button" id="inv-save-drawn-signature">Save Drawn Signature</button>
                  <button class="crm-button" type="button" id="inv-clear-signature">Clear Pad</button>
                  <label class="crm-button inv-asset-file">Upload Asset<input type="file" id="inv-asset-input" /></label>
                </div>
              </div>
              <div class="inv-asset-current">
                <strong style="font-size:12px;color:#27364a;">Current signature</strong>
                <div id="inv-current-signature"><span style="display:block;margin-top:8px;color:#94a3b8;font-size:11px;">No saved signature</span></div>
                <label class="crm-button inv-asset-file" style="margin-top:8px;">Upload Signature<input type="file" id="inv-signature-asset-input" accept="image/*" /></label>
              </div>
            </div>
            <span id="inv-asset-status" class="inv-asset-status" role="status"></span>
            <div id="inv-asset-list" class="inv-asset-list"></div>
          </div>
        </div>

        <div class="crm-card" style="padding:18px;margin-top:16px;">
          <div class="inv-section-title">Client Details</div>
          <div style="margin-bottom:14px;">
            <label style="font-size:12px;font-weight:800;color:#27364a;display:block;margin-bottom:6px;">Select Existing Client</label>
            <select id="inv-client-select" class="crm-select" required style="width:100%;">
              <option value="">— Choose a Client to Auto-Fetch Details —</option>
              ${state.data.clients.map(c => `<option value="${c.id}">${escapeHtml(c.company || c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="crm-form-grid">
            <label>Client / Company Name<input id="inv-client-name" class="crm-input" placeholder="Client Company" value="" style="width:100%;" /></label>
            <label>Contact Person<input id="inv-client-contact" class="crm-input" placeholder="Client Contact" value="" style="width:100%;" /></label>
            <label>Email<input id="inv-client-email" class="crm-input" placeholder="client@email.com" value="" style="width:100%;" /></label>
            <label>Phone<input id="inv-client-phone" class="crm-input" placeholder="Phone" value="" style="width:100%;" /></label>
            <label class="full">Address<textarea id="inv-client-address" class="crm-input" placeholder="Billing Address" rows="2" style="width:100%;min-height:48px;"></textarea></label>
          </div>
        </div>

        <div class="crm-card" style="padding:18px;margin-top:16px;">
          <div class="inv-section-title">Invoice Details</div>
          <div class="crm-form-grid">
            <label>Invoice Number<input id="inv-number" class="crm-input" placeholder="INV-001" value="" style="width:100%;" /></label>
            <label>Invoice Date<input id="inv-date" type="date" class="crm-input" style="width:100%;" /></label>
            <label>Due Date<input id="inv-due-date" type="date" class="crm-input" style="width:100%;" /></label>
            <label>Status<select id="inv-status" class="crm-select" style="width:100%;"><option value="auto">Auto</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select></label>
            <label>Currency<select id="inv-currency" class="crm-select" style="width:100%;"><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option></select></label>
            <label>Tax Rate (%)<input id="inv-tax-rate" type="number" min="0" step="0.01" class="crm-input" value="18" style="width:100%;" /></label>
            <label>Discount<input id="inv-discount" type="number" min="0" step="0.01" class="crm-input" value="0" style="width:100%;" /></label>
            <label>Received Amount<input id="inv-received" type="number" min="0" step="0.01" class="crm-input" value="0" style="width:100%;" /></label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:20px;grid-column: span 2;"><input id="inv-is-recurring" type="checkbox" style="width:16px;height:16px;cursor:pointer;" /><strong>Recurring Invoice</strong></label>
          </div>
        </div>

        <div class="crm-card" style="padding:18px;margin-top:16px;">
          <div class="inv-section-title">Service Items</div>
          <div class="inv-items-editor" id="inv-items-editor">
            <table>
              <thead><tr><th style="width:42%">Service / Description</th><th style="width:10%">Qty</th><th style="width:12%">Unit</th><th style="width:14%">Rate</th><th style="width:14%">Total</th><th style="width:8%"></th></tr></thead>
              <tbody id="inv-items-tbody"></tbody>
            </table>
          </div>
          <button class="crm-button" type="button" id="inv-add-item" style="margin-top:10px;">+ Add Item</button>
          <div class="crm-form-grid" style="margin-top:14px;">
            <label>Notes<textarea id="inv-notes" class="crm-input" placeholder="Notes for the customer..." rows="2" style="width:100%;min-height:48px;"></textarea></label>
            <label>Payment Instructions<textarea id="inv-payment" class="crm-input" placeholder="Bank details, UPI, etc." rows="2" style="width:100%;min-height:48px;"></textarea></label>
            <label class="full">Terms and Conditions<textarea id="inv-terms" class="crm-input" placeholder="One term per line..." rows="3" style="width:100%;min-height:64px;"></textarea></label>
          </div>
        </div>
      </div>

      <div class="inv-builder-preview" id="inv-builder-preview">
        <div class="inv-preview-wrap" id="inv-preview-container"></div>
      </div>
    </div>
  </div>`;
}

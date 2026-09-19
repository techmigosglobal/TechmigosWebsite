import { replaceSafeMarkup } from '../safeMarkup.js';

export async function renderSettings(context) {
  const { state, els, isCompanyAdmin, pageHead, escapeHtml, badge, crmProjectIcon, portal } = context;
  if (!isCompanyAdmin()) {
    const myRole = state.profile?.role || 'company_member';
    replaceSafeMarkup(els.view, `${pageHead('My Profile & Preferences', 'View your account details and preferences.', '')}
      <div class="crm-two-col">
        <section class="crm-card">
          <div class="crm-card-head"><h2 class="crm-card-title">My Account</h2></div>
          <div class="crm-list">
            <div class="crm-list-row"><span>Name</span><strong>${escapeHtml(state.profile?.name || '—')}</strong></div>
            <div class="crm-list-row"><span>Email</span><strong style="font-size:12px;">${escapeHtml(state.profile?.email || '—')}</strong></div>
            <div class="crm-list-row"><span>Role</span>${badge(myRole, myRole === 'company_admin' ? 'purple' : 'blue')}</div>
            <div class="crm-list-row"><span>Department</span><strong>${escapeHtml(state.profile?.department || '—')}</strong></div>
          </div>
          <div class="crm-toolbar" style="padding:12px 18px;">
            <a class="crm-button" href="/reset-password" style="text-decoration:none;">Change Password</a>
          </div>
        </section>
        <section class="crm-card">
          <div class="crm-card-head"><h2 class="crm-card-title">Access scope</h2></div>
          <div class="crm-list">
            <div class="crm-list-row"><span>Company settings</span><strong>Managed by administrators</strong></div>
            <div class="crm-list-row"><span>Project files</span><strong>Only assigned internal projects</strong></div>
            <div class="crm-list-row"><span>Data visibility</span><strong>Restricted by your role</strong></div>
          </div>
        </section>
      </div>`);
    return;
  }

  replaceSafeMarkup(els.view, `<div class="settings-reference-page">
    ${pageHead('Settings', 'Manage your workspace', '<a class="crm-button" href="/" target="_blank" rel="noopener" style="text-decoration:none;">↗ View Public Profile</a><button class="crm-button primary" type="button" id="settings-save-all-btn">Save All</button>')}
    <div class="settings-reference-layout">
      <aside class="settings-reference-nav" aria-label="Settings sections">
        <button class="active" type="button" data-settings-section="settings-company">${crmProjectIcon('clients')}<span>Company Profile</span></button>
        <button type="button" data-settings-section="settings-branding">${crmProjectIcon('layers')}<span>Branding</span></button>
        <button type="button" data-settings-section="settings-project-defaults">${crmProjectIcon('folder')}<span>Project Settings</span></button>
        <button type="button" data-settings-section="settings-notifications">${crmProjectIcon('tickets')}<span>Notifications</span></button>
        <button type="button" data-settings-section="settings-security">${crmProjectIcon('reports')}<span>Security</span></button>
        <button type="button" data-settings-section="settings-integrations">${crmProjectIcon('layers')}<span>Integrations</span></button>
        <button type="button" data-settings-section="settings-invoice">${crmProjectIcon('finance')}<span>Billing</span></button>
        <button type="button" data-settings-section="settings-team">${crmProjectIcon('clients')}<span>Team &amp; Permissions</span></button>
        <button type="button" data-settings-section="settings-preferences">${crmProjectIcon('settings')}<span>System Preferences</span></button>
      </aside>
      <div class="settings-reference-grid">
        <p id="settings-status" style="font-size:12px;color:#64748b;margin-bottom:0;">Loading settings…</p>

    <!-- Company Profile -->
    <section id="settings-company" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head">
        <h2 class="crm-card-title">Company Profile</h2>
        <div class="crm-toolbar">
          <span id="status-company" style="font-size:11px;font-weight:700;color:#22c55e;display:none;">✓ Saved</span>
          <button class="crm-button primary" id="btn-save-company" type="button">Save Profile</button>
        </div>
      </div>
      <form class="crm-form-grid" id="form-company" novalidate>
        <label>Company Name *<input name="company_name" required placeholder="Your company name" /></label>
        <label>Company Email *<input name="company_email" type="email" required placeholder="contact@company.com" /></label>
        <label>Phone<input name="company_phone" placeholder="+91 XXXXXXXXXX" /></label>
        <label>Timezone<input name="timezone" placeholder="e.g. Asia/Kolkata" /></label>
        <label>Currency<input name="currency" placeholder="INR / USD / EUR" /></label>
        <label class="wide">Address<input name="company_address" placeholder="City, State, Country" /></label>
      </form>
    </section>

    <section id="settings-branding" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head">
        <div><h2 class="crm-card-title">Branding Preview</h2><p class="settings-reference-help">How your workspace identity appears to signed-in users.</p></div>
        <span class="settings-reference-live">Live</span>
      </div>
      <div class="settings-branding-preview">
        <img src="/icon.png" alt="TechMigos brand mark" />
        <div><strong id="settings-brand-name">TechMigos</strong><span id="settings-brand-tagline">Operations &amp; Management portal</span></div>
      </div>
      <p class="settings-reference-help">The brand mark is shared with the authenticated workspace and invoice presentation.</p>
    </section>

    <section id="settings-project-defaults" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head"><div><h2 class="crm-card-title">Default Project Settings</h2><p class="settings-reference-help">Defaults used by the live project creation workflow.</p></div><span class="settings-reference-readonly">Read only</span></div>
      <div class="settings-reference-facts">
        <div><span>Default status</span><strong>Planning</strong></div>
        <div><span>Default progress</span><strong>0%</strong></div>
        <div><span>Team access</span><strong>Assigned project members</strong></div>
        <div><span>Due date</span><strong>Optional</strong></div>
      </div>
    </section>

    <section id="settings-notifications" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head"><div><h2 class="crm-card-title">Notification Preferences</h2><p class="settings-reference-help">Live alerts surfaced from the workspace.</p></div></div>
      <div class="settings-reference-list">
        <div><span><strong>Project updates</strong><small>Shown from current project status and activity.</small></span><b class="settings-reference-indicator is-on">On</b></div>
        <div><span><strong>Support tickets</strong><small>Open and unresolved tickets appear in the notification count.</small></span><b class="settings-reference-indicator is-on">On</b></div>
        <div><span><strong>Invoice status</strong><small>Pending and overdue invoices are included in workspace alerts.</small></span><b class="settings-reference-indicator is-on">On</b></div>
      </div>
    </section>

    <!-- Invoice Defaults -->
    <section id="settings-invoice" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head">
        <h2 class="crm-card-title">Invoice Defaults</h2>
        <div class="crm-toolbar">
          <span id="status-invoice" style="font-size:11px;font-weight:700;color:#22c55e;display:none;">✓ Saved</span>
          <button class="crm-button primary" id="btn-save-invoice" type="button">Save Invoice Settings</button>
        </div>
      </div>
      <form class="crm-form-grid" id="form-invoice" novalidate>
        <label>Invoice Prefix<input name="prefix" placeholder="e.g. TMG" /></label>
        <label>Starting Number<input name="starting_number" type="number" min="1" placeholder="1" /></label>
        <label>Tax Label<input name="tax_label" placeholder="e.g. GST" /></label>
        <label>Default Tax Rate (%)<input name="tax_rate" type="number" min="0" step="0.01" placeholder="0" /></label>
        <label>UPI ID<input name="upi_id" placeholder="e.g. company@upi" autocomplete="off" /></label>
        <label>UPI Merchant Name<input name="upi_merchant_name" placeholder="Company name" /></label>
        <label class="wide">Payment Terms<textarea name="default_terms" rows="2" placeholder="e.g. Payment due within 30 days. All disputes subject to Hyderabad jurisdiction."></textarea></label>
        <label class="wide">Payment Instructions<textarea name="default_payment_instructions" rows="2" placeholder="e.g. UPI: techmigos@upi | A/C: 0000 | IFSC: XXXX"></textarea></label>
      </form>
    </section>

    <section id="settings-security" class="crm-card settings-reference-card" style="margin-bottom:16px;">
        <div class="crm-card-head"><h2 class="crm-card-title">Security & Access</h2></div>
        <div class="crm-list">
          <div class="crm-list-row"><span>Access model</span><strong>Role-Based (RBAC)</strong></div>
          <div class="crm-list-row"><span>Admin accounts</span><strong>${state.data.profiles.filter((p) => p.role === 'company_admin').length}</strong></div>
          <div class="crm-list-row"><span>Inactive accounts</span><strong>${state.data.profiles.filter((p) => p.status === 'inactive').length}</strong></div>
          <div class="crm-list-row"><span>Total users</span><strong>${state.data.profiles.length}</strong></div>
        </div>
        <div class="crm-toolbar" style="padding:12px 18px;">
          <a class="crm-button" href="/reset-password" style="text-decoration:none;">Reset Password</a>
          <button class="crm-button" data-jump="users" type="button">Manage Users</button>
        </div>
    </section>

    <section id="settings-integrations" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head"><div><h2 class="crm-card-title">Integrations</h2><p class="settings-reference-help">Connections available to this workspace.</p></div><span class="settings-reference-readonly">Live status</span></div>
      <div class="settings-reference-empty">
        <span class="settings-reference-empty-icon">${crmProjectIcon('layers')}</span>
        <strong>No integrations configured</strong>
        <p>There is no integration contract configured for this workspace yet. Live data remains managed through Supabase.</p>
      </div>
    </section>
    <section id="settings-team" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head"><div><h2 class="crm-card-title">Team &amp; Permissions</h2><p class="settings-reference-help">Review role-based access for the delivery team.</p></div><span class="settings-reference-readonly">Live access</span></div>
      <div class="settings-reference-facts"><div><span>Admin accounts</span><strong>${state.data.profiles.filter((p) => p.role === 'company_admin').length}</strong></div><div><span>Employee accounts</span><strong>${state.data.profiles.filter((p) => p.role === 'company_member').length}</strong></div><div><span>Client accounts</span><strong>${state.data.profiles.filter((p) => p.role === 'client').length}</strong></div><div><span>Access model</span><strong>Role-based access</strong></div></div>
      <div class="crm-toolbar" style="margin-top:14px;"><button class="crm-button" data-jump="users" type="button">Open User Management</button></div>
    </section>
    <section id="settings-preferences" class="crm-card settings-reference-card" style="margin-bottom:16px;">
      <div class="crm-card-head"><div><h2 class="crm-card-title">System Preferences</h2><p class="settings-reference-help">Workspace behavior follows the active browser and live portal configuration.</p></div><span class="settings-reference-readonly">Read only</span></div>
      <div class="settings-reference-list"><div><span><strong>Workspace language</strong><small>English interface labels are active.</small></span><b class="settings-reference-indicator is-on">English</b></div><div><span><strong>Motion</strong><small>Respect the browser reduced-motion preference.</small></span><b class="settings-reference-indicator is-on">Supported</b></div><div><span><strong>Data source</strong><small>Records are loaded from the live Supabase workspace.</small></span><b class="settings-reference-indicator is-on">Live</b></div></div>
    </section>
      </div>
    </div>
  </div>`);

  // Load real settings from Supabase
  try {
    const [companyRes, invoiceRes] = await Promise.all([
      portal('/api/portal/settings/company'),
      portal('/api/portal/settings/invoice'),
    ]);
    const cs = companyRes.settings || {};
    const inv = invoiceRes.settings || {};
    const brandName = document.getElementById('settings-brand-name');
    if (brandName && cs.company_name) brandName.textContent = cs.company_name;
    const cf = document.getElementById('form-company');
    const inf = document.getElementById('form-invoice');
    if (cf) {
      ['company_name','company_email','company_phone','timezone','currency','company_address'].forEach((k) => {
        const el = cf.querySelector(`[name="${k}"]`);
        if (el && cs[k]) el.value = cs[k];
      });
    }
    if (inf) {
      ['prefix','starting_number','tax_label','tax_rate','upi_id','upi_merchant_name','default_terms','default_payment_instructions'].forEach((k) => {
        const el = inf.querySelector(`[name="${k}"]`);
        if (el && inv[k] !== undefined) el.value = inv[k];
      });
    }
    document.getElementById('settings-status').textContent = '';
  } catch (e) {
    document.getElementById('settings-status').textContent = 'Could not load settings from server.';
  }

}

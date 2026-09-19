export function createWorkspaceNavigationClickHandler({
  state,
  document,
  window,
  navigator,
  confirmAction,
  replaceSafeMarkup,
  operationsChevronIcon,
  toggleSidebar,
  openNotifications,
  openProfileManagement,
  logout,
  loadData,
  toast,
  saveSettingsSection,
  renderUsers,
  openCreate,
  openDataReview,
}) {
  async function handle(element) {
    if (element.matches('[data-drawer-section-toggle]')) {
      const form = element.closest('#crm-edit-form');
      const sectionId = element.dataset.drawerSectionToggle;
      const body = form?.querySelector(`[data-drawer-section-body="${sectionId}"]`);
      const open = element.getAttribute('aria-expanded') !== 'false';
      element.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (body) body.hidden = open;
      replaceSafeMarkup(element, operationsChevronIcon(!open));
      return true;
    }
    if (element.matches('#crm-collapse')) {
      toggleSidebar();
      return true;
    }
    if (element.matches('#crm-notifications')) {
      await openNotifications();
      return true;
    }
    if (element.matches('#crm-profile-button')) {
      await openProfileManagement();
      return true;
    }
    if (element.matches('#crm-logout-btn')) {
      if (confirmAction('Sign out of the TechMigos workspace?')) await logout();
      return true;
    }
    if (element.matches('#crm-retry-load')) {
      await loadData();
      return true;
    }
    if (element.matches('#copy-generated-login-password')) {
      const password = document.getElementById('generated-login-password')?.textContent || '';
      try {
        await navigator.clipboard.writeText(password);
        toast('Temporary password copied.');
      } catch {
        toast('Select and copy the password manually.');
      }
      return true;
    }
    if (element.matches('[data-settings-section]')) {
      document.querySelectorAll('[data-settings-section]').forEach((item) => item.classList.remove('active'));
      element.classList.add('active');
      document.getElementById(element.dataset.settingsSection || '')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      return true;
    }
    if (element.matches('#btn-save-company')) {
      const form = document.getElementById('form-company');
      const name = form?.querySelector('[name="company_name"]')?.value?.trim();
      const email = form?.querySelector('[name="company_email"]')?.value?.trim();
      if (!name) {
        toast('Company name is required.');
        return true;
      }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        toast('Valid company email is required.');
        return true;
      }
      await saveSettingsSection('form-company', '/api/portal/settings/company', 'status-company');
      return true;
    }
    if (element.matches('#btn-save-invoice')) {
      await saveSettingsSection('form-invoice', '/api/portal/settings/invoice', 'status-invoice', normalizeInvoiceSettings);
      return true;
    }
    if (element.matches('#settings-save-all-btn')) {
      await saveSettingsSection('form-company', '/api/portal/settings/company', 'status-company');
      await saveSettingsSection('form-invoice', '/api/portal/settings/invoice', 'status-invoice', normalizeInvoiceSettings);
      return true;
    }
    if (element.matches('[data-users-section]')) {
      state.usersSection = element.dataset.usersSection || 'directory';
      renderUsers();
      return true;
    }
    if (element.matches('[data-users-status-filter]')) {
      state.usersStatusFilter = element.dataset.usersStatusFilter || 'all';
      renderUsers();
      return true;
    }
    if (element.matches('[data-create-profile-client]')) {
      state.userCreateClientId = element.dataset.createProfileClient || '';
      openCreate('profiles');
      state.userCreateClientId = '';
      return true;
    }
    if (element.matches('#btn-invite-user')) {
      openCreate('profiles', { invite: true });
      return true;
    }
    if (element.matches('#btn-data-review')) {
      await openDataReview();
      return true;
    }
    return false;
  }

  return handle;
}

function normalizeInvoiceSettings(data) {
  return {
    ...data,
    starting_number: Number(data.starting_number) || 1,
    tax_rate: Number(data.tax_rate) || 0,
  };
}

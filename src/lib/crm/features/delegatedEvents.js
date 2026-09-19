/**
 * The CRM shell is re-rendered after most mutations. Keep event delegation
 * outside the renderers so replacing a view never creates another listener
 * tree or changes which controls belong to the workspace.
 */
export const CRM_ACTION_SELECTOR = [
  '[data-create]', '[data-export]', '[data-export-pdf]', '[data-proof-open]', '[data-proof-link]',
  '[data-finance-sheet]', '[data-finance-quick-filter]', '[data-finance-density]', '[data-acc-tab]',
  '[data-acc-subtab]', '[data-acc-pg]', '[data-add-inline-finance]', '[data-add-invoice-finance]',
  '[data-cancel-inline-finance]', '[data-edit-finance]', '[data-del-finance]', '[data-del-invoice]',
  '[data-load-invoice]', '[data-resolve-finance]', '[data-invoice-view]', '.acc-tbl-row[data-row-id]',
  '.acc-proof-btn[data-proof]', '[data-report-refresh]', '[data-report-export]',
  '[data-report-download-pdf]', '[data-report-print]', '[data-edit-resource]',
  '[data-duplicate-resource]', '[data-delete-resource]', '[data-quick-patch]', '[data-bulk-delete]',
  '[data-bulk-export]', '[data-clear-selection]', '[data-jump]', '[data-settings-section]',
  '[data-users-section]', '[data-users-status-filter]', '[data-create-profile-client]', '#btn-invite-user',
  '#btn-data-review', '#btn-save-company', '#btn-save-invoice', '#settings-save-all-btn',
  '#finance-filter-reset', '[data-project-status-tab]', '[data-project-clear-filters]',
  '[data-project-menu-trigger]', '[data-project-files-open]', '[data-project-detail]',
  '[data-project-files-select]', '[data-files-projects-back]', '[data-project-files-view]',
  '[data-project-folder-create]', '[data-project-folder-open]', '[data-project-folder-rename-start]',
  '[data-project-file-select]', '[data-project-file-clear]', '[data-project-file-open]',
  '[data-project-file-download]', '[data-project-file-share]', '[data-project-file-delete]',
  '[data-project-members-manage]', '#project-members-manage', '[data-client-detail]',
  '[data-employee-detail]', '[data-ticket-detail]', '[data-drawer-section-toggle]', '[data-drawer-cancel]',
  '#tic-view-board', '#tic-view-list', '#crm-collapse', '#crm-notifications', '#crm-profile-button',
  '#crm-logout-btn', '#crm-retry-load', '#copy-generated-login-password', '#close-generated-login',
  '#crm-modal-close', '#close-invoice', '#proof-preview-close', '#print-invoice', '#crm-modal',
  '#invoice-modal', '#proof-preview-modal', '#finance-edit-toggle', '#inv-cancel-btn', '#inv-print-btn',
  '#inv-save-settings', '#inv-save-invoice', '#inv-clear-signature', '#inv-save-drawn-signature',
  '#inv-add-item', '.inv-remove-item', '[data-delete-invoice-asset]', '.inv-upload-box',
].join(',');

export function createCrmDelegatedEvents(root) {
  const isSurface = (element) => Boolean(element?.closest?.('.crm-app') === root);

  return {
    root,
    isSurface,
    closestAction(event) {
      const element = event?.target?.closest?.(CRM_ACTION_SELECTOR);
      return element && isSurface(element) ? element : null;
    },
    on(type, listener, options) {
      root.addEventListener(type, listener, options);
      return () => root.removeEventListener(type, listener, options);
    },
  };
}

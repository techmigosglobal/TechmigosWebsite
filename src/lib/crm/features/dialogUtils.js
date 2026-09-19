const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function visibleFocusableElements(dialog) {
  if (!dialog?.querySelectorAll) return [];
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => element.getClientRects?.().length > 0);
}

export function trapDialogTab(event, dialog) {
  if (event.key !== 'Tab' || !dialog) return false;
  const focusable = visibleFocusableElements(dialog);
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && event.target === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && event.target === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

export function closeDialogLayers({ modal, invoiceModal, proofPreviewModal, root } = {}) {
  modal?.classList?.remove('open');
  invoiceModal?.classList?.remove('open');
  proofPreviewModal?.classList?.remove('open');
  root?.querySelectorAll?.('.project-reference-menu.is-open').forEach((menu) => menu.classList.remove('is-open'));
}

export function dismissDialogFromClick(element, event, dialogs = {}) {
  const dismissals = [
    { selector: '[data-drawer-cancel]', layer: dialogs.modal },
    { selector: '#close-generated-login', layer: dialogs.modal },
    { selector: '#crm-modal-close', layer: dialogs.modal },
    { selector: '#crm-modal', layer: dialogs.modal, backdrop: true },
    { selector: '#close-invoice', layer: dialogs.invoiceModal },
    { selector: '#invoice-modal', layer: dialogs.invoiceModal, backdrop: true },
    { selector: '#proof-preview-close', layer: dialogs.proofPreviewModal },
    { selector: '#proof-preview-modal', layer: dialogs.proofPreviewModal, backdrop: true },
  ];

  const dismissal = dismissals.find(({ selector, backdrop }) => (
    element?.matches?.(selector) && (!backdrop || event?.target === element)
  ));
  if (!dismissal) return false;
  dismissal.layer?.classList?.remove('open');
  return true;
}

export function setPopupDocument(popup, html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const currentDocument = popup?.document?.documentElement;
  if (!currentDocument || !parsed.documentElement) return;
  currentDocument.replaceWith(popup.document.importNode(parsed.documentElement, true));
}

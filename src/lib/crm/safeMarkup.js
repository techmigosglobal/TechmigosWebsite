const DROP_TAGS = new Set(['base', 'link', 'meta', 'object', 'embed', 'script', 'style']);
const URL_ATTRIBUTES = new Set(['action', 'formaction', 'href', 'src', 'xlink:href']);

function isSafeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;
  try {
    return ['http:', 'https:', 'mailto:', 'tel:', 'upi:'].includes(new URL(raw, 'https://techmigos.invalid').protocol);
  } catch {
    return false;
  }
}

function sanitizeFragment(documentRef) {
  documentRef.querySelectorAll('*').forEach((element) => {
    if (DROP_TAGS.has(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }
      if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value)) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === 'style' && /(javascript:|expression\s*\(|url\s*\(\s*['"]?\s*javascript:)/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

/**
 * Insert renderer markup after applying a small, browser-native allowlist.
 * Renderers still escape user values at their source; this is a defense in
 * depth boundary for shared fragments and private signed-URL previews.
 */
export function replaceSafeMarkup(target, markup, documentRef = globalThis.document) {
  if (!target || !documentRef || typeof documentRef.defaultView?.DOMParser !== 'function') return;
  const parser = new documentRef.defaultView.DOMParser();
  const parsed = parser.parseFromString(String(markup ?? ''), 'text/html');
  sanitizeFragment(parsed);
  const nodes = Array.from(parsed.body.childNodes).map((node) => documentRef.importNode(node, true));
  target.replaceChildren(...nodes);
}

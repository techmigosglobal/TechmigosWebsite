// One icon path registry shared by Astro chrome and browser-rendered CRM views.
// Keeping paths data-only lets both environments use the same visual contract.
export const CRM_ICON_PATHS = Object.freeze({
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  folder: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H9l2 2h7.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/>',
  support: '<path d="M4 13a8 8 0 1 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-6H4Zm16 0v4a2 2 0 0 1-2 2h-2v-6h4ZM16 19c0 2-1.8 3-4 3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.34.72.6 1 .3.3.7.45 1.1.45h.1v4h-.1c-.4 0-.8.15-1.1.45-.26.28-.48.62-.6 1.1Z"/>',
  finance: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h.01M11 15h2"/>',
  chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
  report: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8M8 17h8"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.5 2c-1.5 1-2 1.6-2 3M12 18h.01"/>',
  power: '<path d="M12 3v8"/><path d="M7.8 5.8a8 8 0 1 0 8.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M4 5h16l-6.5 7v5l-3 2v-7z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M4 15v4h16v-4"/>',
  download: '<path d="M12 4v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.4A7.5 7.5 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  building: '<path d="M4 21V5l8-3 8 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6"/>',
  tag: '<path d="M20 12 12 20 4 12V4h8z"/><circle cx="9" cy="9" r="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="M10.3 3.7 2.8 17a2 2 0 0 0 1.74 3h15a2 2 0 0 0 1.74-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  flag: '<path d="M5 22V4m0 0h10l-2 4 2 4H5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 4.5-4 3 2.5 2.5-2 6 5.5"/>',
  archive: '<path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6M9 15h6"/>',
  spreadsheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M4 13h16M4 17h16M9 8v13M15 8v13"/>',
  presentation: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M12 17v4M8 21h8M8 9h8M12 6v7"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>',
  clients: '<path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="11" r="3"/><path d="M5 19a3 3 0 0 0-2 0M19 19a3 3 0 0 1 2 0"/>',
  tickets: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11a2 2 0 0 0-2 2 2 2 0 0 0 2 2v2.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V15a2 2 0 0 0 2-2 2 2 0 0 0-2-2Z"/><path d="M9 8h6M9 16h6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
});

export function crmIconPath(name) {
  return CRM_ICON_PATHS[name] || CRM_ICON_PATHS.dashboard;
}

export function crmIconMarkup(name, { size = null, stroke = 1.9, className = '' } = {}) {
  if (name === 'currency') return '<span class="crm-currency-mark" aria-hidden="true">₹</span>';
  const safeClass = String(className || '').replace(/[^A-Za-z0-9 _-]/g, '');
  const dimensions = size == null ? '' : ` width="${Number(size) || 18}" height="${Number(size) || 18}"`;
  const fill = name === 'more' ? 'currentColor' : 'none';
  const strokeValue = name === 'more' ? 'none' : 'currentColor';
  return `<svg${safeClass ? ` class="${safeClass}"` : ''}${dimensions} viewBox="0 0 24 24" fill="${fill}" stroke="${strokeValue}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${crmIconPath(name)}</svg>`;
}

export const crmNavItems = [
  ['finance', 'Finance', 'finance', '/company/finance'],
] as const;

export function crmNavIcon(name: string) {
  if (name !== 'finance') return '';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"></path><path d="M4 9h13.5a2.5 2.5 0 0 1 0 5H4"></path><circle cx="17.5" cy="11.5" r=".8" fill="currentColor" stroke="none"></circle></svg>';
}

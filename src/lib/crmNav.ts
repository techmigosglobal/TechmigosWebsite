export const crmNavItems = [
  ['dashboard', 'Dashboard', 'dashboard', '/company/dashboard'],
  ['projects', 'Projects', 'projects', '/company/projects'],
  ['tickets', 'Support Tickets', 'tickets', '/company/tickets'],
  ['finance', 'Finance', 'finance', '/company/finance'],
  ['analytics', 'Analytics', 'analytics', '/company/analytics'],
  ['reports', 'Reports', 'reports', '/company/reports'],
  ['clients', 'Clients', 'clients', '/company/clients'],
  ['employees', 'Employees', 'employees', '/company/employees'],
  ['users', 'User Management', 'users', '/company/user-management'],
  ['settings', 'Settings', 'settings', '/company/settings'],
] as const;

export function crmNavIcon(name: string) {
  const icons: Record<string, string> = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"></rect><rect x="13" y="3" width="8" height="5" rx="2"></rect><rect x="13" y="10" width="8" height="11" rx="2"></rect><rect x="3" y="13" width="8" height="8" rx="2"></rect></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"></path><path d="M4 12h10"></path><path d="M4 18h7"></path><path d="M18 11v7"></path><path d="M14.5 14.5 18 11l3.5 3.5"></path></svg>',
    tickets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V11a2 2 0 0 0-2 2 2 2 0 0 0 2 2v2.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5V15a2 2 0 0 0 2-2 2 2 0 0 0-2-2Z"></path><path d="M9 8h6"></path><path d="M9 16h6"></path></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h16"></path><path d="M7 15V9"></path><path d="M12 15V5"></path><path d="M17 15v-3"></path></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h16"></path><path d="M6 16V9"></path><path d="M12 16V5"></path><path d="M18 16v-7"></path></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v5h5"></path><path d="M10 13h6"></path><path d="M10 17h6"></path></svg>',
    clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 19a4 4 0 0 0-8 0"></path><circle cx="12" cy="11" r="3"></circle><path d="M5 19a3 3 0 0 0-2 0"></path><path d="M19 19a3 3 0 0 1 2 0"></path></svg>',
    employees: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20v-2a4 4 0 0 1 8 0v2"></path><circle cx="12" cy="10" r="4"></circle><path d="M4 20v-1a3 3 0 0 1 3-3"></path><path d="M20 20v-1a3 3 0 0 0-3-3"></path></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="10" r="2"></circle><path d="M4 19a5 5 0 0 1 10 0"></path><path d="M15 19a4 4 0 0 1 5-3.87"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3"></path><path d="M12 18v3"></path><path d="m4.93 4.93 2.12 2.12"></path><path d="m16.95 16.95 2.12 2.12"></path><path d="M3 12h3"></path><path d="M18 12h3"></path><path d="m4.93 19.07 2.12-2.12"></path><path d="m16.95 7.05 2.12-2.12"></path><circle cx="12" cy="12" r="3.5"></circle></svg>',
  };

  return icons[name] || icons.dashboard;
}

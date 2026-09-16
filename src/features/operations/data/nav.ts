export type OperationsNavItem = {
  href: string;
  label: string;
  icon: string;
  group: string;
  resource?: string;
  requiredRole?: string;
};

export const nav: OperationsNavItem[] = [
  { href: '/company', label: 'Dashboard', icon: 'dashboard', group: 'Work', resource: 'projects' },
  { href: '/company/projects', label: 'Projects', icon: 'folder', group: 'Work', resource: 'projects' },
  { href: '/company/files', label: 'Files', icon: 'report', group: 'Work', resource: 'project_files' },
  { href: '/company/support', label: 'Support', icon: 'support', group: 'Work', resource: 'tickets' },
  { href: '/company/finance', label: 'Finance', icon: 'finance', group: 'Insights', resource: 'finances' },
  { href: '/company/analytics', label: 'Analytics', icon: 'chart', group: 'Insights', resource: 'projects' },
  { href: '/company/reports', label: 'Reports', icon: 'report', group: 'Insights', resource: 'projects' },
  { href: '/company/users', label: 'User Management', icon: 'users', group: 'Admin', resource: 'profiles' },
  { href: '/company/settings', label: 'Settings', icon: 'settings', group: 'Admin', resource: 'settings' },
];

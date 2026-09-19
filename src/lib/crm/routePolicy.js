export const CRM_ROLES = Object.freeze({
  ADMIN: 'company_admin',
  EMPLOYEE: 'company_member',
  CLIENT: 'client',
});

export const CRM_ROUTES = Object.freeze({
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  FILES: 'files',
  SUPPORT: 'support',
  FINANCE: 'finance',
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  USERS: 'users',
  SETTINGS: 'settings',
});

function normalizeRouteKey(route) {
  return route === 'tickets' ? CRM_ROUTES.SUPPORT : route;
}

export const CRM_ROUTE_POLICY = Object.freeze({
  dashboard: {
    title: 'Dashboard', href: '/company', group: 'Work', icon: 'dashboard', resource: 'projects', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['projects', 'tickets', 'invoices', 'finances'], supportedActions: ['read'],
    readableResourcesByRole: { [CRM_ROLES.EMPLOYEE]: ['projects', 'tickets'] },
  },
  projects: {
    title: 'Projects', href: '/company/projects', group: 'Work', icon: 'folder', resource: 'projects', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['clients', 'projects', 'project_members'], supportedActions: ['read', 'create', 'update', 'assign'],
    readableResourcesByRole: { [CRM_ROLES.EMPLOYEE]: ['projects', 'project_members'] },
    supportedActionsByRole: { [CRM_ROLES.EMPLOYEE]: ['read', 'update'] },
  },
  files: {
    title: 'Files', href: '/company/files', group: 'Work', icon: 'report', resource: 'project_files', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['projects', 'project_folders', 'project_files'], supportedActions: ['read', 'create', 'update'],
    supportedActionsByRole: { [CRM_ROLES.EMPLOYEE]: ['read', 'create'] },
  },
  support: {
    title: 'Support', href: '/company/support', group: 'Work', icon: 'support', resource: 'tickets', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['projects', 'tickets', 'ticket_messages'], supportedActions: ['read', 'create', 'update', 'message'],
    supportedActionsByRole: { [CRM_ROLES.EMPLOYEE]: ['read', 'update', 'message'] },
  },
  finance: {
    title: 'Finance', href: '/company/finance', group: 'Insights', icon: 'finance', resource: 'finances', roles: [CRM_ROLES.ADMIN],
    readableResources: ['clients', 'projects', 'invoices', 'invoice_items', 'finances'], supportedActions: ['read', 'create', 'update'],
  },
  analytics: {
    title: 'Analytics', href: '/company/analytics', group: 'Insights', icon: 'chart', resource: 'projects', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['projects', 'tickets', 'invoices', 'finances', 'activities'], supportedActions: ['read', 'export'],
    readableResourcesByRole: { [CRM_ROLES.EMPLOYEE]: ['projects', 'tickets'] },
  },
  reports: {
    title: 'Reports', href: '/company/reports', group: 'Insights', icon: 'report', resource: 'projects', roles: [CRM_ROLES.ADMIN, CRM_ROLES.EMPLOYEE],
    readableResources: ['projects', 'tickets', 'invoices', 'finances', 'activities'], supportedActions: ['read', 'export', 'print'],
    readableResourcesByRole: { [CRM_ROLES.EMPLOYEE]: ['projects', 'tickets'] },
  },
  users: {
    title: 'User Management', href: '/company/users', group: 'Admin', icon: 'users', resource: 'profiles', roles: [CRM_ROLES.ADMIN],
    readableResources: ['profiles', 'clients'], supportedActions: ['read', 'create', 'update', 'deactivate'],
  },
  settings: {
    title: 'Settings', href: '/company/settings', group: 'Admin', icon: 'settings', resource: 'settings', roles: [CRM_ROLES.ADMIN],
    readableResources: ['settings'], supportedActions: ['read', 'update'],
  },
});

export function canAccessCrmRoute(role, route) {
  const normalizedRoute = normalizeRouteKey(route);
  return Boolean(CRM_ROUTE_POLICY[normalizedRoute]?.roles?.includes(role));
}

export function routeForPath(pathname) {
  const path = String(pathname || '').replace(/\/$/, '') || '/company';
  return Object.entries(CRM_ROUTE_POLICY).find(([, route]) => route.href === path)?.[0] || null;
}

export function hrefForRoute(route) {
  const normalizedRoute = normalizeRouteKey(route);
  return CRM_ROUTE_POLICY[normalizedRoute]?.href || null;
}

export function routeResourcesForRole(route, role) {
  const normalizedRoute = normalizeRouteKey(route);
  const policy = CRM_ROUTE_POLICY[normalizedRoute];
  if (!policy || !canAccessCrmRoute(role, normalizedRoute)) return [];
  return policy.readableResourcesByRole?.[role] || policy.readableResources;
}

export function routeActionsForRole(route, role) {
  const normalizedRoute = normalizeRouteKey(route);
  const policy = CRM_ROUTE_POLICY[normalizedRoute];
  if (!policy || !canAccessCrmRoute(role, normalizedRoute)) return [];
  return policy.supportedActionsByRole?.[role] || policy.supportedActions;
}

export function companyRouteEntries(role) {
  return Object.entries(CRM_ROUTE_POLICY)
    .filter(([route]) => canAccessCrmRoute(role, route))
    .map(([key, route]) => ({
      key,
      ...route,
      readableResources: routeResourcesForRole(key, role),
      supportedActions: routeActionsForRole(key, role),
    }));
}

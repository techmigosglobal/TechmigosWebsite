export const CRM_ROLES = Object.freeze({
  ADMIN: 'company_admin',
  EMPLOYEE: 'company_member',
  CLIENT: 'client',
});

export const CRM_RESOURCES = Object.freeze([
  'clients', 'projects', 'tickets', 'ticket_messages', 'invoices',
  'invoice_items', 'finances', 'activities', 'profiles', 'settings',
]);

export const DISABLED_CRM_RESOURCES = new Set(['leads', 'deals', 'followups', 'campaigns']);
export const ADMIN_ONLY_RESOURCES = new Set(['profiles', 'settings']);
export const EMPLOYEE_READ_RESOURCES = new Set([
  'clients', 'projects', 'tickets', 'ticket_messages', 'invoices',
  'invoice_items', 'finances', 'activities',
]);
export const CLIENT_READ_RESOURCES = new Set(['clients', 'projects', 'tickets', 'invoices', 'invoice_items', 'ticket_messages']);

export function isAdmin(role) {
  return role === CRM_ROLES.ADMIN;
}
export function isEmployee(role) {
  return role === CRM_ROLES.EMPLOYEE;
}

export function isClient(role) {
  return role === CRM_ROLES.CLIENT;
}

export function canRead(role, resource) {
  if (isAdmin(role)) return !DISABLED_CRM_RESOURCES.has(resource);
  if (isEmployee(role)) return EMPLOYEE_READ_RESOURCES.has(resource);
  if (isClient(role)) return CLIENT_READ_RESOURCES.has(resource);
  return false;
}

export function canWrite(role, resource) {
  if (isAdmin(role)) return !DISABLED_CRM_RESOURCES.has(resource);
  if (isClient(role)) return resource === 'tickets' || resource === 'ticket_messages';
  return false;
}

export function canManageUsers(role) {
  return isAdmin(role);
}

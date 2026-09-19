export const CRM_ROLES = Object.freeze({
  ADMIN: 'company_admin',
  EMPLOYEE: 'company_member',
  CLIENT: 'client',
});

export const CRM_RESOURCES = Object.freeze([
  'clients', 'projects', 'tickets', 'ticket_messages', 'invoices',
  'invoice_items', 'finances', 'activities', 'profiles', 'settings',
  'project_members', 'project_folders', 'project_files',
]);

export const DISABLED_CRM_RESOURCES = new Set(['leads', 'deals', 'followups', 'campaigns']);
export const ADMIN_ONLY_RESOURCES = new Set(['profiles', 'settings']);
export const EMPLOYEE_READ_RESOURCES = new Set([
  'projects',
  'project_folders',
  'project_files',
  'tickets',
  'ticket_messages',
]);
export const EMPLOYEE_CREATE_RESOURCES = new Set([
  'project_folders',
  'project_files',
  'ticket_messages',
]);
export const EMPLOYEE_UPDATE_RESOURCES = new Set(['projects', 'tickets']);
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
  if (isEmployee(role)) return EMPLOYEE_CREATE_RESOURCES.has(resource);
  if (isClient(role)) return resource === 'tickets' || resource === 'ticket_messages';
  return false;
}

export function canUpdate(role, resource) {
  if (isEmployee(role)) return EMPLOYEE_UPDATE_RESOURCES.has(resource);
  if (isClient(role)) return false;
  if (canWrite(role, resource)) return true;
  return false;
}

export function canCreate(role, resource) {
  if (canWrite(role, resource)) return true;
  return false;
}

export function canDelete(role, resource) {
  if (resource === 'profiles' || resource === 'settings') return false;
  if (isEmployee(role) || isClient(role)) return false;
  if (canWrite(role, resource)) return true;
  return false;
}

export function canManageUsers(role) {
  return isAdmin(role);
}

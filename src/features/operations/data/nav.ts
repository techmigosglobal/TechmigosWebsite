// Compatibility export for the legacy operations shell. The CRM owns the
// navigation contract so active company routes cannot drift from one another.
import { crmNavItems } from '../../../lib/crmNav';

export type { CrmNavItem as OperationsNavItem } from '../../../lib/crmNav';
export const nav = crmNavItems;

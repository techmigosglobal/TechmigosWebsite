import { nav } from '../features/operations/data/nav';

// Keep the CRM shell on the same navigation contract as the operations shell.
// The CRM-specific import path remains available for callers that use it.
export const crmNavItems = nav;

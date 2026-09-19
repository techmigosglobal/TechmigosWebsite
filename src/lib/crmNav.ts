import { CRM_ROUTE_POLICY } from './crm/routePolicy.js';

export type CrmNavItem = {
  key: string;
  href: string;
  label: string;
  icon: string;
  group: string;
  resource: string;
  roles: string[];
  readableResources: string[];
  supportedActions: string[];
};

export const crmNavItems: CrmNavItem[] = Object.entries(CRM_ROUTE_POLICY).map(([key, route]) => ({
  key,
  href: route.href,
  label: route.title,
  icon: route.icon,
  group: route.group,
  resource: route.resource,
  roles: [...route.roles],
  readableResources: [...route.readableResources],
  supportedActions: [...route.supportedActions],
}));

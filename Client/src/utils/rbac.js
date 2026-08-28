/**
 * Role-Based Access Control Definitions
 * Roles: admin, management, sales, project_manager, employee, finance
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  SALES: 'sales',
  PROJECT_MANAGER: 'project_manager',
  EMPLOYEE: 'employee',
  FINANCE: 'finance',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.MANAGEMENT]: 'Management / Executive',
  [ROLES.SALES]: 'Sales Representative',
  [ROLES.PROJECT_MANAGER]: 'Project Manager',
  [ROLES.EMPLOYEE]: 'Team Member / Developer',
  [ROLES.FINANCE]: 'Finance Manager',
};

/**
 * Menu visibility based on role permissions
 */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER, ROLES.EMPLOYEE, ROLES.FINANCE],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: 'UserPlus',
    path: '/leads',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER],
  },
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    icon: 'Kanban',
    path: '/pipeline',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER],
  },
  {
    id: 'clients',
    label: 'Clients (360°)',
    icon: 'Building2',
    path: '/clients',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
  },
  {
    id: 'quotations',
    label: 'Quotations',
    icon: 'FileText',
    path: '/quotations',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.FINANCE],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'Briefcase',
    path: '/projects',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER, ROLES.EMPLOYEE, ROLES.FINANCE],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    path: '/tasks',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER, ROLES.EMPLOYEE],
  },
  {
    id: 'finance',
    label: 'Invoices & Payments',
    icon: 'CreditCard',
    path: '/invoices',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.FINANCE],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: 'BarChart3',
    path: '/reports',
    roles: [ROLES.ADMIN, ROLES.MANAGEMENT, ROLES.SALES, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
  },
];

/**
 * Check if user role has permission to access a route or feature
 */
export const hasPermission = (userRole, allowedRoles) => {
  if (!userRole) return false;
  if (userRole === ROLES.ADMIN) return true; // Admin has full access
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};

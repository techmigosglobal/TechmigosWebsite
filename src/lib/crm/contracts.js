// Canonical CRM data contracts shared by the repository and browser workspace.
// Keeping table names, read fields, and coercion rules here prevents the UI and
// the data boundary from silently drifting apart as new operations are added.

export const CRM_TABLE_MAP = Object.freeze({
  clients: 'crm_clients',
  projects: 'crm_projects',
  tickets: 'crm_tickets',
  ticket_messages: 'crm_ticket_messages',
  invoices: 'crm_invoices',
  invoice_items: 'crm_invoice_items',
  finances: 'crm_finances',
  activities: 'crm_activities',
  profiles: 'crm_profiles',
  settings: 'crm_settings',
  project_members: 'crm_project_members',
  project_folders: 'crm_project_folders',
  project_files: 'crm_project_files',
});

export const CRM_RESOURCE_ALIASES = Object.freeze({
  'project-files': 'project_files',
  'project-folders': 'project_folders',
  'ticket-messages': 'ticket_messages',
});

export const CRM_RESOURCE_FIELDS = Object.freeze({
  clients: ['id', 'name', 'company', 'email', 'phone', 'status', 'marketing_opt_in', 'notes', 'created_at', 'updated_at'],
  projects: ['id', 'client_id', 'name', 'client_name', 'project_manager', 'owner_user_id', 'budget', 'expenses', 'revenue', 'status', 'health', 'progress', 'due_date', 'summary', 'notes', 'created_at', 'updated_at'],
  tickets: ['id', 'client_id', 'project_id', 'subject', 'description', 'priority', 'status', 'assigned_to', 'assigned_user_id', 'created_at', 'updated_at'],
  ticket_messages: ['id', 'ticket_id', 'body', 'author_name', 'author_role', 'visibility', 'created_at'],
  invoices: ['id', 'client_id', 'project_id', 'invoice_number', 'invoice_date', 'due_date', 'currency', 'customer_name', 'customer_email', 'customer_phone', 'billing_address', 'service_title', 'discount_amount', 'tax_amount', 'total_amount', 'received_amount', 'status', 'notes', 'payment_instructions', 'terms', 'sign_url', 'project_snapshot', 'invoice_branding', 'is_recurring', 'created_at', 'updated_at'],
  invoice_items: ['id', 'invoice_id', 'description', 'quantity', 'rate', 'amount', 'unit', 'notes', 'sort_order', 'created_at'],
  finances: ['id', 'invoice_id', 'client_id', 'project_id', 'transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'paid_by', 'received_by', 'payment_method', 'department', 'amount', 'status', 'notes', 'source', 'proof_url', 'created_at', 'updated_at'],
  activities: ['id', 'action', 'entity_type', 'entity_id', 'summary', 'user_id', 'created_at'],
  profiles: ['id', 'auth_user_id', 'email', 'username', 'name', 'role', 'status', 'must_change_password', 'client_id', 'department', 'last_login', 'created_at', 'updated_at'],
  settings: ['id', 'category', 'settings', 'updated_at'],
  project_members: ['id', 'project_id', 'profile_id', 'role', 'assigned_by', 'created_at'],
  project_folders: ['id', 'project_id', 'parent_id', 'name', 'created_by', 'created_at'],
  project_files: ['id', 'project_id', 'folder_id', 'object_path', 'original_name', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at'],
});

export const CRM_WRITE_FIELDS = Object.freeze({
  clients: ['name', 'company', 'email', 'phone', 'status', 'marketing_opt_in', 'notes'],
  projects: ['client_id', 'name', 'client_name', 'project_manager', 'owner_user_id', 'budget', 'expenses', 'revenue', 'status', 'health', 'progress', 'due_date', 'summary', 'notes'],
  tickets: ['client_id', 'project_id', 'subject', 'description', 'priority', 'status', 'assigned_to', 'assigned_user_id'],
  finances: ['invoice_id', 'client_id', 'project_id', 'transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'paid_by', 'received_by', 'payment_method', 'department', 'amount', 'status', 'notes', 'source', 'proof_url'],
  settings: ['settings'],
  project_members: ['project_id', 'profile_id', 'role'],
  project_folders: ['project_id', 'parent_id', 'name', 'created_by'],
  project_files: ['project_id', 'folder_id', 'object_path', 'original_name', 'mime_type', 'size_bytes', 'uploaded_by'],
});

// Form fields intentionally include only values that the browser may submit;
// read-only IDs/timestamps stay in CRM_RESOURCE_FIELDS above.
export const CRM_FORM_FIELDS = Object.freeze({
  clients: ['name', 'company', 'email', 'phone', 'status', 'marketing_opt_in', 'notes'],
  projects: ['client_id', 'name', 'client_name', 'project_manager', 'owner_user_id', 'budget', 'expenses', 'revenue', 'status', 'health', 'progress', 'due_date', 'summary', 'notes'],
  tickets: ['client_id', 'project_id', 'subject', 'description', 'priority', 'status', 'assigned_to', 'assigned_user_id'],
  invoices: ['client_id', 'project_id', 'invoice_number', 'invoice_date', 'due_date', 'currency', 'customer_name', 'customer_email', 'customer_phone', 'billing_address', 'service_title', 'discount_amount', 'tax_amount', 'total_amount', 'received_amount', 'status', 'notes', 'payment_instructions', 'terms', 'sign_url', 'project_snapshot', 'invoice_branding', 'is_recurring'],
  finances: ['invoice_id', 'client_id', 'project_id', 'transaction_date', 'transaction_type', 'reference_id', 'title', 'client', 'project', 'paid_by', 'received_by', 'payment_method', 'department', 'amount', 'status', 'notes', 'source', 'proof_url'],
  profiles: ['auth_user_id', 'email', 'username', 'name', 'role', 'status', 'client_id', 'department', 'password'],
  project_members: ['project_id', 'profile_id', 'role'],
  project_folders: ['project_id', 'parent_id', 'name'],
  ticket_messages: ['ticket_id', 'body', 'author_name', 'author_role', 'visibility'],
});

export const CRM_NUMERIC_FIELDS = new Set([
  'client_id', 'lead_id', 'project_id', 'ticket_id', 'invoice_id', 'profile_id', 'folder_id', 'related_id',
  'amount', 'budget', 'value', 'progress', 'expenses', 'revenue',
  'discount_amount', 'tax_amount', 'total_amount', 'received_amount',
  'size_bytes', 'quantity', 'rate', 'sort_order',
]);

export const CRM_BOOLEAN_FIELDS = new Set(['marketing_opt_in', 'is_recurring']);

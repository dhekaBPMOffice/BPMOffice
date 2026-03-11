export type UserRole = "admin_master" | "leader" | "user";

export interface Office {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_users: number;
  max_processes: number;
  features: Record<string, boolean>;
  price_monthly: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  office_id: string | null;
  role: UserRole;
  custom_role_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  password_change_approved: boolean;
  is_active: boolean;
  first_login_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomRole {
  id: string;
  office_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface Branding {
  id: string;
  office_id: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  cover_url: string | null;
  header_html: string | null;
  footer_html: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeConfig {
  id: string;
  office_id: string;
  ai_api_key_encrypted: string | null;
  ai_learn_from_history: boolean;
  notification_review_reminders: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string | null;
  office_id: string | null;
  status: string;
  priority?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  office_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

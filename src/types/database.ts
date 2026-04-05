export type UserRole = "admin_master" | "leader" | "user";

export interface Office {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  is_active: boolean;
  processes_initialized_at?: string | null;
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

export type ProcessQuestionType = "text" | "single_select" | "multi_select";

/** Tipos de pergunta suportados no builder de formulários (inclui text como short_text) */
export type FormQuestionType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select";

export const FORM_QUESTION_TYPES: FormQuestionType[] = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
];
export type OfficeProcessOrigin = "questionnaire" | "manual" | "value_chain";
export type OfficeProcessCreationSource = "from_catalog" | "created_in_value_chain";
export type OfficeProcessStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "archived";
export type OfficeProcessAttachmentType =
  | "template"
  | "flowchart"
  | "support"
  | "other";

export interface ProcessTemplateFile {
  url: string;
  label?: string;
}

export interface ProcessFlowchartFile {
  url: string;
}

export interface BaseProcess {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  template_url: string | null;
  template_label: string | null;
  flowchart_image_url: string | null;
  template_files: ProcessTemplateFile[];
  flowchart_files: ProcessFlowchartFile[];
  management_checklist: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  version: number;
  is_active: boolean;
  is_required_first_access: boolean;
  enable_process_linking: boolean;
  is_process_activation_form: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessQuestionnaireQuestion {
  id: string;
  questionnaire_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: ProcessQuestionType | FormQuestionType;
  is_required: boolean;
  enable_process_linking: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProcessQuestionnaireOption {
  id: string;
  question_id: string;
  label: string;
  value: string | null;
  helper_text: string | null;
  sort_order: number;
  is_active: boolean;
  enable_process_linking: boolean;
  created_at: string;
}

export interface ProcessQuestionnaireQuestionProcess {
  id: string;
  question_id: string;
  base_process_id: string;
  created_at: string;
}

export interface ProcessQuestionnaireOptionProcess {
  id: string;
  option_id: string;
  base_process_id: string;
  created_at: string;
}

export interface OfficeQuestionnaireSubmission {
  id: string;
  questionnaire_id: string;
  office_id: string;
  leader_profile_id: string | null;
  generated_process_ids: string[];
  created_at: string;
  submitted_at: string;
}

export interface OfficeQuestionnaireAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string | null;
  selected_option_ids: string[];
  created_at: string;
}

export interface OfficeProcess {
  id: string;
  office_id: string;
  base_process_id: string | null;
  creation_source: OfficeProcessCreationSource;
  name: string;
  description: string | null;
  category: string | null;
  template_url: string | null;
  template_label: string | null;
  flowchart_image_url: string | null;
  template_files: ProcessTemplateFile[];
  flowchart_files: ProcessFlowchartFile[];
  origin: OfficeProcessOrigin;
  status: OfficeProcessStatus;
  owner_profile_id: string | null;
  notes: string | null;
  added_by_profile_id: string | null;
  selected_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  value_chain_id: string | null;
  vc_macroprocesso: string | null;
  vc_level1: string | null;
  vc_level2: string | null;
  vc_level3: string | null;
  vc_tipo_label: string | null;
  vc_process_type: "primario" | "apoio" | "gerencial" | null;
  vc_priority: string | null;
  vc_gestor_label: string | null;
  vc_general_status: string | null;
}

export interface OfficeProcessBpmPhase {
  id: string;
  office_process_id: string;
  phase: string;
  stage_status: string;
  completed_at: string | null;
  updated_at: string;
}

export interface OfficeProcessChecklistItem {
  id: string;
  office_process_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  sort_order: number;
  completed_at: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficeProcessAttachment {
  id: string;
  office_process_id: string;
  title: string;
  attachment_url: string;
  attachment_type: OfficeProcessAttachmentType;
  created_by_profile_id: string | null;
  created_at: string;
}

export interface OfficeProcessHistory {
  id: string;
  office_process_id: string;
  office_id: string;
  actor_profile_id: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Document export templates
// ---------------------------------------------------------------------------

export type TextAlignment = "left" | "center" | "right";

export interface DocumentStyleRole {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  alignment: TextAlignment;
}

export interface DocumentSpacing {
  afterTitle: number;
  beforeSection: number;
  afterSectionTitle: number;
  bodyParagraph: number;
}

export interface DocumentMargins {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface DocumentTemplateStyles {
  fontFamily: string;
  title: DocumentStyleRole;
  subtitle: DocumentStyleRole;
  body: DocumentStyleRole;
  tableHeader: DocumentStyleRole;
  spacing: DocumentSpacing;
  margins: DocumentMargins;
}

export type DocumentSectionType = "title" | "rich_text" | "data_table" | "data_list";

export interface DocumentSectionConfig {
  type: DocumentSectionType;
  key: string;
  label: string;
  defaultText?: string;
  content?: string;
}

export type BrandingMappingValue = "primary_color" | "secondary_color" | "accent_color";
export type BrandingMapping = Record<string, BrandingMappingValue>;

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  styles: DocumentTemplateStyles;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTypeConfig {
  id: string;
  document_type: string;
  label: string;
  template_id: string | null;
  style_overrides: Partial<DocumentTemplateStyles>;
  sections: DocumentSectionConfig[];
  branding_mapping: BrandingMapping;
  created_at: string;
  updated_at: string;
}

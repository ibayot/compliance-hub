export interface User {
  id: number;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  phoneNumber?: string;
  sex?: string;
  staffId?: string;
  position?: string;
  positionFull?: string;
  designation?: string;
  authProvider?: 'local' | 'google';
  role: UserRole;
  autoAssignmentEligible?: boolean;
  units?: Unit[];
  requiresPasswordChange?: boolean;
  requiresMfa?: boolean;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SECTION_HEAD = 'section_head',
  USER = 'user',
  // RICTMS-specific named roles.
  COMPLIANCE_OFFICER = 'compliance_officer',
  CYBERSEC = 'cybersec',
  INFOSEC = 'infosec',
  LEAD_INFRA = 'lead_infra',
  SERVER_ADMIN = 'server_admin',
  DB_ADMIN = 'db_admin',
  NETWORK_ADMIN = 'network_admin',
  PROJECT_MGR = 'project_mgr',
  DEV_LEAD = 'dev_lead',
  SQA_LEAD = 'sqa_lead',
  RECORDS_OFFICER = 'records_officer',
  HR_ID_OFFICER = 'hr_id_officer',
  DESKTOP_SR = 'desktop_sr',
  IT_SUPPORT_SR = 'it_support_sr',
  DESKTOP_JR = 'desktop_jr',
  IT_SUPPORT_JR = 'it_support_jr',
  PANTAWID_ICT = 'pantawid_ict',
}

export interface Unit {
  id: number;
  name: string;
  description?: string;
  hasReportorialRequirements?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresPasswordChange?: boolean;
  requiresMfa?: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

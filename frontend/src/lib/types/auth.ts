export interface User {
  id: number;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  staffId?: string;
  position?: string;
  positionFull?: string;
  designation?: string;
  ticketMainFocal?: boolean;
  ticketTechnician?: boolean;
  authProvider?: 'local' | 'google';
  role: UserRole;
  units?: Unit[];
  /** Platform role code from role_definitions — used for feature routing.
   *  Known values: 'compliance_officer', 'section_head' */
  roleCode?: string | null;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  REVIEWER = 'reviewer',
  FOCAL = 'focal',
  TECHNICIAN = 'technician',
  TECHNICIAN_DESKTOP = 'technician_desktop',
  TECHNICIAN_IT_SUPPORT = 'technician_it_support',
  AUDITOR = 'auditor',
  USER = 'user',
}

export interface Unit {
  id: number;
  name: string;
  description?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

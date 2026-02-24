export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  units?: Unit[];
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  REVIEWER = 'reviewer',
  FOCAL = 'focal',
  TECHNICIAN = 'technician',
  AUDITOR = 'auditor',
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

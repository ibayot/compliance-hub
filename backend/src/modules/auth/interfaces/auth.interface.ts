export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  units: number[];
  staffId?: string;
  jti?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange?: boolean;
  requiresMfa?: boolean;
  user: {
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
    role: string;
    units: { id: number; name: string; hasReportorialRequirements?: boolean }[];
  };
}

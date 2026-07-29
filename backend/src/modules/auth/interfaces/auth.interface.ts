export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  roleCode?: string | null;
  units: number[];
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
    ticketMainFocal?: boolean;
    ticketTechnician?: boolean;
    role: string;
    roleCode?: string | null;
    units: { id: number; name: string }[];
  };
}

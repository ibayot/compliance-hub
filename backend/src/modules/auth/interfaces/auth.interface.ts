export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  roleCode?: string | null;
  units: number[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

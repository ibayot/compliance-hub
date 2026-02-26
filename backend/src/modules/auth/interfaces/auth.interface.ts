export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
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
    designation?: string;
    role: string;
    units: { id: number; name: string }[];
  };
}

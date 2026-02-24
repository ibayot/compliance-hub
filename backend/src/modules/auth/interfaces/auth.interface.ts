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
    lastName: string;
    role: string;
  };
}

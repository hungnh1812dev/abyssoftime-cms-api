export interface AccessTokenPayload {
  sub: string;
  roleSlug: string;
  level: number;
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
}

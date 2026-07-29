export interface AccessTokenPayload {
  sub: string;
  roleSlug: string;
  level: number;
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  // Optional, not required: a refresh token minted before this field existed won't carry it at
  // runtime — readers must treat a missing value as `false` (see RefreshTokenService).
  rememberMe?: boolean;
}

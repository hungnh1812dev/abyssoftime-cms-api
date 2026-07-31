import { Request } from "express";

import { ApiTokenPayload } from "./api-token-payload";
import { AccessTokenPayload, RefreshTokenPayload } from "./jwt-payload";

export type AuthenticatedRequest = Request & { user: AccessTokenPayload; apiToken?: ApiTokenPayload };
export type AuthenticatedRefreshRequest = Request & { user: RefreshTokenPayload };

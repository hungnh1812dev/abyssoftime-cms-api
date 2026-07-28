import { Request } from "express";

import { ApiTokenPayload } from "./api-token-payload";
import { AccessTokenPayload } from "./jwt-payload";

export type AuthenticatedRequest = Request & { user: AccessTokenPayload; apiToken?: ApiTokenPayload };

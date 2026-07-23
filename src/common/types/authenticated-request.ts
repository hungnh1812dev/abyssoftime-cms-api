import { Request } from "express";

import { AccessTokenPayload } from "./jwt-payload";

export type AuthenticatedRequest = Request & { user: AccessTokenPayload };

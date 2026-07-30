import { type AuthenticatedRequest } from "../types/authenticated-request";
import { createHash } from "node:crypto";

import { CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const plaintext = header.slice("Bearer ".length).trim();
    if (plaintext.length === 0) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const hash = createHash("sha256").update(plaintext).digest("hex");
    const record = await this.accessTokens.findByTokenHash(hash);
    if (!record) {
      throw new UnauthorizedException("Invalid access token");
    }

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Access token expired");
    }

    request.apiToken = { documentId: record.documentId, name: record.name, permissions: record.permissions };
    return true;
  }
}

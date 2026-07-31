import { createHash } from "node:crypto";
import { Strategy } from "passport-http-bearer";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, "api-token") {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super();
  }

  async validate(token: string) {
    const hash = createHash("sha256").update(token).digest("hex");
    const record = await this.accessTokens.findByTokenHash(hash);

    if (!record) {
      throw new UnauthorizedException("Invalid API Token");
    }

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Api Token Expired");
    }

    return {
      sub: record.updatedBy,
      permissions: record.permissions,
    };
  }
}

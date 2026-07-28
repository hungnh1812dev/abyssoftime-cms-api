import { Injectable } from "@nestjs/common";

import { type ValidatedLoginUser } from "@/common/strategies/local.strategy";
import { JwtTokenService } from "@/common/token/jwt-token.service";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginService {
  constructor(private readonly jwtTokenService: JwtTokenService) {}

  execute({ user, role }: ValidatedLoginUser): LoginResult {
    const accessToken = this.jwtTokenService.signAccessToken({ sub: user.documentId, roleSlug: role.slug, level: role.level, permissions: role.permissions });
    const refreshToken = this.jwtTokenService.signRefreshToken({ sub: user.documentId });

    return { accessToken, refreshToken };
  }
}

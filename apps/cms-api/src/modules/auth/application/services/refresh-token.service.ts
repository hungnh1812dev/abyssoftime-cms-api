import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { type LoginResult } from "./login.service";

@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(sub: string, rememberMe: boolean): Promise<LoginResult> {
    const user = await this.users.findById(sub);
    if (!user) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (!user.roleId) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const role = await this.roles.findById(user.roleId);

    const accessToken = this.jwtTokenService.signAccessToken({ sub: user.documentId, roleSlug: role.slug, level: role.level, permissions: role.permissions });
    const newRefreshToken = this.jwtTokenService.signRefreshToken({ sub: user.documentId, rememberMe });
    const refreshTokenMaxAgeMs = this.jwtTokenService.getRefreshTokenMaxAgeMs(rememberMe);

    return { accessToken, refreshToken: newRefreshToken, refreshTokenMaxAgeMs };
  }
}

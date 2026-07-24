import { LoginDto } from "../dto/login.dto";
import * as bcrypt from "bcryptjs";

import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

// Precomputed bcrypt hash of an arbitrary string (no corresponding real account) — compared against
// on the "no such user" path so it costs the same as the real bcrypt.compare on the wrong-password
// path, closing the timing side-channel that would otherwise reveal whether an email is registered.
const DUMMY_PASSWORD_HASH = "$2b$10$ygH41CylwgwQrk36/iBQHektv.E2P3xI54PR1J99ksWv2abtU3ihK";

@Injectable()
export class LoginService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.verified) {
      throw new ForbiddenException("Email not verified, please check your inbox");
    }

    if (!user.roleId) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const role = await this.roles.findById(user.roleId);

    const accessToken = this.jwtTokenService.signAccessToken({ sub: user.documentId, roleSlug: role.slug, level: role.level, permissions: role.permissions });
    const refreshToken = this.jwtTokenService.signRefreshToken({ sub: user.documentId });

    return { accessToken, refreshToken };
  }
}

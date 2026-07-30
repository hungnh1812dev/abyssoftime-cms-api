import * as bcrypt from "bcryptjs";
import { Strategy } from "passport-local";

import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

// Precomputed bcrypt hash of an arbitrary string (no corresponding real account) — compared against
// on the "no such user" path so it costs the same as the real bcrypt.compare on the wrong-password
// path, closing the timing side-channel that would otherwise reveal whether an email is registered.
const DUMMY_PASSWORD_HASH = "$2b$10$ygH41CylwgwQrk36/iBQHektv.E2P3xI54PR1J99ksWv2abtU3ihK";

export interface ValidatedLoginUser {
  user: UserEntity;
  role: RoleEntity;
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string): Promise<ValidatedLoginUser> {
    // AuthGuard("local") runs before the global ValidationPipe (guards precede pipes in the Nest
    // lifecycle), so LoginDto's class-validator decorators never see this request — replicate the
    // shape check the pipe used to provide, otherwise a non-string password crashes bcrypt.compare.
    if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
      throw new BadRequestException("Invalid email or password");
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
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
    return { user, role };
  }
}

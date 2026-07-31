import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

export interface GetMeResult {
  user: UserEntity;
  role: RoleEntity | null;
}

@Injectable()
export class GetMeService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async execute(sub: string): Promise<GetMeResult> {
    const user = await this.users.findById(sub);
    if (!user) {
      throw new UnauthorizedException("Invalid session");
    }

    if (user.roleId === null) {
      return { user, role: null };
    }

    const role = await this.roles.findById(user.roleId);
    if (!role) {
      throw new NotFoundException(`Role "${user.roleId}" not found`);
    }

    return { user, role };
  }
}

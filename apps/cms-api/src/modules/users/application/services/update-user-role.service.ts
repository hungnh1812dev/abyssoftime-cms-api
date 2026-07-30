import { UserEntity } from "../../domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserRoleDto } from "../dto/update-user-role.dto";

import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";

const SUPER_ADMIN_ROLE_SLUG = "super_admin";

@Injectable()
export class UpdateUserRoleService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async execute(documentId: string, dto: UpdateUserRoleDto, caller: AccessTokenPayload): Promise<UserEntity> {
    const existing = await this.users.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`User "${documentId}" not found`);
    }

    const newRole = await this.roles.findById(dto.roleId);
    if (!newRole) {
      throw new NotFoundException(`Role "${dto.roleId}" not found`);
    }

    if (existing.roleId) {
      const currentRole = await this.roles.findById(existing.roleId);
      if (caller.level <= currentRole.level) {
        throw new ForbiddenException("Cannot modify a user whose role is at or above your own level");
      }
    }

    if (dto.roleId !== existing.roleId) {
      if (newRole.slug === SUPER_ADMIN_ROLE_SLUG) {
        if (caller.roleSlug !== SUPER_ADMIN_ROLE_SLUG) {
          throw new ForbiddenException("Only a super_admin can promote a user to super_admin");
        }
      } else if (caller.level <= newRole.level) {
        throw new ForbiddenException("Cannot assign a role at or above your own level");
      }
    }

    return this.users.update(documentId, { roleId: dto.roleId });
  }
}

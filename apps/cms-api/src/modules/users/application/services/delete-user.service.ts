import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";

@Injectable()
export class DeleteUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async execute(documentId: string, caller: AccessTokenPayload): Promise<void> {
    const existing = await this.users.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`User "${documentId}" not found`);
    }

    if (existing.roleId) {
      const currentRole = await this.roles.findById(existing.roleId);
      if (caller.level <= currentRole.level) {
        throw new ForbiddenException("Cannot delete a user whose role is at or above your own level");
      }
    }

    await this.users.delete(documentId);
  }
}

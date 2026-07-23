import { type IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { type IUserRoleCountRepository, USER_ROLE_COUNT_REPOSITORY } from "../../domain/repositories/user-role-count.repository";

import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DeleteRoleService {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(USER_ROLE_COUNT_REPOSITORY) private readonly userRoleCounts: IUserRoleCountRepository,
  ) {}

  async execute(documentId: string, callerRoleSlug: string): Promise<void> {
    const callerRole = await this.roles.findBySlug(callerRoleSlug);
    if (!callerRole) {
      throw new ForbiddenException("Caller's role could not be resolved");
    }

    const existing = await this.roles.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`Role "${documentId}" not found`);
    }

    if (existing.level >= callerRole.level) {
      throw new ForbiddenException("Cannot delete a role at or above your own level");
    }

    if (existing.isDefault) {
      throw new BadRequestException("Default roles cannot be deleted");
    }

    const assignedUserCount = await this.userRoleCounts.countByRoleId(documentId);
    if (assignedUserCount > 0) {
      throw new ConflictException(`Role is still assigned to ${assignedUserCount} user(s)`);
    }

    try {
      await this.roles.delete(documentId);
    } catch (error) {
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}

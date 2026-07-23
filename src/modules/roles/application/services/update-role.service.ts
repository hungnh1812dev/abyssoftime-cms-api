import { RoleEntity } from "../../domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { UpdateRoleDto } from "../dto/update-role.dto";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

@Injectable()
export class UpdateRoleService {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository,
  ) {}

  async execute(documentId: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const existing = await this.roles.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`Role "${documentId}" not found`);
    }

    if (existing.isDefault && (dto.name !== undefined || dto.level !== undefined)) {
      throw new BadRequestException("Default roles only allow permissions changes");
    }

    if (dto.permissions !== undefined) {
      await this.assertPermissionsExist(dto.permissions);
    }

    try {
      return await this.roles.update(documentId, { name: dto.name, permissions: dto.permissions, level: dto.level });
    } catch (error) {
      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  private async assertPermissionsExist(permissionSlugs: string[]): Promise<void> {
    if (permissionSlugs.length === 0) {
      return;
    }
    const catalog = await this.permissions.findAll();
    const validSlugs = new Set(catalog.map((permission) => permission.slug));
    const invalidSlugs = permissionSlugs.filter((slug) => !validSlugs.has(slug));
    if (invalidSlugs.length > 0) {
      throw new BadRequestException(`Unknown permission slug(s): ${invalidSlugs.join(", ")}`);
    }
  }
}

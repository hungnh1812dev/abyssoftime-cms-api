import { RoleEntity } from "../../domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY, RoleAlreadyExistsError } from "../../domain/repositories/role.repository";
import { CreateRoleDto } from "../dto/create-role.dto";

import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";

import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

@Injectable()
export class CreateRoleService {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository,
  ) {}

  async execute(dto: CreateRoleDto): Promise<RoleEntity> {
    await this.assertPermissionsExist(dto.permissions);

    try {
      return await this.roles.create({ name: dto.name, slug: dto.slug, permissions: dto.permissions, level: dto.level, isDefault: false, updatedBy: "" });
    } catch (error) {
      if (error instanceof RoleAlreadyExistsError) {
        throw new ConflictException(error.message);
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

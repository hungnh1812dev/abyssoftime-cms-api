import { PermissionEntity } from "../../domain/entities/permission.entity";
import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import { CreatePermissionDto } from "../dto/create-permission.dto";

import { ConflictException, Inject, Injectable } from "@nestjs/common";

@Injectable()
export class CreatePermissionService {
  constructor(@Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository) {}

  async execute(dto: CreatePermissionDto): Promise<PermissionEntity> {
    const existing = await this.permissions.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Permission slug "${dto.slug}" already exists`);
    }

    return this.permissions.create({ slug: dto.slug, name: dto.name, description: dto.description, updatedBy: "" });
  }
}

import { PermissionEntity } from "../../domain/entities/permission.entity";
import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import { UpdatePermissionDto } from "../dto/update-permission.dto";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class UpdatePermissionService {
  constructor(@Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository) {}

  async execute(documentId: string, dto: UpdatePermissionDto): Promise<PermissionEntity> {
    const [existing] = await this.permissions.findByIds([documentId]);
    if (!existing) {
      throw new NotFoundException(`Permission "${documentId}" not found`);
    }

    return this.permissions.update(documentId, { name: dto.name, description: dto.description, updatedBy: "" });
  }
}

import { PermissionEntity } from "../../domain/entities/permission.entity";
import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListPermissionService {
  constructor(@Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository) {}

  async execute(): Promise<PermissionEntity[]> {
    return this.permissions.findAll();
  }
}

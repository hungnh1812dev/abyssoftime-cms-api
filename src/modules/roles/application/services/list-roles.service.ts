import { RoleEntity } from "../../domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "../../domain/repositories/role.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListRolesService {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository) {}

  execute(): Promise<RoleEntity[]> {
    return this.roles.findAll();
  }
}

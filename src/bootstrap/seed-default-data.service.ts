import { type CreatePermissionData, type IPermissionRepository, PERMISSSION_REPOSITORY } from "../modules/permissions/domain/repositories/permission.repository";
import { type CreateRoleData, type IRoleRepository, ROLE_REPOSITORY } from "../modules/roles/domain/repositories/role.repository";

import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

const DEFAULT_PERMISSIONS: Omit<CreatePermissionData, "updatedBy">[] = [
  { slug: "user:manager", name: "Manage users", description: "Create, update, and delete users" },
  { slug: "user:read", name: "Read users", description: "View users" },
  { slug: "role:manager", name: "Manage roles", description: "Create, update, and delete roles" },
  { slug: "role:read", name: "Read roles", description: "View roles" },
  { slug: "permission:manager", name: "Manage permissions", description: "Create, update, and delete permissions" },
  { slug: "permission:read", name: "Read permissions", description: "View permissions" },
  { slug: "api_token:manager", name: "Manage access tokens", description: "Create, revoke, and delete access tokens" },
  { slug: "api_token:read", name: "Read access tokens", description: "View access tokens" },
];

const DEFAULT_ROLES: Omit<CreateRoleData, "updatedBy">[] = [
  { name: "Super Admin", slug: "super_admin", permissions: ["user:manager", "role:manager", "permission:manager", "api_token:manager"], level: 100, isDefault: true },
  { name: "Admin", slug: "admin", permissions: ["user:read", "role:read", "permission:read", "api_token:read"], level: 50, isDefault: true },
  { name: "Editor", slug: "editor", permissions: [], level: 20, isDefault: true },
  { name: "Guest", slug: "guest", permissions: [], level: 0, isDefault: true },
];

@Injectable()
export class SeedDefaultDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedDefaultDataService.name);

  constructor(
    @Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedPermissions();
    await this.seedRoles();
  }

  private async seedPermissions(): Promise<void> {
    for (const permission of DEFAULT_PERMISSIONS) {
      const existing = await this.permissions.findBySlug(permission.slug);
      if (existing) {
        continue;
      }
      await this.permissions.create({ ...permission, updatedBy: null });
      this.logger.log(`Seeded default permission "${permission.slug}"`);
    }
  }

  private async seedRoles(): Promise<void> {
    for (const role of DEFAULT_ROLES) {
      const existing = await this.roles.findBySlug(role.slug);
      if (existing) {
        continue;
      }
      await this.roles.create({ ...role, updatedBy: null });
      this.logger.log(`Seeded default role "${role.slug}"`);
    }
  }
}

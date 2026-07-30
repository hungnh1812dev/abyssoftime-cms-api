import { BadRequestException } from "@nestjs/common";

import { type IPermissionRepository } from "@/modules/permissions/domain/repositories/permission.repository";

export async function assertPermissionsExist(permissions: IPermissionRepository, permissionSlugs: string[]): Promise<void> {
  if (permissionSlugs.length === 0) {
    return;
  }
  const catalog = await permissions.findAll();
  const validSlugs = new Set(catalog.map((permission) => permission.slug));
  const invalidSlugs = permissionSlugs.filter((slug) => !validSlugs.has(slug));
  if (invalidSlugs.length > 0) {
    throw new BadRequestException(`Unknown permission slug(s): ${invalidSlugs.join(", ")}`);
  }
}

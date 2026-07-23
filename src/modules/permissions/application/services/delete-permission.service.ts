import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";

import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DeletePermissionService {
  constructor(@Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository) {}

  async execute(documentId: string): Promise<void> {
    const [existing] = await this.permissions.findByIds([documentId]);
    if (!existing) {
      throw new NotFoundException(`Permission "${documentId}" not found`);
    }

    const refs = await this.permissions.countReferences(existing.slug);
    if (refs.roleCount > 0 || refs.accessTokenCount) {
      throw new ConflictException({
        message: `Permission "${existing.slug}" is still referenced by ${refs.roleCount} role(s) and ${refs.accessTokenCount} access token(s)`,
        roleCount: refs.roleCount,
        accessTokenCount: refs.accessTokenCount,
      });
    }

    await this.permissions.delete(documentId);
  }
}

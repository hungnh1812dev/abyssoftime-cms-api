import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "../../../permissions/domain/repositories/permission.repository";
import { ContentTypeDefinition } from "../../domain/entities/content-type.entity";

import { Inject, Injectable } from "@nestjs/common";

const DOCUMENT_ACTIONS: { action: string; verb: string }[] = [
  { action: "read", verb: "Read" },
  { action: "create", verb: "Create" },
  { action: "update", verb: "Update" },
  { action: "delete", verb: "Delete" },
  { action: "publish", verb: "Publish" },
  { action: "unpublish", verb: "Unpublish" },
];

@Injectable()
export class DocumentPermissionSyncService {
  constructor(@Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository) {}

  async syncForContentTypes(definitions: ContentTypeDefinition[]): Promise<void> {
    for (const definition of definitions) {
      for (const { action, verb } of DOCUMENT_ACTIONS) {
        await this.syncOne(definition, action, verb);
      }
    }
  }

  private async syncOne(definition: ContentTypeDefinition, action: string, verb: string): Promise<void> {
    const slug = `document:${action}:${definition.slug}`;
    const existing = await this.permissions.findBySlug(slug);
    if (existing) {
      return;
    }

    await this.permissions.create({
      slug,
      name: `${verb} ${definition.name} documents`,
      description: `${verb} documents in the ${definition.name} content type`,
      updatedBy: null,
    });
  }
}

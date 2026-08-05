import { PermissionEntity } from "../../../permissions/domain/entities/permission.entity";
import { IPermissionRepository } from "../../../permissions/domain/repositories/permission.repository";
import { ContentTypeDefinition } from "../../domain/entities/content-type.entity";

import { DocumentPermissionSyncService } from "./document-permission-sync.service";

function buildPermissionRepository(): jest.Mocked<IPermissionRepository> {
  return {
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countReferences: jest.fn(),
  };
}

function permission(slug: string): PermissionEntity {
  return new PermissionEntity("permission-1", slug, slug, undefined, new Date(), new Date(), null);
}

const definition: ContentTypeDefinition = {
  slug: "cv-page",
  name: "CV Page",
  kind: "collection",
  draftToPublish: true,
  fields: [],
  listFields: [],
};

describe("DocumentPermissionSyncService", () => {
  it("creates all 6 document action permissions for a new content type", async () => {
    const permissions = buildPermissionRepository();
    permissions.findBySlug.mockResolvedValue(null);
    const service = new DocumentPermissionSyncService(permissions);

    await service.syncForContentTypes([definition]);

    expect(permissions.create).toHaveBeenCalledTimes(6);
    const createdSlugs = permissions.create.mock.calls.map(([data]) => data.slug);
    expect(createdSlugs).toEqual(
      expect.arrayContaining([
        "document:read:cv-page",
        "document:create:cv-page",
        "document:update:cv-page",
        "document:delete:cv-page",
        "document:publish:cv-page",
        "document:unpublish:cv-page",
      ]),
    );
  });

  it("does not recreate permissions that already exist", async () => {
    const permissions = buildPermissionRepository();
    permissions.findBySlug.mockResolvedValue(permission("document:read:cv-page"));
    const service = new DocumentPermissionSyncService(permissions);

    await service.syncForContentTypes([definition]);

    expect(permissions.create).not.toHaveBeenCalled();
  });

  it("never deletes permissions for content types that are no longer present", async () => {
    const permissions = buildPermissionRepository();
    const service = new DocumentPermissionSyncService(permissions);

    await service.syncForContentTypes([]);

    expect(permissions.delete).not.toHaveBeenCalled();
    expect(permissions.create).not.toHaveBeenCalled();
  });
});

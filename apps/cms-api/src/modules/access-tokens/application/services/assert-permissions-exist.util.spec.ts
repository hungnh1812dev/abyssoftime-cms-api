import { BadRequestException } from "@nestjs/common";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { type IPermissionRepository } from "@/modules/permissions/domain/repositories/permission.repository";

import { assertPermissionsExist } from "./assert-permissions-exist.util";

describe("assertPermissionsExist", () => {
  let permissions: jest.Mocked<IPermissionRepository>;
  const catalog = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];

  beforeEach(() => {
    permissions = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countReferences: jest.fn(),
    };
  });

  it("skips the catalog check when the slug list is empty", async () => {
    await assertPermissionsExist(permissions, []);

    expect(permissions.findAll).not.toHaveBeenCalled();
  });

  it("resolves without throwing when every slug exists in the catalog", async () => {
    permissions.findAll.mockResolvedValue(catalog);

    await expect(assertPermissionsExist(permissions, ["document:read"])).resolves.toBeUndefined();
  });

  it("throws BadRequestException listing every unknown slug", async () => {
    permissions.findAll.mockResolvedValue(catalog);

    await expect(assertPermissionsExist(permissions, ["document:read", "document:delete", "document:write"])).rejects.toThrow(
      new BadRequestException("Unknown permission slug(s): document:delete, document:write"),
    );
  });
});

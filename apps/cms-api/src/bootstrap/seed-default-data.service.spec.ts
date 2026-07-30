import { PermissionEntity } from "../modules/permissions/domain/entities/permission.entity";
import { type IPermissionRepository } from "../modules/permissions/domain/repositories/permission.repository";
import { RoleEntity } from "../modules/roles/domain/entities/role.entiry";
import { type IRoleRepository } from "../modules/roles/domain/repositories/role.repository";

import { SeedDefaultDataService } from "./seed-default-data.service";

describe("SeedDefaultDataService", () => {
  let permissions: jest.Mocked<IPermissionRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let service: SeedDefaultDataService;

  const permissionEntity = (slug: string) => new PermissionEntity(`permission-${slug}`, slug, slug, slug, new Date(), new Date(), null);
  const roleEntity = (slug: string) => new RoleEntity(`role-${slug}`, slug, slug, [], 0, true, new Date(), new Date(), null);

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
    roles = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasAny: jest.fn(),
    };

    service = new SeedDefaultDataService(permissions, roles);
  });

  it("creates all 19 permissions and 4 roles when nothing exists yet", async () => {
    permissions.findBySlug.mockResolvedValue(null);
    roles.findBySlug.mockResolvedValue(null as unknown as RoleEntity);
    permissions.create.mockResolvedValue(permissionEntity("stub"));
    roles.create.mockResolvedValue(roleEntity("stub"));

    await service.onApplicationBootstrap();

    expect(permissions.create).toHaveBeenCalledTimes(19);
    expect(roles.create).toHaveBeenCalledTimes(4);

    const createdSlugs = permissions.create.mock.calls.map(([data]) => data.slug);
    expect(createdSlugs).toEqual([
      "user:manager",
      "user:read",
      "user:role_manager",
      "role:manager",
      "role:read",
      "permission:manager",
      "permission:read",
      "api_token:manager",
      "api_token:read",
      "media:manager",
      "media:read",
      "content_type:manager",
      "content_type:read",
      "document:read",
      "document:create",
      "document:update",
      "document:delete",
      "document:publish",
      "document:unpublish",
    ]);

    const createdRoleSlugs = roles.create.mock.calls.map(([data]) => data.slug);
    expect(createdRoleSlugs).toEqual(["super_admin", "admin", "editor", "guest"]);
  });

  it("only creates the missing permissions and roles when some already exist", async () => {
    permissions.findBySlug.mockImplementation((slug) => Promise.resolve(slug === "user:manager" ? permissionEntity(slug) : null));
    roles.findBySlug.mockImplementation((slug) => Promise.resolve(slug === "super_admin" ? roleEntity(slug) : (null as unknown as RoleEntity)));
    permissions.create.mockResolvedValue(permissionEntity("stub"));
    roles.create.mockResolvedValue(roleEntity("stub"));

    await service.onApplicationBootstrap();

    expect(permissions.create).toHaveBeenCalledTimes(18);
    expect(roles.create).toHaveBeenCalledTimes(3);
  });

  it("creates nothing when all 19 permissions and 4 roles already exist", async () => {
    permissions.findBySlug.mockImplementation((slug) => Promise.resolve(permissionEntity(slug)));
    roles.findBySlug.mockImplementation((slug) => Promise.resolve(roleEntity(slug)));

    await service.onApplicationBootstrap();

    expect(permissions.create).not.toHaveBeenCalled();
    expect(roles.create).not.toHaveBeenCalled();
  });

  it("seeds super_admin with all manager permissions plus content_type:manager/content-type/document permissions, and admin with all read permissions plus content_type:read/document:read", async () => {
    permissions.findBySlug.mockResolvedValue(null);
    roles.findBySlug.mockResolvedValue(null as unknown as RoleEntity);
    permissions.create.mockResolvedValue(permissionEntity("stub"));
    roles.create.mockResolvedValue(roleEntity("stub"));

    await service.onApplicationBootstrap();

    const superAdminCall = roles.create.mock.calls.find(([data]) => data.slug === "super_admin")![0];
    const adminCall = roles.create.mock.calls.find(([data]) => data.slug === "admin")![0];
    const editorCall = roles.create.mock.calls.find(([data]) => data.slug === "editor")![0];
    const guestCall = roles.create.mock.calls.find(([data]) => data.slug === "guest")![0];

    expect(superAdminCall.permissions).toEqual([
      "user:manager",
      "user:role_manager",
      "role:manager",
      "permission:manager",
      "api_token:manager",
      "media:manager",
      "content_type:manager",
      "content_type:read",
      "document:read",
      "document:create",
      "document:update",
      "document:delete",
      "document:publish",
      "document:unpublish",
    ]);
    expect(adminCall.permissions).toEqual(["user:read", "role:read", "permission:read", "api_token:read", "media:read", "content_type:read", "document:read"]);
    expect(editorCall.permissions).toEqual([]);
    expect(guestCall.permissions).toEqual([]);
  });
});

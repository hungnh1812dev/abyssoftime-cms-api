import { RoleAlreadyExistsError, RoleNotFoundError } from "../../domain/repositories/role.repository";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaRoleRepository } from "./prisma-role.repository";

describe("PrismaRoleRepository", () => {
  let repository: PrismaRoleRepository;
  let prisma: {
    role: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const record = {
    documentId: "role-1",
    name: "Content Manager",
    slug: "content-manager",
    permissions: ["document:read", "document:write"],
    level: 10,
    isDefault: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedBy: "user-1",
  };

  beforeEach(() => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new PrismaRoleRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: {
    documentId: string;
    name: string;
    slug: string;
    permissions: string[];
    level: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
  }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      name: record.name,
      slug: record.slug,
      permissions: record.permissions,
      level: record.level,
      isDefault: record.isDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    });
  };

  const knownRequestError = (code: string) => new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

  it("findAll() maps every record to a RoleEntity", async () => {
    prisma.role.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.role.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findBySlug() looks up by slug via findUnique", async () => {
    prisma.role.findUnique.mockResolvedValue(record);

    const result = await repository.findBySlug("content-manager");

    expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { slug: "content-manager" } });
    expectMappedEntity(result);
  });

  it("findBySlug() returns null when no record is found", async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    const result = await repository.findBySlug("missing-slug");

    expect(result).toBeNull();
  });

  it("findById() looks up by documentId via findUnique", async () => {
    prisma.role.findUnique.mockResolvedValue(record);

    const result = await repository.findById("role-1");

    expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { documentId: "role-1" } });
    expectMappedEntity(result);
  });

  it("findById() returns null when no record is found", async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    const result = await repository.findById("missing");

    expect(result).toBeNull();
  });

  it("create() passes all fields through to prisma and maps the result", async () => {
    prisma.role.create.mockResolvedValue(record);

    const result = await repository.create({
      name: "Content Manager",
      slug: "content-manager",
      permissions: ["document:read", "document:write"],
      level: 10,
      isDefault: false,
      updatedBy: "user-1",
    });

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { name: "Content Manager", slug: "content-manager", permissions: ["document:read", "document:write"], level: 10, isDefault: false, updatedBy: "user-1" },
    });
    expectMappedEntity(result);
  });

  it("create() translates a P2002 unique-constraint error into RoleAlreadyExistsError", async () => {
    prisma.role.create.mockRejectedValue(knownRequestError("P2002"));

    await expect(repository.create({ name: "Content Manager", slug: "content-manager", permissions: [], level: 10, isDefault: false, updatedBy: "user-1" })).rejects.toThrow(
      RoleAlreadyExistsError,
    );
  });

  it("create() rethrows unrelated errors", async () => {
    prisma.role.create.mockRejectedValue(new Error("db down"));

    await expect(repository.create({ name: "Content Manager", slug: "content-manager", permissions: [], level: 10, isDefault: false, updatedBy: "user-1" })).rejects.toThrow(
      "db down",
    );
  });

  it("update() passes provided fields through to prisma and maps the result", async () => {
    prisma.role.update.mockResolvedValue(record);

    const result = await repository.update("role-1", { name: "Content Manager v2" });

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { documentId: "role-1" },
      data: { name: "Content Manager v2", permissions: undefined, level: undefined, isDefault: undefined },
    });
    expectMappedEntity(result);
  });

  it("update() translates a P2025 not-found error into RoleNotFoundError", async () => {
    prisma.role.update.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.update("missing", { name: "x" })).rejects.toThrow(RoleNotFoundError);
  });

  it("update() rethrows unrelated errors", async () => {
    prisma.role.update.mockRejectedValue(new Error("db down"));

    await expect(repository.update("role-1", { name: "x" })).rejects.toThrow("db down");
  });

  it("delete() removes the record by documentId", async () => {
    prisma.role.delete.mockResolvedValue(record);

    await repository.delete("role-1");

    expect(prisma.role.delete).toHaveBeenCalledWith({ where: { documentId: "role-1" } });
  });

  it("delete() translates a P2025 not-found error into RoleNotFoundError", async () => {
    prisma.role.delete.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.delete("missing")).rejects.toThrow(RoleNotFoundError);
  });

  it("delete() rethrows unrelated errors", async () => {
    prisma.role.delete.mockRejectedValue(new Error("db down"));

    await expect(repository.delete("role-1")).rejects.toThrow("db down");
  });

  it("hasAny() returns true when at least one role exists", async () => {
    prisma.role.count.mockResolvedValue(1);

    const result = await repository.hasAny();

    expect(prisma.role.count).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("hasAny() returns false when no roles exist", async () => {
    prisma.role.count.mockResolvedValue(0);

    const result = await repository.hasAny();

    expect(result).toBe(false);
  });
});

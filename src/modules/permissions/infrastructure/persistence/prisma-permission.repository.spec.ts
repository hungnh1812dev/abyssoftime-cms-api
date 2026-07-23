import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaPermissionRepository } from "./prisma-permission.repository";

describe("PrismaPermissionRepository", () => {
  let repository: PrismaPermissionRepository;
  let prisma: {
    permission: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    role: {
      count: jest.Mock;
    };
  };

  const record = {
    documentId: "permission-1",
    slug: "document:read",
    name: "Read document",
    description: "Allows reading a document",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedBy: "user-1",
  };

  beforeEach(() => {
    prisma = {
      permission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      role: {
        count: jest.fn(),
      },
    };

    repository = new PrismaPermissionRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: { documentId: string; slug: string; name: string; description: string | undefined; createdAt: Date; updatedAt: Date; updatedBy: string }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      slug: record.slug,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    });
  };

  it("findAll() maps every record to a PermissionEntity", async () => {
    prisma.permission.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.permission.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findBySlug() looks up by slug via findUnique", async () => {
    prisma.permission.findUnique.mockResolvedValue(record);

    const result = await repository.findBySlug("document:read");

    expect(prisma.permission.findUnique).toHaveBeenCalledWith({ where: { slug: "document:read" } });
    expectMappedEntity(result!);
  });

  it("findBySlug() returns null when no record is found", async () => {
    prisma.permission.findUnique.mockResolvedValue(null);

    const result = await repository.findBySlug("missing:slug");

    expect(result).toBeNull();
  });

  it("findByIds() looks up by documentId in a set", async () => {
    prisma.permission.findMany.mockResolvedValue([record]);

    const result = await repository.findByIds(["permission-1"]);

    expect(prisma.permission.findMany).toHaveBeenCalledWith({ where: { documentId: { in: ["permission-1"] } } });
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("create() passes all fields through to prisma and maps the result", async () => {
    prisma.permission.create.mockResolvedValue(record);

    const result = await repository.create({ slug: "document:read", name: "Read document", description: "Allows reading a document", updatedBy: "user-1" });

    expect(prisma.permission.create).toHaveBeenCalledWith({
      data: { slug: "document:read", name: "Read document", description: "Allows reading a document", updatedBy: "user-1" },
    });
    expectMappedEntity(result);
  });

  it("update() passes provided fields through to prisma and maps the result", async () => {
    prisma.permission.update.mockResolvedValue(record);

    const result = await repository.update("permission-1", { name: "Read document v2", updatedBy: "user-1" });

    expect(prisma.permission.update).toHaveBeenCalledWith({
      where: { documentId: "permission-1" },
      data: { name: "Read document v2", description: undefined, updatedBy: "user-1" },
    });
    expectMappedEntity(result);
  });

  it("delete() removes the record by documentId", async () => {
    prisma.permission.delete.mockResolvedValue(record);

    await repository.delete("permission-1");

    expect(prisma.permission.delete).toHaveBeenCalledWith({ where: { documentId: "permission-1" } });
  });

  it("countReferences() returns the role reference count and a zero access token count", async () => {
    prisma.role.count.mockResolvedValue(2);

    const result = await repository.countReferences("document:read");

    expect(prisma.role.count).toHaveBeenCalledWith({ where: { permissions: { array_contains: ["document:read"] } } });
    expect(result).toEqual({ roleCount: 2, accessTokenCount: 0 });
  });
});

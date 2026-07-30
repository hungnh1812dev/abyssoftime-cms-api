import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaAccessTokenRepository } from "./prisma-access-token.repository";

describe("PrismaAccessTokenRepository", () => {
  let repository: PrismaAccessTokenRepository;
  let prisma: {
    accessToken: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const record = {
    documentId: "access-token-1",
    name: "CI deploy token",
    token: "a".repeat(64),
    permissions: ["document:read", "document:write"],
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedBy: "user-1",
  };

  beforeEach(() => {
    prisma = {
      accessToken: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PrismaAccessTokenRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: {
    documentId: string;
    name: string;
    token: string;
    permissions: string[];
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string | null;
  }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      name: record.name,
      token: record.token,
      permissions: record.permissions,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    });
  };

  it("findAll() maps every record to an AccessTokenEntity", async () => {
    prisma.accessToken.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.accessToken.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findById() looks up by documentId via findUnique", async () => {
    prisma.accessToken.findUnique.mockResolvedValue(record);

    const result = await repository.findById("access-token-1");

    expect(prisma.accessToken.findUnique).toHaveBeenCalledWith({ where: { documentId: "access-token-1" } });
    expectMappedEntity(result!);
  });

  it("findById() returns null when no record is found", async () => {
    prisma.accessToken.findUnique.mockResolvedValue(null);

    const result = await repository.findById("missing");

    expect(result).toBeNull();
  });

  it("findByTokenHash() looks up by token via findUnique", async () => {
    prisma.accessToken.findUnique.mockResolvedValue(record);

    const result = await repository.findByTokenHash(record.token);

    expect(prisma.accessToken.findUnique).toHaveBeenCalledWith({ where: { token: record.token } });
    expectMappedEntity(result!);
  });

  it("findByTokenHash() resolves null, doesn't throw, when no record is found", async () => {
    const result = await (async () => {
      prisma.accessToken.findUnique.mockResolvedValue(null);
      return repository.findByTokenHash("nonexistent");
    })();

    expect(result).toBeNull();
  });

  it("create() round-trips permissions: string[] through Json and maps the result", async () => {
    prisma.accessToken.create.mockResolvedValue(record);

    const result = await repository.create({
      name: "CI deploy token",
      token: record.token,
      permissions: ["document:read", "document:write"],
      expiresAt: record.expiresAt,
      updatedBy: "user-1",
    });

    expect(prisma.accessToken.create).toHaveBeenCalledWith({
      data: { name: "CI deploy token", token: record.token, permissions: ["document:read", "document:write"], expiresAt: record.expiresAt, updatedBy: "user-1" },
    });
    expectMappedEntity(result);
    expect(result.permissions).toEqual(["document:read", "document:write"]);
  });

  it("create() accepts expiresAt: null for a never-expiring token", async () => {
    prisma.accessToken.create.mockResolvedValue({ ...record, expiresAt: null });

    const result = await repository.create({
      name: "CI deploy token",
      token: record.token,
      permissions: [],
      expiresAt: null,
      updatedBy: "user-1",
    });

    expect(prisma.accessToken.create).toHaveBeenCalledWith({
      data: { name: "CI deploy token", token: record.token, permissions: [], expiresAt: null, updatedBy: "user-1" },
    });
    expect(result.expiresAt).toBeNull();
  });

  it("update() passes provided fields through to prisma and maps the result", async () => {
    prisma.accessToken.update.mockResolvedValue(record);

    const result = await repository.update("access-token-1", { name: "Renamed token", updatedBy: "user-1" });

    expect(prisma.accessToken.update).toHaveBeenCalledWith({
      where: { documentId: "access-token-1" },
      data: { name: "Renamed token", token: undefined, permissions: undefined, expiresAt: undefined, updatedBy: "user-1" },
    });
    expectMappedEntity(result);
  });

  it("delete() removes the record by documentId", async () => {
    prisma.accessToken.delete.mockResolvedValue(record);

    await repository.delete("access-token-1");

    expect(prisma.accessToken.delete).toHaveBeenCalledWith({ where: { documentId: "access-token-1" } });
  });
});

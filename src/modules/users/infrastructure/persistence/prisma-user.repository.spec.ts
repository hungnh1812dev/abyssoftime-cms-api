import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaUserRepository } from "./prisma-user.repository";

describe("PrismaUserRepository", () => {
  let repository: PrismaUserRepository;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const record = {
    documentId: "user-1",
    email: "jane@example.com",
    name: "Jane Doe",
    username: "janedoe",
    password: "secret",
    accountType: true,
    verified: false,
    roleId: "role-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: { documentId: string; email: string; name: string; username: string; password: string; accountType: boolean; verified: boolean; roleId: string; createdAt: Date; updatedAt: Date }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      email: record.email,
      name: record.name,
      username: record.username,
      password: record.password,
      accountType: record.accountType,
      verified: record.verified,
      roleId: record.roleId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  };

  it("findAll() maps every record to a UserEntity", async () => {
    prisma.user.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findById() looks up by documentId via findUnique", async () => {
    prisma.user.findUnique.mockResolvedValue(record);

    const result = await repository.findById("user-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { documentId: "user-1" } });
    expectMappedEntity(result!);
  });

  it("findById() returns null when no record is found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.findById("missing");

    expect(result).toBeNull();
  });

  it("findByEmail() looks up by email via findUnique", async () => {
    prisma.user.findUnique.mockResolvedValue(record);

    const result = await repository.findByEmail("jane@example.com");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "jane@example.com" } });
    expectMappedEntity(result!);
  });

  it("findByUsername() looks up by username via findFirst (no unique constraint)", async () => {
    prisma.user.findFirst.mockResolvedValue(record);

    const result = await repository.findByUsername("janedoe");

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { username: "janedoe" } });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expectMappedEntity(result!);
  });

  it("create() passes all fields through to prisma and maps the result", async () => {
    prisma.user.create.mockResolvedValue(record);

    const result = await repository.create({
      email: "jane@example.com",
      name: "Jane Doe",
      username: "janedoe",
      password: "secret",
      accountType: true,
      verified: false,
      roleId: "role-1",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "jane@example.com",
        name: "Jane Doe",
        username: "janedoe",
        password: "secret",
        accountType: true,
        verified: false,
        roleId: "role-1",
      },
    });
    expectMappedEntity(result);
  });

  it("update() passes provided fields through to prisma and maps the result", async () => {
    prisma.user.update.mockResolvedValue(record);

    const result = await repository.update("user-1", { name: "Jane Doe 2" });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: {
        email: undefined,
        name: "Jane Doe 2",
        username: undefined,
        password: undefined,
        accountType: undefined,
        verified: undefined,
        roleId: undefined,
      },
    });
    expectMappedEntity(result);
  });

  it("delete() removes the record by documentId", async () => {
    prisma.user.delete.mockResolvedValue(record);

    await repository.delete("user-1");

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { documentId: "user-1" } });
  });

  it("count() returns the total number of records", async () => {
    prisma.user.count.mockResolvedValue(3);

    const result = await repository.count();

    expect(prisma.user.count).toHaveBeenCalled();
    expect(result).toBe(3);
  });
});

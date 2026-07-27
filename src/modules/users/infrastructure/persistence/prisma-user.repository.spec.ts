import { UserAlreadyExistsError } from "../../domain/repositories/user.repository";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaUserRepository } from "./prisma-user.repository";

describe("PrismaUserRepository", () => {
  let repository: PrismaUserRepository;
  let txUser: { count: jest.Mock; update: jest.Mock };
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
    $transaction: jest.Mock;
  };

  const p2002Error = (target: string[]) => new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test", meta: { target } });

  const p2034Error = () => new Prisma.PrismaClientKnownRequestError("Write conflict", { code: "P2034", clientVersion: "test" });

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
    otpCodeHash: null,
    otpExpiresAt: null,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
  };

  beforeEach(() => {
    txUser = { count: jest.fn(), update: jest.fn() };
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
      $transaction: jest.fn((fn: (tx: { user: typeof txUser }) => unknown) => fn({ user: txUser })),
    };

    repository = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: {
    documentId: string;
    email: string;
    name: string;
    username: string;
    password: string;
    accountType: boolean;
    verified: boolean;
    roleId: string | null;
    createdAt: Date;
    updatedAt: Date;
    otpCodeHash: string | null;
    otpExpiresAt: Date | null;
    resetTokenHash: string | null;
    resetTokenExpiresAt: Date | null;
  }) => {
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
      otpCodeHash: record.otpCodeHash,
      otpExpiresAt: record.otpExpiresAt,
      resetTokenHash: record.resetTokenHash,
      resetTokenExpiresAt: record.resetTokenExpiresAt,
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

  it("findByEmail() returns null when no record is found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.findByEmail("missing@example.com");

    expect(result).toBeNull();
  });

  it("findByUsername() looks up by username via findUnique", async () => {
    prisma.user.findUnique.mockResolvedValue(record);

    const result = await repository.findByUsername("janedoe");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: "janedoe" } });
    expectMappedEntity(result!);
  });

  it("findByUsername() returns null when no record is found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.findByUsername("missing");

    expect(result).toBeNull();
  });

  it("findAll() maps a record with roleId: null through to the entity", async () => {
    const unassigned = { ...record, roleId: null };
    prisma.user.findMany.mockResolvedValue([unassigned]);

    const result = await repository.findAll();

    expect(result[0].roleId).toBeNull();
  });

  it("create() accepts roleId: null and passes it through to prisma", async () => {
    prisma.user.create.mockResolvedValue({ ...record, roleId: null });

    const result = await repository.create({
      email: "jane@example.com",
      name: "Jane Doe",
      username: "janedoe",
      password: "secret",
      accountType: true,
      verified: false,
      roleId: null,
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "jane@example.com",
        name: "Jane Doe",
        username: "janedoe",
        password: "secret",
        accountType: true,
        verified: false,
        roleId: null,
        otpCodeHash: undefined,
        otpExpiresAt: undefined,
      },
    });
    expect(result.roleId).toBeNull();
  });

  it("findByResetTokenHash() looks up by resetTokenHash via findFirst (no unique constraint)", async () => {
    prisma.user.findFirst.mockResolvedValue(record);

    const result = await repository.findByResetTokenHash("hashed-token");

    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { resetTokenHash: "hashed-token" } });
    expectMappedEntity(result!);
  });

  it("findByResetTokenHash() returns null when no record is found", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await repository.findByResetTokenHash("missing-hash");

    expect(result).toBeNull();
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
      otpCodeHash: null,
      otpExpiresAt: null,
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
        otpCodeHash: null,
        otpExpiresAt: null,
      },
    });
    expectMappedEntity(result);
  });

  it("create() throws UserAlreadyExistsError(email) when the email unique constraint is violated", async () => {
    prisma.user.create.mockRejectedValue(p2002Error(["email"]));

    await expect(
      repository.create({ email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "secret", accountType: true, verified: false, roleId: null }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it("create() throws UserAlreadyExistsError(username) when the username unique constraint is violated", async () => {
    prisma.user.create.mockRejectedValue(p2002Error(["username"]));

    await expect(
      repository.create({ email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "secret", accountType: true, verified: false, roleId: null }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it("create() rethrows unrelated errors as-is", async () => {
    const otherError = new Error("connection lost");
    prisma.user.create.mockRejectedValue(otherError);

    await expect(
      repository.create({ email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "secret", accountType: true, verified: false, roleId: null }),
    ).rejects.toThrow(otherError);
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
        otpCodeHash: undefined,
        otpExpiresAt: undefined,
        resetTokenHash: undefined,
        resetTokenExpiresAt: undefined,
      },
    });
    expectMappedEntity(result);
  });

  it("update() clears otpCodeHash and otpExpiresAt when explicitly set to null", async () => {
    prisma.user.update.mockResolvedValue({ ...record, otpCodeHash: null, otpExpiresAt: null });

    const result = await repository.update("user-1", { verified: true, roleId: "role-1", otpCodeHash: null, otpExpiresAt: null });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: {
        email: undefined,
        name: undefined,
        username: undefined,
        password: undefined,
        accountType: undefined,
        verified: true,
        roleId: "role-1",
        otpCodeHash: null,
        otpExpiresAt: null,
        resetTokenHash: undefined,
        resetTokenExpiresAt: undefined,
      },
    });
    expect(result.otpCodeHash).toBeNull();
    expect(result.otpExpiresAt).toBeNull();
  });

  it("update() sets resetTokenHash and resetTokenExpiresAt when requesting a password reset", async () => {
    const resetTokenExpiresAt = new Date("2026-01-03T00:00:00.000Z");
    prisma.user.update.mockResolvedValue({ ...record, resetTokenHash: "hashed-token", resetTokenExpiresAt });

    const result = await repository.update("user-1", { resetTokenHash: "hashed-token", resetTokenExpiresAt });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: {
        email: undefined,
        name: undefined,
        username: undefined,
        password: undefined,
        accountType: undefined,
        verified: undefined,
        roleId: undefined,
        otpCodeHash: undefined,
        otpExpiresAt: undefined,
        resetTokenHash: "hashed-token",
        resetTokenExpiresAt,
      },
    });
    expect(result.resetTokenHash).toBe("hashed-token");
    expect(result.resetTokenExpiresAt).toEqual(resetTokenExpiresAt);
  });

  it("update() clears resetTokenHash and resetTokenExpiresAt after a successful password reset", async () => {
    prisma.user.update.mockResolvedValue({ ...record, resetTokenHash: null, resetTokenExpiresAt: null });

    const result = await repository.update("user-1", { password: "new-hashed-password", resetTokenHash: null, resetTokenExpiresAt: null });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: {
        email: undefined,
        name: undefined,
        username: undefined,
        password: "new-hashed-password",
        accountType: undefined,
        verified: undefined,
        roleId: undefined,
        otpCodeHash: undefined,
        otpExpiresAt: undefined,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
    expect(result.resetTokenHash).toBeNull();
    expect(result.resetTokenExpiresAt).toBeNull();
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

  it("hasAnyVerified() returns true when at least one verified user exists", async () => {
    prisma.user.count.mockResolvedValue(1);

    const result = await repository.hasAnyVerified();

    expect(prisma.user.count).toHaveBeenCalledWith({ where: { verified: true } });
    expect(result).toBe(true);
  });

  it("hasAnyVerified() returns false when no verified user exists", async () => {
    prisma.user.count.mockResolvedValue(0);

    const result = await repository.hasAnyVerified();

    expect(result).toBe(false);
  });

  it("completeVerification() assigns firstVerifiedRoleId when no verified user exists yet, in a Serializable transaction", async () => {
    txUser.count.mockResolvedValue(0);
    txUser.update.mockResolvedValue({ ...record, verified: true, roleId: "role-super" });

    const result = await repository.completeVerification("user-1", { firstVerifiedRoleId: "role-super", otherwiseRoleId: "role-guest" });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(txUser.count).toHaveBeenCalledWith({ where: { verified: true } });
    expect(txUser.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: { verified: true, roleId: "role-super", otpCodeHash: null, otpExpiresAt: null },
    });
    expect(result.roleId).toBe("role-super");
  });

  it("completeVerification() assigns otherwiseRoleId once at least one verified user already exists", async () => {
    txUser.count.mockResolvedValue(1);
    txUser.update.mockResolvedValue({ ...record, verified: true, roleId: "role-guest" });

    const result = await repository.completeVerification("user-1", { firstVerifiedRoleId: "role-super", otherwiseRoleId: "role-guest" });

    expect(txUser.update).toHaveBeenCalledWith({
      where: { documentId: "user-1" },
      data: { verified: true, roleId: "role-guest", otpCodeHash: null, otpExpiresAt: null },
    });
    expect(result.roleId).toBe("role-guest");
  });

  it("completeVerification() retries once on a P2034 write conflict, then succeeds", async () => {
    prisma.$transaction.mockRejectedValueOnce(p2034Error()).mockImplementationOnce((fn: (tx: { user: typeof txUser }) => unknown) => fn({ user: txUser }));
    txUser.count.mockResolvedValue(0);
    txUser.update.mockResolvedValue({ ...record, verified: true, roleId: "role-super" });

    const result = await repository.completeVerification("user-1", { firstVerifiedRoleId: "role-super", otherwiseRoleId: "role-guest" });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result.roleId).toBe("role-super");
  });

  it("completeVerification() gives up after exhausting retries on repeated P2034 conflicts", async () => {
    prisma.$transaction.mockRejectedValue(p2034Error());

    await expect(repository.completeVerification("user-1", { firstVerifiedRoleId: "role-super", otherwiseRoleId: "role-guest" })).rejects.toMatchObject({
      code: "P2034",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("completeVerification() rethrows non-conflict errors immediately without retrying", async () => {
    const otherError = new Error("connection lost");
    prisma.$transaction.mockRejectedValue(otherError);

    await expect(repository.completeVerification("user-1", { firstVerifiedRoleId: "role-super", otherwiseRoleId: "role-guest" })).rejects.toThrow(otherError);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

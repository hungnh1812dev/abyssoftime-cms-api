import * as bcrypt from "bcryptjs";

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository } from "@/modules/users/domain/repositories/user.repository";

import { LocalStrategy } from "./local.strategy";

describe("LocalStrategy", () => {
  let users: jest.Mocked<Pick<IUserRepository, "findByEmail">>;
  let roles: jest.Mocked<Pick<IRoleRepository, "findById">>;
  let strategy: LocalStrategy;

  const email = "jane@example.com";
  const password = "s3cret-password";
  const adminRole = new RoleEntity("role-admin", "Admin", "admin", ["user:read", "role:read"], 50, true, new Date(), new Date(), null);

  const buildUser = async (overrides: Partial<{ verified: boolean; roleId: string | null }> = {}) =>
    new UserEntity(
      "user-1",
      email,
      "Jane Doe",
      "janedoe",
      await bcrypt.hash(password, 10),
      true,
      overrides.verified ?? true,
      overrides.roleId === undefined ? "role-admin" : overrides.roleId,
      new Date(),
      new Date(),
    );

  beforeEach(() => {
    users = { findByEmail: jest.fn() };
    roles = { findById: jest.fn() };
    strategy = new LocalStrategy(users as unknown as IUserRepository, roles as unknown as IRoleRepository);
  });

  it("throws UnauthorizedException when no user matches the email", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the password does not match", async () => {
    users.findByEmail.mockResolvedValue(await buildUser());

    await expect(strategy.validate(email, "wrong-password")).rejects.toThrow(UnauthorizedException);
  });

  it("throws ForbiddenException with a distinct message when the user is unverified", async () => {
    users.findByEmail.mockResolvedValue(await buildUser({ verified: false }));

    await expect(strategy.validate(email, password)).rejects.toThrow(ForbiddenException);
    await expect(strategy.validate(email, password)).rejects.toThrow(/not verified/i);
  });

  it("throws UnauthorizedException when a verified user somehow has no role assigned", async () => {
    users.findByEmail.mockResolvedValue(await buildUser({ roleId: null }));

    await expect(strategy.validate(email, password)).rejects.toThrow(UnauthorizedException);
  });

  it("resolves the role and returns { user, role } on success", async () => {
    const user = await buildUser();
    users.findByEmail.mockResolvedValue(user);
    roles.findById.mockResolvedValue(adminRole);

    const result = await strategy.validate(email, password);

    expect(roles.findById).toHaveBeenCalledWith("role-admin");
    expect(result).toEqual({ user, role: adminRole });
  });
});

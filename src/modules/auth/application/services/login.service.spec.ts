import { LoginDto } from "../dto/login.dto";
import * as bcrypt from "bcryptjs";

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { LoginService } from "./login.service";

describe("LoginService", () => {
  let service: LoginService;
  let users: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let jwtTokenService: jest.Mocked<Pick<JwtTokenService, "signAccessToken" | "signRefreshToken">>;

  const dto: LoginDto = { email: "jane@example.com", password: "s3cret-password" };
  const adminRole = new RoleEntity("role-admin", "Admin", "admin", ["user:read", "role:read"], 50, true, new Date(), new Date(), null);

  const buildUser = async (overrides: Partial<{ verified: boolean; roleId: string | null }> = {}) =>
    new UserEntity(
      "user-1",
      dto.email,
      "Jane Doe",
      "janedoe",
      await bcrypt.hash(dto.password, 10),
      true,
      overrides.verified ?? true,
      overrides.roleId === undefined ? "role-admin" : overrides.roleId,
      new Date(),
      new Date(),
    );

  beforeEach(async () => {
    users = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
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
    jwtTokenService = { signAccessToken: jest.fn(), signRefreshToken: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: ROLE_REPOSITORY, useValue: roles },
        { provide: JwtTokenService, useValue: jwtTokenService },
      ],
    }).compile();

    service = module.get(LoginService);
  });

  it("throws UnauthorizedException when no user matches the email", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(service.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the password does not match", async () => {
    users.findByEmail.mockResolvedValue(await buildUser());

    await expect(service.execute({ ...dto, password: "wrong-password" })).rejects.toThrow(UnauthorizedException);
  });

  it("throws ForbiddenException with a distinct message when the user is unverified", async () => {
    users.findByEmail.mockResolvedValue(await buildUser({ verified: false }));

    await expect(service.execute(dto)).rejects.toThrow(ForbiddenException);
    await expect(service.execute(dto)).rejects.toThrow(/not verified/i);
  });

  it("issues an access and refresh token embedding the resolved role", async () => {
    users.findByEmail.mockResolvedValue(await buildUser());
    roles.findById.mockResolvedValue(adminRole);
    jwtTokenService.signAccessToken.mockReturnValue("access-token");
    jwtTokenService.signRefreshToken.mockReturnValue("refresh-token");

    const result = await service.execute(dto);

    expect(roles.findById).toHaveBeenCalledWith("role-admin");
    expect(jwtTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: "user-1",
      roleSlug: adminRole.slug,
      level: adminRole.level,
      permissions: adminRole.permissions,
    });
    expect(jwtTokenService.signRefreshToken).toHaveBeenCalledWith({ sub: "user-1" });
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("throws UnauthorizedException when a verified user somehow has no role assigned", async () => {
    users.findByEmail.mockResolvedValue(await buildUser({ roleId: null }));

    await expect(service.execute(dto)).rejects.toThrow(UnauthorizedException);
  });
});

import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { RefreshTokenService } from "./refresh-token.service";

describe("RefreshTokenService", () => {
  let service: RefreshTokenService;
  let users: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let jwtTokenService: jest.Mocked<Pick<JwtTokenService, "signAccessToken" | "signRefreshToken" | "verifyRefreshToken" | "getRefreshTokenMaxAgeMs">>;

  const adminRole = new RoleEntity("role-admin", "Admin", "admin", ["user:read"], 50, true, new Date(), new Date(), null);
  const verifiedUser = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "hashed-password", true, true, "role-admin", new Date(), new Date());

  beforeEach(async () => {
    users = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      completeVerification: jest.fn(),
      findByResetTokenHash: jest.fn(),
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
    jwtTokenService = { signAccessToken: jest.fn(), signRefreshToken: jest.fn(), verifyRefreshToken: jest.fn(), getRefreshTokenMaxAgeMs: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: ROLE_REPOSITORY, useValue: roles },
        { provide: JwtTokenService, useValue: jwtTokenService },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it("throws UnauthorizedException when the refresh token is invalid or expired", async () => {
    jwtTokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    await expect(service.execute("bad-token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the token's subject no longer exists", async () => {
    jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1", rememberMe: false });
    users.findById.mockResolvedValue(null);

    await expect(service.execute("refresh-token")).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the user has no role assigned", async () => {
    jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1", rememberMe: false });
    users.findById.mockResolvedValue(new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "hashed-password", true, true, null, new Date(), new Date()));

    await expect(service.execute("refresh-token")).rejects.toThrow(UnauthorizedException);
  });

  it("re-fetches the user and role fresh from the database and rotates both tokens, preserving rememberMe:true", async () => {
    jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1", rememberMe: true });
    users.findById.mockResolvedValue(verifiedUser);
    roles.findById.mockResolvedValue(adminRole);
    jwtTokenService.signAccessToken.mockReturnValue("new-access-token");
    jwtTokenService.signRefreshToken.mockReturnValue("new-refresh-token");
    jwtTokenService.getRefreshTokenMaxAgeMs.mockReturnValue(30 * 24 * 60 * 60 * 1000);

    const result = await service.execute("refresh-token");

    expect(users.findById).toHaveBeenCalledWith("user-1");
    expect(roles.findById).toHaveBeenCalledWith("role-admin");
    expect(jwtTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: "user-1",
      roleSlug: adminRole.slug,
      level: adminRole.level,
      permissions: adminRole.permissions,
    });
    expect(jwtTokenService.signRefreshToken).toHaveBeenCalledWith({ sub: "user-1", rememberMe: true });
    expect(jwtTokenService.getRefreshTokenMaxAgeMs).toHaveBeenCalledWith(true);
    expect(result).toEqual({ accessToken: "new-access-token", refreshToken: "new-refresh-token", refreshTokenMaxAgeMs: 30 * 24 * 60 * 60 * 1000 });
  });

  it("rotates both tokens preserving rememberMe:false", async () => {
    jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1", rememberMe: false });
    users.findById.mockResolvedValue(verifiedUser);
    roles.findById.mockResolvedValue(adminRole);
    jwtTokenService.signAccessToken.mockReturnValue("new-access-token");
    jwtTokenService.signRefreshToken.mockReturnValue("new-refresh-token");
    jwtTokenService.getRefreshTokenMaxAgeMs.mockReturnValue(7 * 24 * 60 * 60 * 1000);

    const result = await service.execute("refresh-token");

    expect(jwtTokenService.signRefreshToken).toHaveBeenCalledWith({ sub: "user-1", rememberMe: false });
    expect(jwtTokenService.getRefreshTokenMaxAgeMs).toHaveBeenCalledWith(false);
    expect(result).toEqual({ accessToken: "new-access-token", refreshToken: "new-refresh-token", refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000 });
  });

  it("falls back to rememberMe:false for a pre-change token that has no rememberMe field at all", async () => {
    // Simulates a refresh token minted before this feature shipped — `rememberMe` is optional
    // precisely because a real legacy JWT payload won't carry it at runtime.
    jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: "user-1" });
    users.findById.mockResolvedValue(verifiedUser);
    roles.findById.mockResolvedValue(adminRole);
    jwtTokenService.signAccessToken.mockReturnValue("new-access-token");
    jwtTokenService.signRefreshToken.mockReturnValue("new-refresh-token");
    jwtTokenService.getRefreshTokenMaxAgeMs.mockReturnValue(7 * 24 * 60 * 60 * 1000);

    const result = await service.execute("refresh-token");

    expect(jwtTokenService.signRefreshToken).toHaveBeenCalledWith({ sub: "user-1", rememberMe: false });
    expect(jwtTokenService.getRefreshTokenMaxAgeMs).toHaveBeenCalledWith(false);
    expect(result).toEqual({ accessToken: "new-access-token", refreshToken: "new-refresh-token", refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000 });
  });
});

import { type ValidatedLoginUser } from "@/common/strategies/local.strategy";
import { JwtTokenService } from "@/common/token/jwt-token.service";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";

import { LoginService } from "./login.service";

describe("LoginService", () => {
  let jwtTokenService: jest.Mocked<Pick<JwtTokenService, "signAccessToken" | "signRefreshToken">>;
  let service: LoginService;

  const user = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "hashed-password", true, true, "role-admin", new Date(), new Date());
  const role = new RoleEntity("role-admin", "Admin", "admin", ["user:read", "role:read"], 50, true, new Date(), new Date(), null);
  const validated: ValidatedLoginUser = { user, role };

  beforeEach(() => {
    jwtTokenService = { signAccessToken: jest.fn(), signRefreshToken: jest.fn() };
    service = new LoginService(jwtTokenService as unknown as JwtTokenService);
  });

  it("signs an access token embedding the resolved role and a refresh token with just the sub", () => {
    jwtTokenService.signAccessToken.mockReturnValue("access-token");
    jwtTokenService.signRefreshToken.mockReturnValue("refresh-token");

    const result = service.execute(validated);

    expect(jwtTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: user.documentId,
      roleSlug: role.slug,
      level: role.level,
      permissions: role.permissions,
    });
    expect(jwtTokenService.signRefreshToken).toHaveBeenCalledWith({ sub: user.documentId });
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });
});

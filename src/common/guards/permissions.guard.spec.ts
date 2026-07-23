import { type AuthenticatedRequest } from "../types/authenticated-request";

import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";

import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let guard: PermissionsGuard;

  const contextWith = (user?: { roleSlug: string; level: number; permissions: string[] }): ExecutionContext => {
    const request: Partial<AuthenticatedRequest> = { user: user as AuthenticatedRequest["user"] };
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it("allows the request when the handler has no @RequirePermissions", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(contextWith(undefined));

    expect(result).toBe(true);
  });

  it("allows the request when @RequirePermissions is an empty list", () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const result = guard.canActivate(contextWith(undefined));

    expect(result).toBe(true);
  });

  it("allows the request when the caller holds the exact required permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["role:read"]);

    const result = guard.canActivate(contextWith({ roleSlug: "admin", level: 50, permissions: ["role:read"] }));

    expect(result).toBe(true);
  });

  it("allows a :read requirement when the caller only holds the matching :manager permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["role:read"]);

    const result = guard.canActivate(contextWith({ roleSlug: "super_admin", level: 100, permissions: ["role:manager"] }));

    expect(result).toBe(true);
  });

  it("throws ForbiddenException when the caller lacks the required permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["role:manager"]);

    expect(() => guard.canActivate(contextWith({ roleSlug: "admin", level: 50, permissions: ["role:read"] }))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when there is no authenticated user", () => {
    reflector.getAllAndOverride.mockReturnValue(["role:read"]);

    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
  });
});

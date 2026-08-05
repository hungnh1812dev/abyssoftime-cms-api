import { type AuthenticatedRequest } from "../types/authenticated-request";

import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";

import { DocumentPermissionsGuard } from "./document-permissions.guard";

describe("DocumentPermissionsGuard", () => {
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;
  let guard: DocumentPermissionsGuard;

  const contextWith = (slug: string, user?: { roleSlug: string; level: number; permissions: string[] }): ExecutionContext => {
    const request: Partial<AuthenticatedRequest> = { user: user as AuthenticatedRequest["user"], params: { slug } };
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new DocumentPermissionsGuard(reflector as unknown as Reflector);
  });

  it("allows the request when the handler has no @RequirePermissions", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(contextWith("cv-page", undefined));

    expect(result).toBe(true);
  });

  it("allows the request when @RequirePermissions is an empty list", () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const result = guard.canActivate(contextWith("cv-page", undefined));

    expect(result).toBe(true);
  });

  it("allows the request when the caller holds the global (unscoped) permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["document:read"]);

    const result = guard.canActivate(contextWith("cv-page", { roleSlug: "editor", level: 50, permissions: ["document:read"] }));

    expect(result).toBe(true);
  });

  it("allows the request when the caller holds the permission scoped to this content type", () => {
    reflector.getAllAndOverride.mockReturnValue(["document:read"]);

    const result = guard.canActivate(contextWith("cv-page", { roleSlug: "editor", level: 50, permissions: ["document:read:cv-page"] }));

    expect(result).toBe(true);
  });

  it("throws ForbiddenException when the caller only holds the permission scoped to a different content type", () => {
    reflector.getAllAndOverride.mockReturnValue(["document:read"]);

    expect(() => guard.canActivate(contextWith("cv-page", { roleSlug: "editor", level: 50, permissions: ["document:read:blog-post"] }))).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when the caller has no permissions at all", () => {
    reflector.getAllAndOverride.mockReturnValue(["document:read"]);

    expect(() => guard.canActivate(contextWith("cv-page", undefined))).toThrow(ForbiddenException);
  });

  it("requires every declared permission (bulk-create route needs create + publish)", () => {
    reflector.getAllAndOverride.mockReturnValue(["document:create", "document:publish"]);

    expect(() => guard.canActivate(contextWith("cv-page", { roleSlug: "editor", level: 50, permissions: ["document:create:cv-page"] }))).toThrow(ForbiddenException);

    const result = guard.canActivate(contextWith("cv-page", { roleSlug: "editor", level: 50, permissions: ["document:create:cv-page", "document:publish:cv-page"] }));
    expect(result).toBe(true);
  });
});

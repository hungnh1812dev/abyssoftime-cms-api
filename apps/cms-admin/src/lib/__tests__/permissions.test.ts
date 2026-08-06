import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { hasDocumentPermission, hasPermission, usePermissionGate } from "@/lib/permissions";

describe("hasPermission", () => {
  it("returns true when the caller holds the exact required permission", () => {
    expect(hasPermission(["role:read"], "role:read")).toBe(true);
  });

  it("returns true for a :read requirement when the caller only holds the matching :manager permission", () => {
    expect(hasPermission(["media:manager"], "media:read")).toBe(true);
  });

  it("returns false when the caller holds an unrelated permission", () => {
    expect(hasPermission(["document:read"], "media:read")).toBe(false);
  });

  it("returns false for a :manager requirement when the caller only holds the :read permission", () => {
    expect(hasPermission(["media:read"], "media:manager")).toBe(false);
  });

  it("returns false when the caller has no permissions", () => {
    expect(hasPermission([], "user:read")).toBe(false);
  });
});

describe("hasDocumentPermission", () => {
  it("returns true when the caller holds the bare document action, regardless of content type", () => {
    expect(hasDocumentPermission(["document:read"], "read", "cv-page")).toBe(true);
  });

  it("returns true when the caller holds the action scoped to the requested content type", () => {
    expect(hasDocumentPermission(["document:read:cv-page"], "read", "cv-page")).toBe(true);
  });

  it("returns false when the caller only holds the action scoped to a different content type", () => {
    expect(hasDocumentPermission(["document:read:blog-post"], "read", "cv-page")).toBe(false);
  });

  it("returns true when the caller holds both the bare and scoped grant", () => {
    expect(hasDocumentPermission(["document:read", "document:read:cv-page"], "read", "cv-page")).toBe(true);
  });

  it("returns false when the caller has no permissions", () => {
    expect(hasDocumentPermission([], "read", "cv-page")).toBe(false);
  });
});

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("usePermissionGate", () => {
  it("is allowed (bare mode) when the caller holds the required permission", () => {
    mockUseAuth.mockReturnValue({ permissions: ["role:manager"] });
    const { result } = renderHook(() => usePermissionGate("role:manager"));
    expect(result.current.allowed).toBe(true);
  });

  it("is denied (bare mode) with a reason naming the required permission", () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    const { result } = renderHook(() => usePermissionGate("role:manager"));
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('Requires the "role:manager" permission');
  });

  it("is allowed (scoped mode) when the caller holds the content-type-scoped document action", () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:create:cv-page"] });
    const { result } = renderHook(() => usePermissionGate("create", "cv-page"));
    expect(result.current.allowed).toBe(true);
  });

  it("is denied (scoped mode) when the caller's scoped grant is for a different content type", () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:create:blog-post"] });
    const { result } = renderHook(() => usePermissionGate("create", "cv-page"));
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('Requires the "document:create" permission for this content type');
  });
});

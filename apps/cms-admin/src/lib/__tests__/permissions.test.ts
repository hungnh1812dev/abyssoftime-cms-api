import { describe, expect, it } from "vitest";

import { hasPermission } from "@/lib/permissions";

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

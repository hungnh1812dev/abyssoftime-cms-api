import { describe, expect, it } from "vitest";

import { buildDocumentPermissionSlug, parseDocumentPermissionSlug } from "@/components/permissions/permissionGrouping";

describe("parseDocumentPermissionSlug", () => {
  it("parses a global document slug with no content-type scope", () => {
    expect(parseDocumentPermissionSlug("document:read")).toEqual({ action: "read" });
  });

  it("parses a scoped document slug with its content-type slug", () => {
    expect(parseDocumentPermissionSlug("document:read:cv-page")).toEqual({
      action: "read",
      contentTypeSlug: "cv-page",
    });
  });

  it("returns null for a non-document slug", () => {
    expect(parseDocumentPermissionSlug("media:read")).toBeNull();
  });

  it("returns null for a malformed document slug with too many segments", () => {
    expect(parseDocumentPermissionSlug("document:read:cv-page:extra")).toBeNull();
  });
});

describe("buildDocumentPermissionSlug", () => {
  it("builds a global document slug when no content-type slug is given", () => {
    expect(buildDocumentPermissionSlug("read")).toBe("document:read");
  });

  it("builds a scoped document slug when a content-type slug is given", () => {
    expect(buildDocumentPermissionSlug("read", "cv-page")).toBe("document:read:cv-page");
  });
});

describe("parseDocumentPermissionSlug and buildDocumentPermissionSlug round-trip", () => {
  it("round-trips a global document slug", () => {
    const slug = buildDocumentPermissionSlug("publish");
    expect(parseDocumentPermissionSlug(slug)).toEqual({ action: "publish" });
  });

  it("round-trips a scoped document slug", () => {
    const slug = buildDocumentPermissionSlug("publish", "cv-contact");
    expect(parseDocumentPermissionSlug(slug)).toEqual({ action: "publish", contentTypeSlug: "cv-contact" });
  });
});

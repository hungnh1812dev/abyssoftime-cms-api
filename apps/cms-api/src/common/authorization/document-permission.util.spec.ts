import { isDocumentActionGranted } from "./document-permission.util";

describe("isDocumentActionGranted", () => {
  it("grants when the global slug is present", () => {
    expect(isDocumentActionGranted(["document:read"], "document:read", "cv-page")).toBe(true);
  });

  it("grants when the content-type-scoped slug is present", () => {
    expect(isDocumentActionGranted(["document:read:cv-page"], "document:read", "cv-page")).toBe(true);
  });

  it("denies when neither the global nor the matching scoped slug is present", () => {
    expect(isDocumentActionGranted(["document:read:blog-post"], "document:read", "cv-page")).toBe(false);
  });

  it("grants when both the global and scoped slugs are present", () => {
    expect(isDocumentActionGranted(["document:read", "document:read:cv-page"], "document:read", "cv-page")).toBe(true);
  });

  it("denies when the granted list is empty", () => {
    expect(isDocumentActionGranted([], "document:read", "cv-page")).toBe(false);
  });
});

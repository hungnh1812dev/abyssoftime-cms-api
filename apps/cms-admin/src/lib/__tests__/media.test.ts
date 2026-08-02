import { describe, expect, it } from "vitest";

import { displayFileName } from "@/lib/media";

describe("displayFileName", () => {
  it("inserts an 8-char hash prefix before the extension", () => {
    expect(displayFileName({ fileName: "avatar.jpg", hash: "3a7bd3e2360a3d8f9c1b2e4a5d6f7089", createdAt: "2026-08-02T10:00:00.000Z" })).toMatch(/^avatar_[0-9a-f]{8}\.jpg$/);
  });

  it("handles multi-part extensions by only splitting on the last dot", () => {
    expect(displayFileName({ fileName: "archive.tar.gz", hash: "abcdef1234567890", createdAt: "2026-08-02T10:00:00.000Z" })).toMatch(/^archive\.tar_[0-9a-f]{8}\.gz$/);
  });

  it("appends the hash with no extension when the filename has no dot", () => {
    expect(displayFileName({ fileName: "README", hash: "abcdef1234567890", createdAt: "2026-08-02T10:00:00.000Z" })).toMatch(/^README_[0-9a-f]{8}$/);
  });

  it("appends the hash when the filename starts with a dot (dotfile, not an extension)", () => {
    expect(displayFileName({ fileName: ".gitignore", hash: "abcdef1234567890", createdAt: "2026-08-02T10:00:00.000Z" })).toMatch(/^\.gitignore_[0-9a-f]{8}$/);
  });

  it("produces different display names for the same content hash uploaded at different times", () => {
    const first = displayFileName({ fileName: "photo.png", hash: "sameContentHash", createdAt: "2026-08-02T10:00:00.000Z" });
    const second = displayFileName({ fileName: "photo.png", hash: "sameContentHash", createdAt: "2026-08-02T11:30:00.000Z" });
    expect(first).not.toBe(second);
  });

  it("produces the same display name for the same content hash and the same createdAt", () => {
    const first = displayFileName({ fileName: "photo.png", hash: "sameContentHash", createdAt: "2026-08-02T10:00:00.000Z" });
    const second = displayFileName({ fileName: "photo.png", hash: "sameContentHash", createdAt: "2026-08-02T10:00:00.000Z" });
    expect(first).toBe(second);
  });
});

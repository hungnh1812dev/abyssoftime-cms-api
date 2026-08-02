import { describe, expect, it } from "vitest";

import { displayFileName } from "@/lib/media";

describe("displayFileName", () => {
  it("inserts an 8-char hash prefix before the extension", () => {
    expect(displayFileName({ fileName: "avatar.jpg", hash: "3a7bd3e2360a3d8f9c1b2e4a5d6f7089" })).toBe("avatar_3a7bd3e2.jpg");
  });

  it("handles multi-part extensions by only splitting on the last dot", () => {
    expect(displayFileName({ fileName: "archive.tar.gz", hash: "abcdef1234567890" })).toBe("archive.tar_abcdef12.gz");
  });

  it("appends the hash with no extension when the filename has no dot", () => {
    expect(displayFileName({ fileName: "README", hash: "abcdef1234567890" })).toBe("README_abcdef12");
  });

  it("appends the hash when the filename starts with a dot (dotfile, not an extension)", () => {
    expect(displayFileName({ fileName: ".gitignore", hash: "abcdef1234567890" })).toBe(".gitignore_abcdef12");
  });
});

import { describe, expect, it } from "vitest";

import { displayFileName } from "@/lib/media";

describe("displayFileName", () => {
  it("appends the file's extension to the real Cloudinary publicId", () => {
    expect(displayFileName({ fileName: "avatar.jpg", publicId: "avatar_3a7bd3e2" })).toBe("avatar_3a7bd3e2.jpg");
  });

  it("handles multi-part extensions by only splitting on the last dot", () => {
    expect(displayFileName({ fileName: "archive.tar.gz", publicId: "archive-tar_abcdef12" })).toBe("archive-tar_abcdef12.gz");
  });

  it("appends no extension when the filename has no dot", () => {
    expect(displayFileName({ fileName: "README", publicId: "README_abcdef12" })).toBe("README_abcdef12");
  });

  it("appends no extension when the filename starts with a dot (dotfile, not an extension)", () => {
    expect(displayFileName({ fileName: ".gitignore", publicId: "gitignore_abcdef12" })).toBe("gitignore_abcdef12");
  });

  it("matches whatever Cloudinary named the asset, regardless of content hash or upload time", () => {
    expect(displayFileName({ fileName: "photo.png", publicId: "photo_11112222" })).toBe("photo_11112222.png");
    expect(displayFileName({ fileName: "photo.png", publicId: "photo_33334444" })).toBe("photo_33334444.png");
  });
});

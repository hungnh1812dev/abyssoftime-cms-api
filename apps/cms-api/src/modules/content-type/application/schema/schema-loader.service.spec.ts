import { mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { ContentTypesDirectoryNotFoundError, SchemaLoaderService } from "./schema-loader.service";

describe("SchemaLoaderService", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "content-types-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function buildService(): SchemaLoaderService {
    const configService = { get: jest.fn() };
    return new SchemaLoaderService(configService as unknown as ConfigService<EnvironmentVariables, true>);
  }

  it("loads valid content-type JSON files and defaults listFields to the first 3 field names", async () => {
    await writeFile(
      path.join(tempDir, "cv-page.json"),
      JSON.stringify({
        slug: "cv-page",
        name: "CV Page",
        kind: "collection",
        draftToPublish: true,
        fields: [
          { name: "position", type: "text" },
          { name: "company", type: "text" },
          { name: "summary", type: "richtext" },
          { name: "isMain", type: "boolean" },
        ],
      }),
    );

    const definitions = await buildService().loadFromDir(tempDir);

    expect(definitions).toHaveLength(1);
    expect(definitions[0].slug).toBe("cv-page");
    expect(definitions[0].listFields).toEqual(["position", "company", "summary"]);
  });

  it("keeps an explicit listFields instead of defaulting", async () => {
    await writeFile(
      path.join(tempDir, "cv-page.json"),
      JSON.stringify({
        slug: "cv-page",
        name: "CV Page",
        kind: "collection",
        draftToPublish: true,
        fields: [
          { name: "position", type: "text" },
          { name: "company", type: "text" },
        ],
        listFields: ["company"],
      }),
    );

    const [definition] = await buildService().loadFromDir(tempDir);

    expect(definition.listFields).toEqual(["company"]);
  });

  it("throws on malformed JSON", async () => {
    await writeFile(path.join(tempDir, "broken.json"), "{ not valid json");

    await expect(buildService().loadFromDir(tempDir)).rejects.toThrow();
  });

  it("throws when a content type fails structural validation", async () => {
    await writeFile(
      path.join(tempDir, "bad.json"),
      JSON.stringify({
        slug: "Bad Slug!",
        name: "Bad",
        kind: "collection",
        draftToPublish: true,
        fields: [],
      }),
    );

    await expect(buildService().loadFromDir(tempDir)).rejects.toThrow();
  });

  it("throws ContentTypesDirectoryNotFoundError when the directory does not exist", async () => {
    const missingDir = path.join(tempDir, "does-not-exist");

    await expect(buildService().loadFromDir(missingDir)).rejects.toThrow(ContentTypesDirectoryNotFoundError);
  });

  it("ignores non-JSON files in the directory", async () => {
    await writeFile(path.join(tempDir, "README.md"), "# not a content type");
    await writeFile(
      path.join(tempDir, "cv-page.json"),
      JSON.stringify({
        slug: "cv-page",
        name: "CV Page",
        kind: "collection",
        draftToPublish: true,
        fields: [{ name: "position", type: "text" }],
      }),
    );

    const definitions = await buildService().loadFromDir(tempDir);

    expect(definitions).toHaveLength(1);
  });

  it("resolves the directory from CONTENT_TYPES_DIR relative to process.cwd() when load() is called", async () => {
    const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(tempDir);

    try {
      const configService = { get: jest.fn().mockReturnValue(".") };
      const service = new SchemaLoaderService(configService as unknown as ConfigService<EnvironmentVariables, true>);
      await writeFile(
        path.join(tempDir, "cv-page.json"),
        JSON.stringify({
          slug: "cv-page",
          name: "CV Page",
          kind: "collection",
          draftToPublish: true,
          fields: [{ name: "position", type: "text" }],
        }),
      );

      const definitions = await service.load();

      expect(definitions).toHaveLength(1);
      expect(configService.get).toHaveBeenCalledWith("CONTENT_TYPES_DIR", { infer: true });
    } finally {
      cwdSpy.mockRestore();
    }
  });
});

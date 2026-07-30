import { FieldDefinition } from "../../domain/entities/field-definition";
import { ContentTypeNotFoundError } from "../../domain/repositories/content-type.repository";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaContentTypeRepository } from "./prisma-content-type.repository";

describe("PrismaContentTypeRepository", () => {
  let repository: PrismaContentTypeRepository;
  let prisma: {
    contentType: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const fields: FieldDefinition[] = [{ name: "wordGroup", type: "text" }];
  const listFields = ["wordGroup"];

  const record = {
    documentId: "ct-1",
    slug: "en-it-vocab",
    name: "English IT Vocabulary",
    kind: "collection",
    draftToPublish: true,
    fields,
    listFields,
    listFieldsOverride: null as unknown,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  beforeEach(() => {
    prisma = {
      contentType: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    repository = new PrismaContentTypeRepository(prisma as unknown as PrismaService);
  });

  const knownRequestError = (code: string) => new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

  const expectMappedEntity = (entity: { documentId: string; slug: string; fields: unknown; listFields: unknown }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      slug: record.slug,
      name: record.name,
      kind: record.kind,
      draftToPublish: record.draftToPublish,
      fields: record.fields,
      listFields: record.listFields,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  };

  it("create() passes fields through and maps the created record", async () => {
    prisma.contentType.create.mockResolvedValue(record);

    const result = await repository.create({
      slug: "en-it-vocab",
      name: "English IT Vocabulary",
      kind: "collection",
      draftToPublish: true,
      fields,
      listFields,
    });

    expect(prisma.contentType.create).toHaveBeenCalledWith({
      data: {
        slug: "en-it-vocab",
        name: "English IT Vocabulary",
        kind: "collection",
        draftToPublish: true,
        fields,
        listFields,
      },
    });
    expectMappedEntity(result);
  });

  it("update() looks up by slug and maps the updated record", async () => {
    prisma.contentType.update.mockResolvedValue(record);

    const result = await repository.update("en-it-vocab", {
      slug: "en-it-vocab",
      name: "English IT Vocabulary",
      kind: "collection",
      draftToPublish: true,
      fields,
      listFields,
    });

    expect(prisma.contentType.update).toHaveBeenCalledWith({
      where: { slug: "en-it-vocab" },
      data: {
        name: "English IT Vocabulary",
        kind: "collection",
        draftToPublish: true,
        fields,
        listFields,
      },
    });
    expectMappedEntity(result);
  });

  it("update() translates a P2025 not-found error into ContentTypeNotFoundError", async () => {
    prisma.contentType.update.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.update("missing", { slug: "missing", name: "x", kind: "collection", draftToPublish: true, fields: [], listFields: [] })).rejects.toThrow(
      ContentTypeNotFoundError,
    );
  });

  it("delete() removes the record by slug", async () => {
    prisma.contentType.delete.mockResolvedValue(record);

    await repository.delete("en-it-vocab");

    expect(prisma.contentType.delete).toHaveBeenCalledWith({ where: { slug: "en-it-vocab" } });
  });

  it("delete() translates a P2025 not-found error into ContentTypeNotFoundError", async () => {
    prisma.contentType.delete.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.delete("missing")).rejects.toThrow(ContentTypeNotFoundError);
  });

  it("delete() rethrows unrelated errors", async () => {
    prisma.contentType.delete.mockRejectedValue(new Error("db down"));

    await expect(repository.delete("en-it-vocab")).rejects.toThrow("db down");
  });

  it("findBySlug() maps the found record", async () => {
    prisma.contentType.findUnique.mockResolvedValue(record);

    const result = await repository.findBySlug("en-it-vocab");

    expect(prisma.contentType.findUnique).toHaveBeenCalledWith({ where: { slug: "en-it-vocab" } });
    expectMappedEntity(result!);
  });

  it("findBySlug() returns null when no record is found", async () => {
    prisma.contentType.findUnique.mockResolvedValue(null);

    const result = await repository.findBySlug("missing");

    expect(result).toBeNull();
  });

  it("findAll() maps every record", async () => {
    prisma.contentType.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.contentType.findMany).toHaveBeenCalledWith();
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findBySlug() falls back to listFields when listFieldsOverride is null", async () => {
    prisma.contentType.findUnique.mockResolvedValue({ ...record, listFieldsOverride: null });

    const result = await repository.findBySlug("en-it-vocab");

    expect(result!.listFields).toEqual(listFields);
  });

  it("findBySlug() prefers listFieldsOverride over listFields when both are present", async () => {
    prisma.contentType.findUnique.mockResolvedValue({ ...record, listFieldsOverride: ["wordGroup", "updatedAt"] });

    const result = await repository.findBySlug("en-it-vocab");

    expect(result!.listFields).toEqual(["wordGroup", "updatedAt"]);
  });

  it("updateListFields() updates only listFieldsOverride and maps the merged record", async () => {
    prisma.contentType.update.mockResolvedValue({ ...record, listFieldsOverride: ["wordGroup", "updatedAt"] });

    const result = await repository.updateListFields("en-it-vocab", ["wordGroup", "updatedAt"]);

    expect(prisma.contentType.update).toHaveBeenCalledWith({
      where: { slug: "en-it-vocab" },
      data: { listFieldsOverride: ["wordGroup", "updatedAt"] },
    });
    expect(result.listFields).toEqual(["wordGroup", "updatedAt"]);
  });

  it("updateListFields() translates a P2025 not-found error into ContentTypeNotFoundError", async () => {
    prisma.contentType.update.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.updateListFields("missing", ["wordGroup"])).rejects.toThrow(ContentTypeNotFoundError);
  });

  it("updateListFields() rethrows unrelated errors", async () => {
    prisma.contentType.update.mockRejectedValue(new Error("db down"));

    await expect(repository.updateListFields("en-it-vocab", ["wordGroup"])).rejects.toThrow("db down");
  });

  it("findAllSummaries() selects only name/slug/kind/draftToPublish", async () => {
    prisma.contentType.findMany.mockResolvedValue([{ name: record.name, slug: record.slug, kind: record.kind, draftToPublish: record.draftToPublish }]);

    const result = await repository.findAllSummaries();

    expect(prisma.contentType.findMany).toHaveBeenCalledWith({
      select: { name: true, slug: true, kind: true, draftToPublish: true },
    });
    expect(result).toEqual([{ name: record.name, slug: record.slug, kind: record.kind, draftToPublish: record.draftToPublish }]);
  });
});

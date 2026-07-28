import { ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { FieldDefinition } from "../../domain/entities/field-definition";
import { IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { UpdateListFieldsService } from "./update-list-fields.service";

describe("UpdateListFieldsService", () => {
  const fields: FieldDefinition[] = [
    { name: "title", type: "text" },
    { name: "bio", type: "richtext" },
    { name: "avatar", type: "media" },
    { name: "techStack", type: "json" },
    { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
  ];

  const entity = new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, fields, ["title"], new Date(), new Date());

  function buildRepository(): jest.Mocked<IContentTypeRepository> {
    return {
      create: jest.fn(),
      update: jest.fn(),
      updateListFields: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findAllSummaries: jest.fn(),
    };
  }

  it("throws NotFoundException when the content type is unknown", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(null);
    const service = new UpdateListFieldsService(contentTypes);

    await expect(service.execute("missing", ["title"])).rejects.toThrow(NotFoundException);
    expect(contentTypes.updateListFields).not.toHaveBeenCalled();
  });

  it("accepts a listable system column", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(entity);
    contentTypes.updateListFields.mockResolvedValue(entity);
    const service = new UpdateListFieldsService(contentTypes);

    await service.execute("cv-page", ["updatedAt"]);

    expect(contentTypes.updateListFields).toHaveBeenCalledWith("cv-page", ["updatedAt"]);
  });

  it("accepts a field with an eligible kind (text/number/boolean)", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(entity);
    contentTypes.updateListFields.mockResolvedValue(entity);
    const service = new UpdateListFieldsService(contentTypes);

    const result = await service.execute("cv-page", ["title"]);

    expect(contentTypes.updateListFields).toHaveBeenCalledWith("cv-page", ["title"]);
    expect(result).toBe(entity);
  });

  it("rejects a name that matches no system column and no field", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(entity);
    const service = new UpdateListFieldsService(contentTypes);

    await expect(service.execute("cv-page", ["nonexistent"])).rejects.toThrow(BadRequestException);
    expect(contentTypes.updateListFields).not.toHaveBeenCalled();
  });

  it.each([["bio"], ["avatar"], ["techStack"], ["roles"]])("rejects field %s whose kind is not listable (richtext/media/json/component)", async (name) => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(entity);
    const service = new UpdateListFieldsService(contentTypes);

    await expect(service.execute("cv-page", [name])).rejects.toThrow(BadRequestException);
    expect(contentTypes.updateListFields).not.toHaveBeenCalled();
  });
});

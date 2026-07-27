import { ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { NotFoundException } from "@nestjs/common";

import { GetContentTypeService } from "./get-content-type.service";

describe("GetContentTypeService", () => {
  const entity = new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, [{ name: "position", type: "text" }], ["position"], new Date(), new Date());

  function buildRepository(): jest.Mocked<IContentTypeRepository> {
    return {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findAllSummaries: jest.fn(),
    };
  }

  it("returns the full entity when found", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(entity);

    const service = new GetContentTypeService(contentTypes);
    const result = await service.execute("cv-page");

    expect(contentTypes.findBySlug).toHaveBeenCalledWith("cv-page");
    expect(result).toBe(entity);
  });

  it("throws NotFoundException when the content type is unknown", async () => {
    const contentTypes = buildRepository();
    contentTypes.findBySlug.mockResolvedValue(null);

    const service = new GetContentTypeService(contentTypes);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
  });
});

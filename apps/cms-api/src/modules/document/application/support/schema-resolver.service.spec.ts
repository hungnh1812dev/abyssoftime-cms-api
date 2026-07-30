import { GetContentTypeService } from "../../../content-type/application/services/get-content-type.service";
import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { NotFoundException } from "@nestjs/common";

import { SchemaResolverService } from "./schema-resolver.service";

describe("SchemaResolverService", () => {
  const entity = new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, [{ name: "position", type: "text" }], ["position"], new Date(), new Date());

  function buildGetContentTypeService(): jest.Mocked<GetContentTypeService> {
    return { execute: jest.fn() } as unknown as jest.Mocked<GetContentTypeService>;
  }

  it("returns the resolved content type entity", async () => {
    const getContentType = buildGetContentTypeService();
    getContentType.execute.mockResolvedValue(entity);

    const service = new SchemaResolverService(getContentType);
    const result = await service.resolve("cv-page");

    expect(getContentType.execute).toHaveBeenCalledWith("cv-page");
    expect(result).toBe(entity);
  });

  it("propagates NotFoundException for an unknown slug", async () => {
    const getContentType = buildGetContentTypeService();
    getContentType.execute.mockRejectedValue(new NotFoundException('Content type "missing" not found'));

    const service = new SchemaResolverService(getContentType);

    await expect(service.resolve("missing")).rejects.toThrow(NotFoundException);
  });
});

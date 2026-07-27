import { ContentTypeSummary } from "../../domain/entities/content-type.entity";
import { IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { ListContentTypeService } from "./list-content-type.service";

describe("ListContentTypeService", () => {
  it("returns the summaries from the repository", async () => {
    const summaries: ContentTypeSummary[] = [{ slug: "cv-page", name: "CV Page", kind: "collection", draftToPublish: true }];
    const contentTypes: jest.Mocked<IContentTypeRepository> = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      findAllSummaries: jest.fn().mockResolvedValue(summaries),
    };

    const service = new ListContentTypeService(contentTypes);
    const result = await service.execute();

    expect(contentTypes.findAllSummaries).toHaveBeenCalled();
    expect(result).toBe(summaries);
  });
});

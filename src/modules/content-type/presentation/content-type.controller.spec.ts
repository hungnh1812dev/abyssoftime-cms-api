import { UpdateListFieldsDto } from "../application/dto/update-list-fields.dto";
import { GetContentTypeService } from "../application/services/get-content-type.service";
import { ListContentTypeService } from "../application/services/list-content-type.service";
import { UpdateListFieldsService } from "../application/services/update-list-fields.service";
import { ContentTypeEntity, ContentTypeSummary } from "../domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";

import { ContentTypeController } from "./content-type.controller";

describe("ContentTypeController", () => {
  let controller: ContentTypeController;
  let listContentTypeService: jest.Mocked<ListContentTypeService>;
  let getContentTypeService: jest.Mocked<GetContentTypeService>;
  let updateListFieldsService: jest.Mocked<UpdateListFieldsService>;

  const entity = new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, [{ name: "position", type: "text" }], ["position"], new Date(), new Date());

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContentTypeController],
      providers: [
        { provide: ListContentTypeService, useValue: { execute: jest.fn() } },
        { provide: GetContentTypeService, useValue: { execute: jest.fn() } },
        { provide: UpdateListFieldsService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ContentTypeController);
    listContentTypeService = module.get(ListContentTypeService);
    getContentTypeService = module.get(GetContentTypeService);
    updateListFieldsService = module.get(UpdateListFieldsService);
  });

  it("list() delegates to ListContentTypeService", async () => {
    const summaries: ContentTypeSummary[] = [{ slug: "cv-page", name: "CV Page", kind: "collection", draftToPublish: true }];
    listContentTypeService.execute.mockResolvedValue(summaries);

    const result = await controller.list();

    expect(listContentTypeService.execute).toHaveBeenCalled();
    expect(result).toBe(summaries);
  });

  it("getBySlug() delegates to GetContentTypeService for a valid slug", async () => {
    getContentTypeService.execute.mockResolvedValue(entity);

    const result = await controller.getBySlug("cv-page");

    expect(getContentTypeService.execute).toHaveBeenCalledWith("cv-page");
    expect(result).toBe(entity);
  });

  it("getBySlug() throws BadRequestException for an invalid slug, without touching the service", async () => {
    await expect(controller.getBySlug("Bad Slug!")).rejects.toThrow(BadRequestException);
    expect(getContentTypeService.execute).not.toHaveBeenCalled();
  });

  it("updateListFields() delegates to UpdateListFieldsService", async () => {
    updateListFieldsService.execute.mockResolvedValue(entity);
    const dto: UpdateListFieldsDto = { listFields: ["position", "updatedAt"] };

    const result = await controller.updateListFields("cv-page", dto);

    expect(updateListFieldsService.execute).toHaveBeenCalledWith("cv-page", ["position", "updatedAt"]);
    expect(result).toBe(entity);
  });
});

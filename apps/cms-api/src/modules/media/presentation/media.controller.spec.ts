import { DeleteMediaService } from "../application/services/delete-media.service";
import { ListMediaService } from "../application/services/list-media.service";
import { UploadMediaService } from "../application/services/upload-media.service";
import { MediaAssetEntity } from "../domain/entities/media-asset.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { MediaController } from "./media.controller";

describe("MediaController", () => {
  let controller: MediaController;
  let uploadMediaService: jest.Mocked<UploadMediaService>;
  let listMediaService: jest.Mocked<ListMediaService>;
  let deleteMediaService: jest.Mocked<DeleteMediaService>;

  const entity = new MediaAssetEntity(
    "media-1",
    "photo.png",
    "image/png",
    1024,
    100,
    200,
    "https://cdn.example.com/photo.png",
    "https://cdn.example.com/photo-thumb.png",
    "public-id-1",
    "hash-1",
    "caller-1",
    new Date(),
    new Date(),
  );
  const req = { user: { sub: "caller-1" } } as AuthenticatedRequest;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: UploadMediaService, useValue: { execute: jest.fn() } },
        { provide: ListMediaService, useValue: { execute: jest.fn() } },
        { provide: DeleteMediaService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(MediaController);
    uploadMediaService = module.get(UploadMediaService);
    listMediaService = module.get(ListMediaService);
    deleteMediaService = module.get(DeleteMediaService);
  });

  it("list() delegates to ListMediaService and returns the entities", async () => {
    listMediaService.execute.mockResolvedValue([entity]);

    const result = await controller.list();

    expect(listMediaService.execute).toHaveBeenCalled();
    expect(result).toEqual([entity]);
  });

  it("upload() delegates to UploadMediaService with the file buffer and caller id", async () => {
    uploadMediaService.execute.mockResolvedValue(entity);
    const file = { buffer: Buffer.from("data"), originalname: "photo.png", mimetype: "image/png", size: 4 };

    const result = await controller.upload(file, req);

    expect(uploadMediaService.execute).toHaveBeenCalledWith({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      uploadedBy: "caller-1",
    });
    expect(result).toEqual(entity);
  });

  it("upload() throws BadRequestException when no file is provided", async () => {
    await expect(controller.upload(undefined as never, req)).rejects.toThrow(BadRequestException);
    expect(uploadMediaService.execute).not.toHaveBeenCalled();
  });

  it("delete() delegates to DeleteMediaService", async () => {
    deleteMediaService.execute.mockResolvedValue(undefined);

    await controller.delete("media-1");

    expect(deleteMediaService.execute).toHaveBeenCalledWith("media-1");
  });
});

import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { IMediaAssetRepository } from "../../domain/repositories/media-asset.repository";

import { ListMediaService } from "./list-media.service";

describe("ListMediaService", () => {
  let service: ListMediaService;
  let mediaAssets: jest.Mocked<IMediaAssetRepository>;

  beforeEach(() => {
    mediaAssets = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDocumentIds: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    service = new ListMediaService(mediaAssets);
  });

  it("returns all media assets from the repository", async () => {
    const assetList = [
      new MediaAssetEntity(
        "media-1",
        "photo.png",
        "image/png",
        100,
        800,
        600,
        "https://cdn.example.com/photo.png",
        "https://cdn.example.com/photo.png",
        "photo",
        "hash",
        "user-1",
        new Date(),
        new Date(),
      ),
    ];
    mediaAssets.findAll.mockResolvedValue(assetList);

    const result = await service.execute();

    expect(mediaAssets.findAll).toHaveBeenCalled();
    expect(result).toBe(assetList);
  });
});

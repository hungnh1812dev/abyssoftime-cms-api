import DataLoader from "dataloader";
import { type Request } from "express";
import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { type ApiTokenPayload } from "@/common/types/api-token-payload";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";
import { type MediaAssetEntity } from "@/modules/media/domain/entities/media-asset.entity";
import { type IMediaAssetRepository, MEDIA_ASSET_REPOSITORY } from "@/modules/media/domain/repositories/media-asset.repository";

export interface GraphqlContext {
  apiToken: ApiTokenPayload | null;
  mediaAssetLoader: DataLoader<string, MediaAssetEntity | null>;
}

@Injectable()
export class GraphqlContextFactory {
  constructor(
    @Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository,
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssets: IMediaAssetRepository,
  ) {}

  async createContext(request: Request): Promise<GraphqlContext> {
    const mediaAssetLoader = this.createMediaAssetLoader();

    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      return { apiToken: null, mediaAssetLoader };
    }

    const plaintext = header.slice("Bearer ".length).trim();
    if (plaintext.length === 0) {
      return { apiToken: null, mediaAssetLoader };
    }

    const hash = createHash("sha256").update(plaintext).digest("hex");
    const record = await this.accessTokens.findByTokenHash(hash);
    if (!record) {
      return { apiToken: null, mediaAssetLoader };
    }

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      return { apiToken: null, mediaAssetLoader };
    }

    return {
      apiToken: { documentId: record.documentId, name: record.name, permissions: record.permissions },
      mediaAssetLoader,
    };
  }

  private createMediaAssetLoader(): DataLoader<string, MediaAssetEntity | null> {
    return new DataLoader<string, MediaAssetEntity | null>(async (documentIds) => {
      const found = await this.mediaAssets.findByDocumentIds([...documentIds]);
      const byDocumentId = new Map(found.map((asset) => [asset.documentId, asset]));
      return documentIds.map((documentId) => byDocumentId.get(documentId) ?? null);
    });
  }
}

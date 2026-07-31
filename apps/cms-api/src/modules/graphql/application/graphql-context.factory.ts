import { type Request } from "express";
import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { type ApiTokenPayload } from "@/common/types/api-token-payload";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

export interface GraphqlContext {
  apiToken: ApiTokenPayload | null;
}

@Injectable()
export class GraphqlContextFactory {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {}

  async createContext(request: Request): Promise<GraphqlContext> {
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      return { apiToken: null };
    }

    const plaintext = header.slice("Bearer ".length).trim();
    if (plaintext.length === 0) {
      return { apiToken: null };
    }

    const hash = createHash("sha256").update(plaintext).digest("hex");
    const record = await this.accessTokens.findByTokenHash(hash);
    if (!record) {
      return { apiToken: null };
    }

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      return { apiToken: null };
    }

    return { apiToken: { documentId: record.documentId, name: record.name, permissions: record.permissions } };
  }
}

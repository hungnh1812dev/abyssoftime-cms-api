import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "../../domain/repositories/access-token.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DeleteAccessTokenService {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {}

  async execute(documentId: string): Promise<void> {
    const existing = await this.accessTokens.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`Access token "${documentId}" not found`);
    }

    await this.accessTokens.delete(documentId);
  }
}

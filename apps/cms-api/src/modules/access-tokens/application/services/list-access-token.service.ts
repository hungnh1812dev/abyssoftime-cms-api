import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "../../domain/repositories/access-token.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListAccessTokensService {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {}

  execute(): Promise<AccessTokenEntity[]> {
    return this.accessTokens.findAll();
  }
}

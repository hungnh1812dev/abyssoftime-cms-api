import { AccessTokenEntity } from "../entities/access-token.entity";

export interface CreateAccessTokenData {
  name: string;
  token: string;
  permissions: string[];
  expiresAt: Date | null;
  updatedBy: string | null;
}

export interface UpdateAccessTokenData {
  name?: string;
  token?: string;
  permissions?: string[];
  expiresAt?: Date | null;
  updatedBy: string | null;
}

export interface IAccessTokenRepository {
  findAll(): Promise<AccessTokenEntity[]>;
  findById(documentId: string): Promise<AccessTokenEntity | null>;
  findByTokenHash(hash: string): Promise<AccessTokenEntity | null>;
  create(data: CreateAccessTokenData): Promise<AccessTokenEntity>;
  update(documentId: string, data: UpdateAccessTokenData): Promise<AccessTokenEntity>;
  delete(documentId: string): Promise<void>;
}

export const ACCESS_TOKEN_REPOSITORY = Symbol("ACCESS_TOKEN_REPOSITORY");

import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { CreateAccessTokenData, IAccessTokenRepository, UpdateAccessTokenData } from "../../domain/repositories/access-token.repository";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaAccessTokenRepository implements IAccessTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AccessTokenEntity[]> {
    const accessTokens = await this.prisma.accessToken.findMany();
    return accessTokens.map((accessToken) => this.toEntity(accessToken));
  }

  async findById(documentId: string): Promise<AccessTokenEntity | null> {
    const accessToken = await this.prisma.accessToken.findUnique({ where: { documentId } });
    return accessToken ? this.toEntity(accessToken) : null;
  }

  async findByTokenHash(hash: string): Promise<AccessTokenEntity | null> {
    const accessToken = await this.prisma.accessToken.findUnique({ where: { token: hash } });
    return accessToken ? this.toEntity(accessToken) : null;
  }

  async create(data: CreateAccessTokenData): Promise<AccessTokenEntity> {
    const accessToken = await this.prisma.accessToken.create({
      data: { name: data.name, token: data.token, permissions: data.permissions, expiresAt: data.expiresAt, updatedBy: data.updatedBy },
    });
    return this.toEntity(accessToken);
  }

  async update(documentId: string, data: UpdateAccessTokenData): Promise<AccessTokenEntity> {
    const accessToken = await this.prisma.accessToken.update({
      where: { documentId },
      data: { name: data.name, token: data.token, permissions: data.permissions, expiresAt: data.expiresAt, updatedBy: data.updatedBy },
    });
    return this.toEntity(accessToken);
  }

  async delete(documentId: string): Promise<void> {
    await this.prisma.accessToken.delete({ where: { documentId } });
  }

  private toEntity(accessToken: {
    documentId: string;
    name: string;
    token: string;
    permissions: unknown;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string | null;
  }): AccessTokenEntity {
    return new AccessTokenEntity(
      accessToken.documentId,
      accessToken.name,
      accessToken.token,
      accessToken.permissions as string[],
      accessToken.expiresAt,
      accessToken.createdAt,
      accessToken.updatedAt,
      accessToken.updatedBy,
    );
  }
}

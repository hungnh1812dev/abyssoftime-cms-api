import { PermissionEntity } from "../../domain/entities/permission.entity";
import { CreatePermissionData, IPermissionRepository, PermissionReferenceCount, UpdatePermissionData } from "../../domain/repositories/permission.repository";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionEntity[]> {
    const permissions = await this.prisma.permission.findMany();
    return permissions.map((permission) => this.toEntity(permission));
  }

  async findBySlug(slug: string): Promise<PermissionEntity | null> {
    const permission = await this.prisma.permission.findUnique({ where: { slug } });
    return permission ? this.toEntity(permission) : null;
  }

  async findByIds(documentIds: string[]): Promise<PermissionEntity[]> {
    const permissions = await this.prisma.permission.findMany({ where: { documentId: { in: documentIds } } });
    return permissions.map((permission) => this.toEntity(permission));
  }

  async create(data: CreatePermissionData): Promise<PermissionEntity> {
    const permission = await this.prisma.permission.create({
      data: { slug: data.slug, name: data.name, description: data.description, updatedBy: data.updatedBy },
    });
    return this.toEntity(permission);
  }

  async update(documentId: string, data: UpdatePermissionData): Promise<PermissionEntity> {
    const permission = await this.prisma.permission.update({
      where: { documentId },
      data: { name: data.name, description: data.description, updatedBy: data.updatedBy },
    });

    return this.toEntity(permission);
  }

  async delete(documentId: string): Promise<void> {
    await this.prisma.permission.delete({ where: { documentId } });
  }

  async countReferences(slug: string): Promise<PermissionReferenceCount> {
    const [roleCount] = await Promise.all([this.prisma.role.count({ where: { permissions: { array_contains: [slug] } } })]);

    return { roleCount, accessTokenCount: 0 };
  }

  private toEntity(permission: { documentId: string; slug: string; name: string; description: string; createdAt: Date; updatedAt: Date; updatedBy: string }): PermissionEntity {
    return new PermissionEntity(permission.documentId, permission.slug, permission.name, permission.description, permission.createdAt, permission.updatedAt, permission.updatedBy);
  }
}

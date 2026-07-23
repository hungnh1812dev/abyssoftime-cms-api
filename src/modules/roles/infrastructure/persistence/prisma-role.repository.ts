import { RoleEntity } from "../../domain/entities/role.entiry";
import { CreateRoleData, IRoleRepository, RoleAlreadyExistsError, RoleNotFoundError, UpdateRoleData } from "../../domain/repositories/role.repository";

import { Injectable } from "@nestjs/common";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleEntity[]> {
    const roles = await this.prisma.role.findMany();
    return roles.map((role) => this.toEntity(role));
  }

  async findBySlug(slug: string): Promise<RoleEntity> {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    return role ? this.toEntity(role) : (null as unknown as RoleEntity);
  }

  async findById(documentId: string): Promise<RoleEntity> {
    const role = await this.prisma.role.findUnique({ where: { documentId } });
    return role ? this.toEntity(role) : (null as unknown as RoleEntity);
  }

  async create(data: CreateRoleData): Promise<RoleEntity> {
    try {
      const role = await this.prisma.role.create({
        data: { name: data.name, slug: data.slug, permissions: data.permissions, level: data.level, isDefault: data.isDefault, updatedBy: data.updatedBy },
      });
      return this.toEntity(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new RoleAlreadyExistsError(data.slug);
      }
      throw error;
    }
  }

  async update(documentId: string, data: UpdateRoleData): Promise<RoleEntity> {
    try {
      const role = await this.prisma.role.update({
        where: { documentId },
        data: { name: data.name, permissions: data.permissions, level: data.level, isDefault: data.isDefault },
      });
      return this.toEntity(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new RoleNotFoundError(documentId);
      }
      throw error;
    }
  }

  async delete(documentId: string): Promise<void> {
    try {
      await this.prisma.role.delete({ where: { documentId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new RoleNotFoundError(documentId);
      }
      throw error;
    }
  }

  async hasAny(): Promise<boolean> {
    const count = await this.prisma.role.count();
    return count > 0;
  }

  private toEntity(role: {
    documentId: string;
    name: string;
    slug: string;
    permissions: unknown;
    level: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string | null;
  }): RoleEntity {
    return new RoleEntity(role.documentId, role.name, role.slug, role.permissions as string[], role.level, role.isDefault, role.createdAt, role.updatedAt, role.updatedBy);
  }
}

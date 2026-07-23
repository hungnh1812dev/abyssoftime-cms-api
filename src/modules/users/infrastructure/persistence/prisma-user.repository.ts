import { UserEntity } from "../../domain/entities/user.entity";
import { CreateUserData, IUserRepository, UpdateUserData } from "../../domain/repositories/user.repository";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.toEntity(user));
  }

  async findById(documentId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { documentId } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { username } });
    return user ? this.toEntity(user) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        username: data.username,
        password: data.password,
        accountType: data.accountType,
        verified: data.verified,
        roleId: data.roleId,
      },
    });
    return this.toEntity(user);
  }

  async update(documentId: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { documentId },
      data: {
        email: data.email,
        name: data.name,
        username: data.username,
        password: data.password,
        accountType: data.accountType,
        verified: data.verified,
        roleId: data.roleId,
      },
    });

    return this.toEntity(user);
  }

  async delete(documentId: string): Promise<void> {
    await this.prisma.user.delete({ where: { documentId } });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  private toEntity(user: {
    documentId: string;
    email: string;
    name: string;
    username: string;
    password: string;
    accountType: boolean;
    verified: boolean;
    roleId: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return new UserEntity(user.documentId, user.email, user.name, user.username, user.password, user.accountType, user.verified, user.roleId, user.createdAt, user.updatedAt);
  }
}

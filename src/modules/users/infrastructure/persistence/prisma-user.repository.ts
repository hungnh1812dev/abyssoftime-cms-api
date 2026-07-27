import { UserEntity } from "../../domain/entities/user.entity";
import { type CompleteVerificationRoles, CreateUserData, IUserRepository, UpdateUserData, UserAlreadyExistsError } from "../../domain/repositories/user.repository";

import { Injectable } from "@nestjs/common";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

// Bounded retry for the rare case two `completeVerification` calls race and Postgres aborts one
// of them under Serializable isolation (P2034) — see docs/documents/auth-issues-fix.md #1.
const COMPLETE_VERIFICATION_MAX_ATTEMPTS = 3;

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
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? this.toEntity(user) : null;
  }

  async findByResetTokenHash(resetTokenHash: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({ where: { resetTokenHash } });
    return user ? this.toEntity(user) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          username: data.username,
          password: data.password,
          accountType: data.accountType,
          verified: data.verified,
          roleId: data.roleId,
          otpCodeHash: data.otpCodeHash,
          otpExpiresAt: data.otpExpiresAt,
        },
      });
      return this.toEntity(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = error.meta?.target;
        const violatesUsername = Array.isArray(target) && target.includes("username");
        if (violatesUsername) {
          throw new UserAlreadyExistsError("username", data.username);
        }
        throw new UserAlreadyExistsError("email", data.email);
      }
      throw error;
    }
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
        otpCodeHash: data.otpCodeHash,
        otpExpiresAt: data.otpExpiresAt,
        resetTokenHash: data.resetTokenHash,
        resetTokenExpiresAt: data.resetTokenExpiresAt,
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

  async hasAnyVerified(): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { verified: true } });
    return count > 0;
  }

  async completeVerification(documentId: string, roles: CompleteVerificationRoles): Promise<UserEntity> {
    for (let attempt = 1; attempt <= COMPLETE_VERIFICATION_MAX_ATTEMPTS; attempt++) {
      try {
        const user = await this.prisma.$transaction(
          async (tx) => {
            const verifiedCount = await tx.user.count({ where: { verified: true } });
            const roleId = verifiedCount === 0 ? roles.firstVerifiedRoleId : roles.otherwiseRoleId;
            return tx.user.update({
              where: { documentId },
              data: { verified: true, roleId, otpCodeHash: null, otpExpiresAt: null },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return this.toEntity(user);
      } catch (error) {
        const isWriteConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (!isWriteConflict || attempt === COMPLETE_VERIFICATION_MAX_ATTEMPTS) {
          throw error;
        }
      }
    }
    /* istanbul ignore next -- unreachable: loop always returns or throws */
    throw new Error("completeVerification: unreachable");
  }

  private toEntity(user: {
    documentId: string;
    email: string;
    name: string;
    username: string;
    password: string;
    accountType: boolean;
    verified: boolean;
    roleId: string | null;
    createdAt: Date;
    updatedAt: Date;
    otpCodeHash?: string | null;
    otpExpiresAt?: Date | null;
    resetTokenHash?: string | null;
    resetTokenExpiresAt?: Date | null;
  }): UserEntity {
    return new UserEntity(
      user.documentId,
      user.email,
      user.name,
      user.username,
      user.password,
      user.accountType,
      user.verified,
      user.roleId,
      user.createdAt,
      user.updatedAt,
      user.otpCodeHash ?? null,
      user.otpExpiresAt ?? null,
      user.resetTokenHash ?? null,
      user.resetTokenExpiresAt ?? null,
    );
  }
}

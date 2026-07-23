import { UserEntity } from "../../domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";

import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class UpdateUserService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(documentId: string, dto: UpdateUserDto): Promise<UserEntity> {
    const existing = await this.users.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`User "${documentId}" not found`);
    }

    if (dto.email && dto.email !== existing.email) {
      const existingByEmail = await this.users.findByEmail(dto.email);
      if (existingByEmail) {
        throw new ConflictException(`Email "${dto.email}" is already in use`);
      }
    }

    if (dto.username && dto.username !== existing.username) {
      const existingByUsername = await this.users.findByUsername(dto.username);
      if (existingByUsername) {
        throw new ConflictException(`Username "${dto.username}" is already in use`);
      }
    }

    return this.users.update(documentId, {
      email: dto.email,
      name: dto.name,
      username: dto.username,
      password: dto.password,
      accountType: dto.accountType,
      verified: dto.verified,
      roleId: dto.roleId,
    });
  }
}

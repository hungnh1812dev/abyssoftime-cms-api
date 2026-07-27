import { UserEntity } from "../../domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";

import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";

const MANAGE_USERS_PERMISSION = "user:manager";

@Injectable()
export class UpdateUserService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(documentId: string, dto: UpdateUserDto, caller: AccessTokenPayload): Promise<UserEntity> {
    if (documentId !== caller.sub && !(caller.permissions ?? []).includes(MANAGE_USERS_PERMISSION)) {
      throw new ForbiddenException("Cannot update another user's record without user:manager");
    }

    const existing = await this.users.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`User "${documentId}" not found`);
    }

    return this.users.update(documentId, {
      name: dto.name,
      password: dto.password,
    });
  }
}

import { UserEntity } from "../../domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { CreateUserDto } from "../dto/create-user.dto";

import { ConflictException, Inject, Injectable } from "@nestjs/common";

@Injectable()
export class CreateUserService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    const existingByEmail = await this.users.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }

    const existingByUsername = await this.users.findByUsername(dto.username);
    if (existingByUsername) {
      throw new ConflictException(`Username "${dto.username}" is already in use`);
    }

    return this.users.create({
      email: dto.email,
      name: dto.name,
      username: dto.username,
      password: dto.password,
      accountType: false,
      verified: false,
      roleId: null,
    });
  }
}

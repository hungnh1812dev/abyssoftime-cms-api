import { UserEntity } from "../../domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListUserService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(): Promise<UserEntity[]> {
    return this.users.findAll();
  }
}

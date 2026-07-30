import { Inject, Injectable } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

@Injectable()
export class HasUsersService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(): Promise<boolean> {
    const count = await this.users.count();
    return count > 0;
  }
}

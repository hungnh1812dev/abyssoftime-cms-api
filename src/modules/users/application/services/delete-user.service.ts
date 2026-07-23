import { type IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DeleteUserService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(documentId: string): Promise<void> {
    const existing = await this.users.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`User "${documentId}" not found`);
    }

    await this.users.delete(documentId);
  }
}

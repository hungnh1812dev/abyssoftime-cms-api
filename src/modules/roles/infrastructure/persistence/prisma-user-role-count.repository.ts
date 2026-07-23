import { IUserRoleCountRepository } from "../../domain/repositories/user-role-count.repository";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaUserRoleCountRepository implements IUserRoleCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countByRoleId(roleId: string): Promise<number> {
    return this.prisma.user.count({ where: { roleId } });
  }
}

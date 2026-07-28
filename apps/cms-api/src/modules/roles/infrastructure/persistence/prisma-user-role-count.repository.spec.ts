import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaUserRoleCountRepository } from "./prisma-user-role-count.repository";

describe("PrismaUserRoleCountRepository", () => {
  let repository: PrismaUserRoleCountRepository;
  let prisma: { user: { count: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { count: jest.fn() } };
    repository = new PrismaUserRoleCountRepository(prisma as unknown as PrismaService);
  });

  it("countByRoleId() counts users assigned to the given role", async () => {
    prisma.user.count.mockResolvedValue(3);

    const result = await repository.countByRoleId("role-1");

    expect(prisma.user.count).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
    expect(result).toBe(3);
  });

  it("countByRoleId() returns 0 when no users are assigned", async () => {
    prisma.user.count.mockResolvedValue(0);

    const result = await repository.countByRoleId("role-2");

    expect(result).toBe(0);
  });
});

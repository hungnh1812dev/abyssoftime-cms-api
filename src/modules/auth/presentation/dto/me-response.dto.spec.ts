import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";

import { MeResponseDto } from "./me-response.dto";

describe("MeResponseDto", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const updatedAt = new Date("2026-01-02T00:00:00.000Z");

  const user = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "$2b$10$hashed-password", true, true, "role-1", createdAt, updatedAt);

  it("fromEntities() maps user + role fields and strips password", () => {
    const role = new RoleEntity("role-1", "Editor", "editor", ["document:read", "document:update"], 20, false, createdAt, updatedAt, null);

    const result = MeResponseDto.fromEntities(user, role);

    expect(result).toEqual({
      documentId: "user-1",
      email: "jane@example.com",
      name: "Jane Doe",
      username: "janedoe",
      accountType: true,
      verified: true,
      roleId: "role-1",
      createdAt,
      updatedAt,
      role: {
        documentId: "role-1",
        name: "Editor",
        slug: "editor",
        permissions: ["document:read", "document:update"],
        level: 20,
        isDefault: false,
        createdAt,
        updatedAt,
        updatedBy: null,
      },
    });
    expect(result).not.toHaveProperty("password");
  });

  it("fromEntities() maps role: null through correctly", () => {
    const result = MeResponseDto.fromEntities(user, null);

    expect(result.role).toBeNull();
  });
});

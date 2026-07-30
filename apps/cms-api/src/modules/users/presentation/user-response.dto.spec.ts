import { UserEntity } from "../domain/entities/user.entity";

import { UserResponseDto } from "./user-response.dto";

describe("UserResponseDto", () => {
  it("fromEntity() strips password, otpCodeHash, otpExpiresAt, resetTokenHash, and resetTokenExpiresAt", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const user = new UserEntity(
      "user-1",
      "jane@example.com",
      "Jane Doe",
      "janedoe",
      "$2b$10$hashed-password",
      true,
      true,
      "role-1",
      createdAt,
      updatedAt,
      "hashed-otp",
      new Date("2026-01-01T00:10:00.000Z"),
      "hashed-reset-token",
      new Date("2026-01-01T01:00:00.000Z"),
    );

    const result = UserResponseDto.fromEntity(user);

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
    });
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("otpCodeHash");
    expect(result).not.toHaveProperty("otpExpiresAt");
    expect(result).not.toHaveProperty("resetTokenHash");
    expect(result).not.toHaveProperty("resetTokenExpiresAt");
  });

  it("fromEntity() maps a user with roleId: null through correctly", () => {
    const user = new UserEntity("user-2", "unverified@example.com", "New User", "newuser", "$2b$10$hashed", true, false, null, new Date(), new Date());

    const result = UserResponseDto.fromEntity(user);

    expect(result.roleId).toBeNull();
  });
});

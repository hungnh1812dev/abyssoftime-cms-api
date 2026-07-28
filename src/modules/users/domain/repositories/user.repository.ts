import { UserEntity } from "../entities/user.entity";

export interface CreateUserData {
  email: string;
  name: string;
  username: string;
  password: string;
  accountType: boolean;
  verified: boolean;
  roleId: string | null;
  otpCodeHash?: string | null;
  otpExpiresAt?: Date | null;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  username?: string;
  password?: string;
  accountType?: boolean;
  verified?: boolean;
  roleId?: string | null;
  otpCodeHash?: string | null;
  otpExpiresAt?: Date | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
}

export interface CompleteVerificationRoles {
  /** roleId assigned if this user is the first ever to complete verification */
  firstVerifiedRoleId: string;
  /** roleId assigned to every subsequent verification */
  otherwiseRoleId: string;
}

export interface IUserRepository {
  findAll(): Promise<UserEntity[]>;
  findById(documentId: string): Promise<UserEntity | null>;
  findByIds(documentIds: string[]): Promise<UserEntity[]>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByResetTokenHash(resetTokenHash: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(documentId: string, data: UpdateUserData): Promise<UserEntity>;
  delete(documentId: string): Promise<void>;
  count(): Promise<number>;
  hasAnyVerified(): Promise<boolean>;
  /**
   * Atomically decides whether `documentId` is the first user ever to complete verification and
   * assigns the corresponding role, clearing the OTP fields. Must be atomic with the "is this the
   * first verification" check — see docs/documents/auth-issues-fix.md #1.
   */
  completeVerification(documentId: string, roles: CompleteVerificationRoles): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export class UserAlreadyExistsError extends Error {
  constructor(field: "email" | "username", value: string) {
    super(`User with ${field} "${value}" already exists`);
    this.name = "UserAlreadyExistsError";
  }
}

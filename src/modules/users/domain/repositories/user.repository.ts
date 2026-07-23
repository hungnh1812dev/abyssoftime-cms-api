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
}

export interface IUserRepository {
  findAll(): Promise<UserEntity[]>;
  findById(documentId: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(documentId: string, data: UpdateUserData): Promise<UserEntity>;
  delete(documentId: string): Promise<void>;
  count(): Promise<number>;
  hasAnyVerified(): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

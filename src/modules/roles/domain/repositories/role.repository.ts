import { RoleEntity } from "../entities/role.entiry";

export interface CreateRoleData {
  name: string;
  slug: string;
  permissions: string[];
  level: number;
  isDefault: boolean;
  updatedBy: string;
}

export interface UpdateRoleData {
  name?: string;
  permissions?: string[];
  level?: number;
  isDefault?: boolean;
}

export interface IRoleRepository {
  findAll(): Promise<RoleEntity[]>;
  findBySlug(slug: string): Promise<RoleEntity>;
  findById(documentId: string): Promise<RoleEntity>;
  create(data: CreateRoleData): Promise<RoleEntity>;
  update(documentId: string, data: UpdateRoleData): Promise<RoleEntity>;
  delete(documentId: string): Promise<void>;
  hasAny(): Promise<boolean>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");

export class RoleAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Role with slug "${slug}" already exists`);
    this.name = "RoleAlreadyExistsError";
  }
}

export class RoleNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Role with id "${documentId}" not found`);
    this.name = "RoleNotFoundError";
  }
}

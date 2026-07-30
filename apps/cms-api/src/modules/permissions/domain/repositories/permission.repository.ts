import { PermissionEntity } from "../entities/permission.entity";

export interface CreatePermissionData {
  slug: string;
  name: string;
  description: string;
  updatedBy: string | null;
}

export interface UpdatePermissionData {
  name?: string;
  description?: string;
  updatedBy: string | null;
}

export interface PermissionReferenceCount {
  roleCount: number;
  accessTokenCount: number;
}

export interface IPermissionRepository {
  findAll(): Promise<PermissionEntity[]>;
  findBySlug(slug: string): Promise<PermissionEntity | null>;
  findByIds(documentIds: string[]): Promise<PermissionEntity[]>;
  create(data: CreatePermissionData): Promise<PermissionEntity>;
  update(documentId: string, data: UpdatePermissionData): Promise<PermissionEntity>;
  delete(documentId: string): Promise<void>;
  countReferences(slug: string): Promise<PermissionReferenceCount>;
}

export const PERMISSSION_REPOSITORY = Symbol("PERMISSION_REPOSITORY");

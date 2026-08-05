import { ComponentEntity } from "../entities/component.entity";
import { DocumentVersion } from "../entities/document.entity";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { Prisma } from "@/prisma/application/client";

export interface IComponentRepository {
  findByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<ComponentEntity[]>;
  upsertAll(
    slug: string,
    componentPath: string[],
    documentId: string,
    version: DocumentVersion,
    parentComponentIds: (string | null)[],
    components: ComponentEntity[],
    fields: FieldDefinition[],
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
  deleteByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, tx?: Prisma.TransactionClient): Promise<void>;
}

export const COMPONENT_REPOSITORY = Symbol("COMPONENT_REPOSITORY");

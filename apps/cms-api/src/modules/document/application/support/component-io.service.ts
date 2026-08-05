import { ComponentEntity } from "../../domain/entities/component.entity";
import { DocumentVersion } from "../../domain/entities/document.entity";
import { COMPONENT_REPOSITORY, type IComponentRepository } from "../../domain/repositories/component.repository";
import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { FieldDefinition, isComponentField } from "@/modules/content-type/domain/entities/field-definition";
import { Prisma } from "@/prisma/application/client";

function componentName(field: FieldDefinition): string {
  if (!field.component) {
    throw new Error(`Component field "${field.name}" is missing its component name`);
  }
  return field.component;
}

@Injectable()
export class ComponentIoService {
  constructor(@Inject(COMPONENT_REPOSITORY) private readonly components: IComponentRepository) {}

  async saveComponents(
    slug: string,
    documentId: string,
    version: DocumentVersion,
    fields: FieldDefinition[],
    data: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const field of fields.filter(isComponentField)) {
      await this.saveComponentTree(slug, [componentName(field)], documentId, version, field, [{ parentComponentId: null, rawValue: data[field.name] }], tx);
    }
  }

  private async saveComponentTree(
    slug: string,
    componentPath: string[],
    documentId: string,
    version: DocumentVersion,
    field: FieldDefinition,
    parentEntries: { parentComponentId: string | null; rawValue: unknown }[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const subFields = field.fields ?? [];
    const parentIds: (string | null)[] = [];
    const allEntities: ComponentEntity[] = [];
    const itemsWithEntity: { entity: ComponentEntity; item: Record<string, unknown> }[] = [];

    for (const { parentComponentId, rawValue } of parentEntries) {
      parentIds.push(parentComponentId);
      for (const item of normalizeIncomingItems(field, rawValue)) {
        const entity = new ComponentEntity(randomUUID(), documentId, version, parentComponentId, scalarFieldsOf(subFields, item), {});
        allEntities.push(entity);
        itemsWithEntity.push({ entity, item });
      }
    }

    await this.components.upsertAll(slug, componentPath, documentId, version, parentIds, allEntities, subFields, tx);

    if (itemsWithEntity.length === 0) {
      return;
    }

    for (const nestedField of subFields.filter(isComponentField)) {
      const nestedParentEntries = itemsWithEntity.map(({ entity, item }) => ({
        parentComponentId: entity.componentId,
        rawValue: item[nestedField.name],
      }));
      await this.saveComponentTree(slug, [...componentPath, componentName(nestedField)], documentId, version, nestedField, nestedParentEntries, tx);
    }
  }

  async hydrateComponents(slug: string, documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const field of fields.filter(isComponentField)) {
      result[field.name] = await this.hydrateComponentField(slug, [componentName(field)], documentId, version, field);
    }
    return result;
  }

  private async hydrateComponentField(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, field: FieldDefinition): Promise<unknown> {
    const subFields = field.fields ?? [];
    const rows = await this.components.findByDocument(slug, componentPath, documentId, version, subFields);
    const items = await this.hydrateRows(slug, componentPath, documentId, version, rows, null, subFields);
    return field.repeatable ? items : (items[0] ?? null);
  }

  private async hydrateRows(
    slug: string,
    componentPath: string[],
    documentId: string,
    version: DocumentVersion,
    allRows: ComponentEntity[],
    parentComponentId: string | null,
    subFields: FieldDefinition[],
  ): Promise<Record<string, unknown>[]> {
    const ownRows = allRows.filter((row) => row.parentComponentId === parentComponentId);
    const nestedComponentFields = subFields.filter(isComponentField);

    const nestedRowsByFieldName = new Map<string, ComponentEntity[]>();
    for (const nestedField of nestedComponentFields) {
      const nestedPath = [...componentPath, componentName(nestedField)];
      const nestedRows = await this.components.findByDocument(slug, nestedPath, documentId, version, nestedField.fields ?? []);
      nestedRowsByFieldName.set(nestedField.name, nestedRows);
    }

    return Promise.all(
      ownRows.map(async (row) => {
        const item: Record<string, unknown> = { componentId: row.componentId, ...row.fields };
        for (const nestedField of nestedComponentFields) {
          const nestedPath = [...componentPath, componentName(nestedField)];
          const nestedRows = nestedRowsByFieldName.get(nestedField.name) ?? [];
          const nestedItems = await this.hydrateRows(slug, nestedPath, documentId, version, nestedRows, row.componentId, nestedField.fields ?? []);
          item[nestedField.name] = nestedField.repeatable ? nestedItems : (nestedItems[0] ?? null);
        }
        return item;
      }),
    );
  }

  async deleteComponents(slug: string, documentId: string, version: DocumentVersion, fields: FieldDefinition[], tx?: Prisma.TransactionClient): Promise<void> {
    for (const field of fields.filter(isComponentField)) {
      await this.deleteComponentField(slug, [componentName(field)], documentId, version, field.fields ?? [], tx);
    }
  }

  private async deleteComponentField(
    slug: string,
    componentPath: string[],
    documentId: string,
    version: DocumentVersion,
    subFields: FieldDefinition[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const nestedField of subFields.filter(isComponentField)) {
      await this.deleteComponentField(slug, [...componentPath, componentName(nestedField)], documentId, version, nestedField.fields ?? [], tx);
    }
    await this.components.deleteByDocument(slug, componentPath, documentId, version, tx);
  }
}

function normalizeIncomingItems(field: FieldDefinition, rawValue: unknown): Record<string, unknown>[] {
  if (field.repeatable) {
    return Array.isArray(rawValue) ? (rawValue as Record<string, unknown>[]) : [];
  }
  return rawValue && typeof rawValue === "object" ? [rawValue as Record<string, unknown>] : [];
}

function scalarFieldsOf(subFields: FieldDefinition[], item: Record<string, unknown>): Record<string, unknown> {
  const scalars: Record<string, unknown> = {};
  for (const subField of subFields) {
    if (!isComponentField(subField)) {
      scalars[subField.name] = item[subField.name] ?? null;
    }
  }
  return scalars;
}

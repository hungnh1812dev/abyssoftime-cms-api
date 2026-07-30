import { ContentTypeDefinition, ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { FieldDefinition, isComponentField } from "../../domain/entities/field-definition";
import { CONTENT_TYPE_REPOSITORY, type IContentTypeRepository } from "../../domain/repositories/content-type.repository";
import { type ISchemaTableRepository, SCHEMA_TABLE_REPOSITORY } from "../../domain/repositories/schema-table.repository";
import { SchemaLoaderService } from "../schema/schema-loader.service";
import { validateContentTypeDefinition } from "../schema/schema-validator";

import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";

import { collectComponentPaths, diffColumns, diffComponentTables } from "./schema-differ";

function findFieldsAtComponentPath(fields: FieldDefinition[], path: string[]): FieldDefinition[] {
  let current = fields;
  for (const segment of path) {
    const field = current.find((candidate) => isComponentField(candidate) && candidate.component === segment);
    current = field?.fields ?? [];
  }
  return current;
}

@Injectable()
export class ContentTypeSyncService implements OnApplicationBootstrap {
  constructor(
    private readonly schemaLoader: SchemaLoaderService,
    @Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository,
    @Inject(SCHEMA_TABLE_REPOSITORY) private readonly schemaTables: ISchemaTableRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const definitions = await this.schemaLoader.load();
    await this.sync(definitions);
  }

  async sync(definitions: ContentTypeDefinition[]): Promise<void> {
    const existing = await this.contentTypes.findAll();
    const existingBySlug = new Map(existing.map((contentType) => [contentType.slug, contentType]));
    const desiredSlugs = new Set(definitions.map((definition) => definition.slug));

    for (const definition of definitions) {
      await this.syncOne(definition, existingBySlug.get(definition.slug) ?? null);
    }

    for (const contentType of existing) {
      if (!desiredSlugs.has(contentType.slug)) {
        await this.syncDeletion(contentType);
      }
    }
  }

  private async syncOne(definition: ContentTypeDefinition, previous: ContentTypeEntity | null): Promise<void> {
    validateContentTypeDefinition(definition);

    const listFields = definition.listFields ?? definition.fields.slice(0, 3).map((field) => field.name);
    const previousFields = previous?.fields ?? [];

    if (!previous) {
      await this.schemaTables.ensureDocumentTable(definition.slug, definition.fields, definition.kind);
    } else {
      const liveColumns = await this.schemaTables.listDocumentColumns(definition.slug);
      await this.schemaTables.alterDocumentTable(definition.slug, diffColumns(liveColumns, definition.fields));
    }

    await this.syncComponentTables(definition, previous, previousFields);

    if (!previous) {
      await this.contentTypes.create({
        slug: definition.slug,
        name: definition.name,
        kind: definition.kind,
        draftToPublish: definition.draftToPublish,
        fields: definition.fields,
        listFields,
      });
    } else {
      await this.contentTypes.update(definition.slug, {
        slug: definition.slug,
        name: definition.name,
        kind: definition.kind,
        draftToPublish: definition.draftToPublish,
        fields: definition.fields,
        listFields,
      });
    }
  }

  private async syncComponentTables(definition: ContentTypeDefinition, previous: ContentTypeEntity | null, previousFields: FieldDefinition[]): Promise<void> {
    const plan = diffComponentTables(previousFields, definition.fields);
    const addedKeys = new Set(plan.addPaths.map((path) => path.join("/")));
    const desiredPaths = collectComponentPaths(definition.fields);

    for (const path of desiredPaths) {
      const fieldsAtPath = findFieldsAtComponentPath(definition.fields, path);

      if (!previous || addedKeys.has(path.join("/"))) {
        await this.schemaTables.ensureComponentTable(definition.slug, path, fieldsAtPath);
      } else {
        const liveColumns = await this.schemaTables.listComponentColumns(definition.slug, path);
        await this.schemaTables.alterComponentTable(definition.slug, path, diffColumns(liveColumns, fieldsAtPath));
      }
    }

    for (const path of plan.dropPaths) {
      await this.schemaTables.dropComponentTable(definition.slug, path);
    }
  }

  private async syncDeletion(contentType: ContentTypeEntity): Promise<void> {
    const componentPaths = collectComponentPaths(contentType.fields).sort((a, b) => b.length - a.length);

    for (const path of componentPaths) {
      await this.schemaTables.dropComponentTable(contentType.slug, path);
    }

    await this.schemaTables.dropDocumentTable(contentType.slug);
    await this.contentTypes.delete(contentType.slug);
  }
}

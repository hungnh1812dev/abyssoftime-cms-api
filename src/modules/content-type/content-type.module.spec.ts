import { MODULE_METADATA } from "@nestjs/common/constants";

import { SchemaLoaderService } from "./application/schema/schema-loader.service";
import { GetContentTypeService } from "./application/services/get-content-type.service";
import { ListContentTypeService } from "./application/services/list-content-type.service";
import { ContentTypeSyncService } from "./application/sync/content-type-sync.service";
import { ContentTypeModule } from "./content-type.module";
import { CONTENT_TYPE_REPOSITORY } from "./domain/repositories/content-type.repository";
import { SCHEMA_TABLE_REPOSITORY } from "./domain/repositories/schema-table.repository";
import { PrismaContentTypeRepository } from "./infrastructure/persistence/prisma-content-type.repository";
import { PrismaSchemaTableRepository } from "./infrastructure/persistence/prisma-schema-table.repository";
import { ContentTypeController } from "./presentation/content-type.controller";

describe("ContentTypeModule", () => {
  it("registers the ContentTypeController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ContentTypeModule)).toEqual([ContentTypeController]);
  });

  it("registers every service plus the repository token bindings", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ContentTypeModule) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        SchemaLoaderService,
        ContentTypeSyncService,
        ListContentTypeService,
        GetContentTypeService,
        { provide: CONTENT_TYPE_REPOSITORY, useClass: PrismaContentTypeRepository },
        { provide: SCHEMA_TABLE_REPOSITORY, useClass: PrismaSchemaTableRepository },
      ]),
    );
  });

  it("exports GetContentTypeService and CONTENT_TYPE_REPOSITORY for the document module", () => {
    const exportsMetadata = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ContentTypeModule) as unknown[];

    expect(exportsMetadata).toEqual(expect.arrayContaining([GetContentTypeService, CONTENT_TYPE_REPOSITORY]));
  });
});

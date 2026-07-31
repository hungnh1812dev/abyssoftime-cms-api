import { Module } from "@nestjs/common";

import { SchemaLoaderService } from "./application/schema/schema-loader.service";
import { GetContentTypeService } from "./application/services/get-content-type.service";
import { ListContentTypeService } from "./application/services/list-content-type.service";
import { UpdateListFieldsService } from "./application/services/update-list-fields.service";
import { ContentTypeSyncService } from "./application/sync/content-type-sync.service";
import { CONTENT_TYPE_REPOSITORY } from "./domain/repositories/content-type.repository";
import { SCHEMA_TABLE_REPOSITORY } from "./domain/repositories/schema-table.repository";
import { PrismaContentTypeRepository } from "./infrastructure/persistence/prisma-content-type.repository";
import { PrismaSchemaTableRepository } from "./infrastructure/persistence/prisma-schema-table.repository";
import { ContentTypeController } from "./presentation/content-type.controller";

@Module({
  controllers: [ContentTypeController],
  providers: [
    SchemaLoaderService,
    ContentTypeSyncService,
    ListContentTypeService,
    GetContentTypeService,
    UpdateListFieldsService,
    { provide: CONTENT_TYPE_REPOSITORY, useClass: PrismaContentTypeRepository },
    { provide: SCHEMA_TABLE_REPOSITORY, useClass: PrismaSchemaTableRepository },
  ],
  exports: [GetContentTypeService, CONTENT_TYPE_REPOSITORY, SchemaLoaderService],
})
export class ContentTypeModule {}

import { Module } from "@nestjs/common";

import { ContentTypeModule } from "@/modules/content-type/content-type.module";

import { BulkCreateAndPublishService } from "./application/services/bulk-create-publish.service";
import { BulkDeleteService } from "./application/services/bulk-delete.service";
import { DeleteDocumentService } from "./application/services/delete-document.service";
import { DuplicateDocumentService } from "./application/services/duplicate-document.service";
import { GetDocumentForEditService } from "./application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "./application/services/get-public-document.service";
import { GetPublicSingleTypeService } from "./application/services/get-public-single-type.service";
import { GetSingleTypeService } from "./application/services/get-single-type.service";
import { ListDocumentsService } from "./application/services/list-documents.service";
import { PublishDocumentService } from "./application/services/publish-document.service";
import { PublishSingleTypeService } from "./application/services/publish-single-type.service";
import { SaveDocumentService } from "./application/services/save-document.service";
import { SaveSingleTypeService } from "./application/services/save-single-type.service";
import { UnpublishDocumentService } from "./application/services/unpublish-document.service";
import { UnpublishSingleTypeService } from "./application/services/unpublish-single-type.service";
import { ComponentIoService } from "./application/support/component-io.service";
import { SchemaResolverService } from "./application/support/schema-resolver.service";
import { COMPONENT_REPOSITORY } from "./domain/repositories/component.repository";
import { DOCUMENT_REPOSITORY } from "./domain/repositories/document.repository";
import { PrismaComponentRepository } from "./infrastructure/persistence/prisma-component.repository";
import { PrismaDocumentRepository } from "./infrastructure/persistence/prisma-document.repository";
import { CollectionTypeDocumentController } from "./presentation/collection-type-document.controller";
import { PublicDocumentController } from "./presentation/public-document.controller";
import { SingleTypeDocumentController } from "./presentation/single-type-document.controller";

@Module({
  imports: [ContentTypeModule],
  controllers: [SingleTypeDocumentController, CollectionTypeDocumentController, PublicDocumentController],
  providers: [
    SchemaResolverService,
    ComponentIoService,
    SaveDocumentService,
    PublishDocumentService,
    UnpublishDocumentService,
    GetDocumentForEditService,
    GetPublicDocumentService,
    DeleteDocumentService,
    ListDocumentsService,
    DuplicateDocumentService,
    BulkCreateAndPublishService,
    BulkDeleteService,
    GetSingleTypeService,
    SaveSingleTypeService,
    PublishSingleTypeService,
    UnpublishSingleTypeService,
    GetPublicSingleTypeService,
    { provide: DOCUMENT_REPOSITORY, useClass: PrismaDocumentRepository },
    { provide: COMPONENT_REPOSITORY, useClass: PrismaComponentRepository },
  ],
})
export class DocumentModule {}

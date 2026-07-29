import { MODULE_METADATA } from "@nestjs/common/constants";

import { ContentTypeModule } from "@/modules/content-type/content-type.module";
import { UserModule } from "@/modules/users/user.module";

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
import { DocumentModule } from "./document.module";
import { COMPONENT_REPOSITORY } from "./domain/repositories/component.repository";
import { DOCUMENT_REPOSITORY } from "./domain/repositories/document.repository";
import { PrismaComponentRepository } from "./infrastructure/persistence/prisma-component.repository";
import { PrismaDocumentRepository } from "./infrastructure/persistence/prisma-document.repository";
import { CollectionTypeDocumentController } from "./presentation/collection-type-document.controller";
import { PublicDocumentController } from "./presentation/public-document.controller";
import { SingleTypeDocumentController } from "./presentation/single-type-document.controller";

describe("DocumentModule", () => {
  it("imports ContentTypeModule and UserModule", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, DocumentModule) as unknown[];

    expect(imports).toEqual([ContentTypeModule, UserModule]);
  });

  it("registers all three controllers", () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, DocumentModule) as unknown[];

    expect(controllers).toEqual(expect.arrayContaining([SingleTypeDocumentController, CollectionTypeDocumentController, PublicDocumentController]));
  });

  it("registers every service plus the repository token bindings", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DocumentModule) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it("exports GetPublicDocumentService and GetDocumentForEditService for the graphql module", () => {
    const exportsMetadata = Reflect.getMetadata(MODULE_METADATA.EXPORTS, DocumentModule) as unknown[];

    expect(exportsMetadata).toEqual(expect.arrayContaining([GetPublicDocumentService, GetDocumentForEditService]));
  });
});

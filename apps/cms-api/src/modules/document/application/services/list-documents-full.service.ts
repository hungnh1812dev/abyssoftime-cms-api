import { DOCUMENT_REPOSITORY, type IDocumentRepository, type ListOptions } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertKind } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Inject, Injectable } from "@nestjs/common";

import { FilterNode, ParsedFilter } from "@/modules/document/domain/entities/filter";

export interface FullListOptions {
  start: number;
  size: number;
  orderBy: string;
  sortDir: "asc" | "desc";
  filters: ParsedFilter[];
  // SPEC.md §3.5's `and`/`or`/`not` combinators — additive alongside `filters`, forwarded
  // straight through to `ListOptions.filterTree` (see that type for why it's a separate,
  // ANDed-on-top field rather than a replacement for the flat `filters` array).
  filterTree?: FilterNode;
}

export interface ListDocumentsFullResult {
  items: Record<string, unknown>[];
  total: number;
  start: number;
  size: number;
}

@Injectable()
export class ListDocumentsFullService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
  ) {}

  async execute(slug: string, options: FullListOptions): Promise<ListDocumentsFullResult> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertKind(contentType, "collection");

    const listOptions: ListOptions = { ...options, listFields: [], searchableFields: [] };
    const { rows, total } = await this.documents.listPaginated(slug, "published", listOptions, contentType.fields);

    const items = await Promise.all(
      rows.map(async (row) => ({
        documentId: row.documentId,
        ...row.fields,
        ...(await this.componentIo.hydrateComponents(slug, row.documentId, "published", contentType.fields)),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
      })),
    );

    return { items, total, start: options.start, size: options.size };
  }
}

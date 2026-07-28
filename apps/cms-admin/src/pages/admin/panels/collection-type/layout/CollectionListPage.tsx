import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckboxInput } from '@/components/form/inputs/CheckboxInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useCollectionDocuments, useDeleteCollectionDocument, useDuplicateCollectionDocument, useBulkDeleteCollectionDocuments } from '@/hooks/useCollectionDocuments';
import { useUpdateListFields } from '@/hooks/useContentTypes';
import { useLocales } from '@/hooks/useLocales';
import { getRegistration, type CollectionColumnDef } from '@/content-type-registry';
import { ColumnChooserDialog } from '@/components/collection/ColumnChooserDialog';
import { PageSizeSelector } from '@/components/collection/PageSizeSelector';
import { PAGE_SIZE_OPTIONS } from '@/lib/pageSize';
import { LocaleSelector } from '@/components/locale/LocaleSelector';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { type ContentType, type Document, type FieldDefinition, type Locale } from '@/types/cms';
import { Pencil, Trash2, Copy, ArrowUpDown, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface Props {
  contentType: ContentType;
}

const SYSTEM_FIELD_KEYS = new Set(['createdAt', 'updatedAt', 'updatedByName']);

function deriveColumns(contentType: ContentType): CollectionColumnDef[] {
  const registration = getRegistration(contentType.Slug);
  if (registration?.columns) return registration.columns;

  const listFieldNames = (contentType.listFields ?? []).filter((name) => !SYSTEM_FIELD_KEYS.has(name));
  const fields = contentType.Fields ?? [];
  const fieldMap = new Map<string, FieldDefinition>();
  for (const field of fields) fieldMap.set(field.name, field);

  const names =
    listFieldNames.length > 0
      ? listFieldNames
      : fields
          .filter((field) => field.type !== 'component')
          .slice(0, 3)
          .map((field) => field.name);

  return names.map((name) => {
    const field = fieldMap.get(name);
    const fieldType = field?.type ?? 'text';
    let colType: CollectionColumnDef['type'] = 'text';
    if (fieldType === 'boolean') colType = 'boolean';
    else if (fieldType === 'number') colType = 'number';
    else if (fieldType === 'media') colType = 'image';
    return { key: name, label: name, type: colType };
  });
}

function deriveSystemVisibility(listFields: string[]): { showCreatedAt: boolean; showUpdatedAt: boolean; showUpdatedBy: boolean } {
  if (listFields.length === 0) {
    return { showCreatedAt: true, showUpdatedAt: true, showUpdatedBy: true };
  }
  return {
    showCreatedAt: listFields.includes('createdAt'),
    showUpdatedAt: listFields.includes('updatedAt'),
    showUpdatedBy: listFields.includes('updatedByName'),
  };
}

function cellValue(doc: Document, col: CollectionColumnDef): React.ReactNode {
  const raw = doc.data[col.key];
  switch (col.type) {
    case 'boolean':
      return raw ? '✓' : '—';
    case 'number':
      return String(raw ?? '');
    case 'image':
      return <img src={String(raw ?? '')} alt={col.label} className="h-8 w-8 rounded object-cover" />;
    default:
      return String(raw ?? '');
  }
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

type SortField = string;
type SortDir = 'asc' | 'desc';

function getSortableFieldNames(contentType: ContentType): Set<string> {
  const names = new Set<string>(['id', 'createdAt', 'updatedAt']);
  for (const field of contentType.Fields ?? []) {
    if (field.type === 'text' || field.type === 'number' || field.type === 'boolean') {
      names.add(field.name);
    }
  }
  return names;
}

const DEFAULT_PAGE_SIZE: number = PAGE_SIZE_OPTIONS[0];

function parseListState(params: URLSearchParams, locales: Locale[], sortableFields: Set<string>) {
  const rawOrderBy = params.get('orderBy') ?? '';
  const orderBy: SortField = sortableFields.has(rawOrderBy) ? rawOrderBy : 'id';

  const sortDir: SortDir = params.get('sortDir') === 'asc' ? 'asc' : 'desc';

  const rawPage = Number(params.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLocale = params.get('locale');
  const knownLocale = locales.find((loc) => loc.code === rawLocale);
  const locale = knownLocale?.code ?? locales.find((loc) => loc.isDefault)?.code ?? locales[0]?.code ?? '';

  const rawPageSize = Number(params.get('pageSize'));
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE;

  const search = params.get('search') ?? '';

  return { orderBy, sortDir, page, locale, pageSize, search };
}

type ListState = ReturnType<typeof parseListState>;

function toCanonicalParams(state: ListState, defaultLocaleCode: string): URLSearchParams {
  const params = new URLSearchParams();
  if (state.orderBy !== 'id') params.set('orderBy', state.orderBy);
  if (state.sortDir !== 'desc') params.set('sortDir', state.sortDir);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.locale !== defaultLocaleCode) params.set('locale', state.locale);
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(state.pageSize));
  if (state.search !== '') params.set('search', state.search);
  return params;
}

const SEARCH_DEBOUNCE_MS = 400;

function SortableHeader({
  label,
  field,
  activeField,
  activeDir,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: string;
  activeDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = activeField === field;
  const Icon = isActive ? (activeDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button type="button" className="hover:text-foreground flex items-center gap-1 font-medium" onClick={() => onSort(field)}>
      {label}
      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
    </button>
  );
}

const statusVariant: Record<string, 'draft' | 'published' | 'modified'> = {
  draft: 'draft',
  published: 'published',
  modified: 'modified',
};

export function CollectionListPage({ contentType }: Props) {
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const { data: locales = [] } = useLocales();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortableFields = getSortableFieldNames(contentType);
  const { orderBy, sortDir, page: currentPage, locale: activeLocale, pageSize, search: activeSearch } = parseListState(searchParams, locales, sortableFields);
  const start = (currentPage - 1) * pageSize;
  const defaultLocaleCode = locales.find((loc) => loc.isDefault)?.code ?? locales[0]?.code ?? '';

  function updateListState(patch: Partial<ListState>) {
    const next = { orderBy, sortDir, page: currentPage, locale: activeLocale, pageSize, search: activeSearch, ...patch };
    setSearchParams(toCanonicalParams(next, defaultLocaleCode), { replace: true });
  }

  useEffect(() => {
    if (locales.length === 0) return;
    const canonical = toCanonicalParams({ orderBy, sortDir, page: currentPage, locale: activeLocale, pageSize, search: activeSearch }, defaultLocaleCode);
    if (canonical.toString() !== searchParams.toString()) {
      setSearchParams(canonical, { replace: true });
    }
  }, [searchParams, locales, orderBy, sortDir, currentPage, activeLocale, pageSize, activeSearch, defaultLocaleCode, setSearchParams]);

  // Local draft so keystrokes render immediately — the debounced value is what
  // actually gets written to the URL/query (documented exception to the
  // URL-sole-source-of-truth rule, rules/frontend-data.md §1.5). Resynced from
  // the committed URL value (whether from our own debounced write-back or an
  // external nav) directly in render, not an effect — this is React's
  // documented "adjusting state when a prop changes" pattern; it also covers
  // clearing row selection whenever the effective search actually changes.
  const [searchDraft, setSearchDraft] = useState(activeSearch);
  const [prevActiveSearch, setPrevActiveSearch] = useState(activeSearch);
  if (activeSearch !== prevActiveSearch) {
    setPrevActiveSearch(activeSearch);
    setSearchDraft(activeSearch);
    setSelectedIds(new Set());
  }
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearch === activeSearch) return;
    const canonical = toCanonicalParams({ orderBy, sortDir, page: 1, locale: activeLocale, pageSize, search: debouncedSearch }, defaultLocaleCode);
    setSearchParams(canonical, { replace: true });
  }, [debouncedSearch, activeSearch, orderBy, sortDir, activeLocale, pageSize, defaultLocaleCode, setSearchParams]);

  const queryClient = useQueryClient();
  const { data: page, isLoading } = useCollectionDocuments(contentType.Slug, start, pageSize, activeLocale, orderBy, sortDir, activeSearch);
  const { mutate: deleteDoc } = useDeleteCollectionDocument();
  const { mutate: bulkDeleteDocs } = useBulkDeleteCollectionDocuments();
  const { mutateAsync: duplicateDoc } = useDuplicateCollectionDocument();
  const updateListFields = useUpdateListFields();
  const navigate = useNavigate();

  const hasRegistryOverride = Boolean(getRegistration(contentType.Slug)?.columns);
  const columns = deriveColumns(contentType);
  const hasSearchableColumn = columns.some((column) => column.type === 'text');
  const systemVis = deriveSystemVisibility(contentType.listFields ?? []);
  const docs = page?.items ?? [];
  const total = page?.total ?? 0;

  function handleCreate() {
    navigate(`/admin/content-type/collection-type/${contentType.Slug}/new`);
  }

  function handleDelete(event: React.MouseEvent, doc: Document) {
    event.stopPropagation();
    setDeleteTarget(doc.data.documentId as string);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteDoc({ contentTypeSlug: contentType.Slug, id: deleteTarget });
    setDeleteTarget(null);
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const doc of docs) {
        const documentId = doc.data.documentId as string;
        if (checked) next.add(documentId);
        else next.delete(documentId);
      }
      return next;
    });
  }

  function toggleSelectRow(documentId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(documentId);
      else next.delete(documentId);
      return next;
    });
  }

  function confirmBulkDelete() {
    bulkDeleteDocs(
      { contentTypeSlug: contentType.Slug, documentIds: Array.from(selectedIds) },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
    setBulkDeleteConfirmOpen(false);
  }

  function handleDuplicate(event: React.MouseEvent, doc: Document) {
    event.stopPropagation();
    duplicateDoc({
      contentTypeSlug: contentType.Slug,
      id: doc.data.documentId as string,
      locale: activeLocale,
    }).then((newDoc) => {
      navigate(`/admin/content-type/collection-type/${contentType.Slug}/${newDoc.data.documentId}`);
    });
  }

  function handleEdit(event: React.MouseEvent, doc: Document) {
    event.stopPropagation();
    navigate(`/admin/content-type/collection-type/${contentType.Slug}/${doc.data.documentId}`);
  }

  function handleSort(sortField: SortField) {
    const nextDir: SortDir = orderBy === sortField ? (sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
    updateListState({ orderBy: sortField, sortDir: nextDir, page: 1 });
    setSelectedIds(new Set());
  }

  function handleRowClick(doc: Document) {
    navigate(`/admin/content-type/collection-type/${contentType.Slug}/${doc.data.documentId}`);
  }

  function handleSaveListFields(selectedFields: string[]) {
    updateListFields.mutate(
      { slug: contentType.Slug, listFields: selectedFields },
      {
        onSuccess: () => {
          setColumnChooserOpen(false);
          queryClient.invalidateQueries({ queryKey: ['documents', 'collection-type', contentType.Slug] });
        },
      },
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground p-6">Loading…</p>;
  }

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + pageSize, total);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/admin' },
              { label: 'Content Manager' },
            ]}
          />
          <h1 className="text-xl font-semibold">{contentType.Name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasSearchableColumn && (
            <Input
              type="text"
              placeholder="Search…"
              aria-label="Search"
              className="h-7 w-48"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          )}
          <LocaleSelector
            value={activeLocale}
            onChange={(code) => {
              updateListState({ locale: code, page: 1 });
              setSelectedIds(new Set());
            }}
          />
          <PageSizeSelector
            value={pageSize}
            onChange={(size) => {
              updateListState({ pageSize: size, page: 1 });
              setSelectedIds(new Set());
            }}
          />
          {!hasRegistryOverride && (
            <Button variant="outline" size="icon" aria-label="Configure columns" onClick={() => setColumnChooserOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleCreate}>Add new item</Button>
        </div>
      </div>

      {!hasRegistryOverride && (
        <ColumnChooserDialog
          open={columnChooserOpen}
          onOpenChange={setColumnChooserOpen}
          contentType={contentType}
          currentListFields={contentType.listFields ?? []}
          onSave={handleSaveListFields}
          isSaving={updateListFields.isPending}
        />
      )}

      <Dialog
        open={deleteTarget !== null || bulkDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setBulkDeleteConfirmOpen(false);
          }
        }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{bulkDeleteConfirmOpen ? `Delete ${selectedIds.size} entries` : 'Delete entry'}</DialogTitle>
            <DialogDescription>
              {bulkDeleteConfirmOpen
                ? `Are you sure you want to delete ${selectedIds.size} selected entries? This action cannot be undone.`
                : 'Are you sure you want to delete this entry? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={bulkDeleteConfirmOpen ? confirmBulkDelete : confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedIds.size > 0 && (
        <div className="bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{selectedIds.size} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirmOpen(true)}>
            Delete selected ({selectedIds.size})
          </Button>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-muted-foreground">No entries yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <CheckboxInput
                      aria-label="Select all"
                      checked={docs.length > 0 && docs.every((doc) => selectedIds.has(doc.data.documentId as string))}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    />
                  </TableHead>
                  <TableHead className="w-16">
                    <SortableHeader label="Id" field="id" activeField={orderBy} activeDir={sortDir} onSort={handleSort} />
                  </TableHead>
                  {columns.map((column) =>
                    sortableFields.has(column.key) ? (
                      <TableHead key={column.key}>
                        <SortableHeader label={column.label} field={column.key} activeField={orderBy} activeDir={sortDir} onSort={handleSort} />
                      </TableHead>
                    ) : (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ),
                  )}
                  {systemVis.showCreatedAt && (
                    <TableHead>
                      <SortableHeader label="Created At" field="createdAt" activeField={orderBy} activeDir={sortDir} onSort={handleSort} />
                    </TableHead>
                  )}
                  {systemVis.showUpdatedAt && (
                    <TableHead>
                      <SortableHeader label="Updated At" field="updatedAt" activeField={orderBy} activeDir={sortDir} onSort={handleSort} />
                    </TableHead>
                  )}
                  {systemVis.showUpdatedBy && <TableHead>Updated By</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.data.documentId as string} className="cursor-pointer" onClick={() => handleRowClick(doc)}>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <CheckboxInput
                        aria-label={`Select ${doc.data.documentId}`}
                        checked={selectedIds.has(doc.data.documentId as string)}
                        onCheckedChange={(checked) => toggleSelectRow(doc.data.documentId as string, checked === true)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{String(doc.data.id ?? '')}</TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key}>{cellValue(doc, column)}</TableCell>
                    ))}
                    {systemVis.showCreatedAt && <TableCell className="text-muted-foreground text-sm">{formatDate(doc.data.createdAt)}</TableCell>}
                    {systemVis.showUpdatedAt && <TableCell className="text-muted-foreground text-sm">{formatDate(doc.data.updatedAt)}</TableCell>}
                    {systemVis.showUpdatedBy && <TableCell className="text-muted-foreground text-sm">{String(doc.data.updatedByName ?? '')}</TableCell>}
                    <TableCell>
                      <Badge variant={statusVariant[doc.status] ?? 'draft'}>{doc.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="icon-xs" className="hover:bg-accent-foreground/10" aria-label="Edit" onClick={(event) => handleEdit(event, doc)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="icon-xs" className="hover:bg-accent-foreground/10" aria-label="Duplicate" onClick={(event) => handleDuplicate(event, doc)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="icon-xs" aria-label="Delete" onClick={(event) => handleDelete(event, doc)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              Showing {showingFrom}–{showingTo} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={start === 0}
                onClick={() => {
                  updateListState({ page: Math.max(1, currentPage - 1) });
                  setSelectedIds(new Set());
                }}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={start + pageSize >= total}
                onClick={() => {
                  updateListState({ page: currentPage + 1 });
                  setSelectedIds(new Set());
                }}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

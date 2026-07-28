import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { BreadcrumbItem } from "@/hooks/useBreadcrumbs";
import {
  useCollectionDocument,
  useCreateCollectionDocument,
  usePublishCollectionDocument,
  useUnpublishCollectionDocument,
  useUpdateCollectionDocument,
} from "@/hooks/useCollectionDocuments";
import { usePublishSingleType, useSaveSingleType, useSingleTypeDocument, useUnpublishSingleType } from "@/hooks/useSingleTypeDocuments";
import { api } from "@/lib/api";
import type { Document as CmsDocument, ContentType } from "@/types/cms";
import { stripSystemFields } from "@/types/cms";

import { ContentDetailLayout } from "./ContentDetailLayout";
import { ContentTypeBuilder } from "./ContentTypeBuilder";

function formatAuditDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 1 ? "just now" : `${mins} minutes ago`;
  }
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

interface Props {
  contentType: ContentType;
  id?: string;
  isNew?: boolean;
}

export function ContentTypePanel({ contentType, id, isNew }: Props) {
  const isSingle = contentType.kind === "single";
  const navigate = useNavigate();

  const singleQuery = useSingleTypeDocument(isSingle ? contentType.slug : "");
  const collectionQuery = useCollectionDocument(!isSingle && !isNew ? contentType.slug : "", id ?? "");

  const saveSingle = useSaveSingleType();
  const createCollection = useCreateCollectionDocument();
  const publishSingle = usePublishSingleType();
  const unpublishSingle = useUnpublishSingleType();

  const updateCollection = useUpdateCollectionDocument();
  const publishCollection = usePublishCollectionDocument();
  const unpublishCollection = useUnpublishCollectionDocument();

  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", to: "/admin" }, { label: "Content Manager" }];

  const isLoading = isSingle ? singleQuery.isLoading : !isNew && collectionQuery.isLoading;
  const doc = isSingle ? singleQuery.data : isNew ? undefined : collectionQuery.data;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!doc) {
    const schema = contentType.fields ?? [];
    const handleFirstSave = isNew
      ? async (data: Record<string, unknown>) => {
          const created = await createCollection.mutateAsync({
            contentTypeSlug: contentType.slug,
            data,
          });
          navigate(`/admin/content-type/collection-type/${contentType.slug}/${created.data.documentId}`, { replace: true });
        }
      : async (data: Record<string, unknown>) => {
          await saveSingle.mutateAsync({
            contentTypeSlug: contentType.slug,
            data,
          });
        };

    return (
      <ContentDetailLayout
        title={contentType.name}
        breadcrumbs={breadcrumbs}
        backLink={
          isNew ? (
            <Link to=".." relative="path" className="text-muted-foreground text-sm hover:underline">
              ← Go back
            </Link>
          ) : undefined
        }>
        <ContentTypeBuilder contentTypeSlug={contentType.slug} schema={schema} mutationFn={handleFirstSave} />
      </ContentDetailLayout>
    );
  }

  const mutationFn = isSingle
    ? (data: Record<string, unknown>) =>
        saveSingle.mutateAsync({
          contentTypeSlug: contentType.slug,
          data,
        })
    : (data: Record<string, unknown>) =>
        updateCollection.mutateAsync({
          contentTypeSlug: contentType.slug,
          id: doc.data.documentId,
          data,
        });

  const handlePublish = () => {
    if (isSingle) {
      publishSingle.mutate({ contentTypeSlug: contentType.slug });
    } else {
      publishCollection.mutate({ contentTypeSlug: contentType.slug, id: doc.data.documentId });
    }
  };

  const handleUnpublish = () => {
    if (isSingle) {
      unpublishSingle.mutate({ contentTypeSlug: contentType.slug });
    } else {
      unpublishCollection.mutate({ contentTypeSlug: contentType.slug, id: doc.data.documentId });
    }
  };

  const isPublishing = isSingle ? publishSingle.isPending : publishCollection.isPending;
  const isUnpublishing = isSingle ? unpublishSingle.isPending : unpublishCollection.isPending;

  const canPublish = doc.data.status !== "published";
  const canUnpublish = doc.data.status !== "draft";
  const schema = contentType.fields ?? [];

  const apiBase = isSingle ? `/documents/single-type/${contentType.slug}` : `/documents/collection-type/${contentType.slug}/${doc.data.documentId}`;

  return (
    <ContentDetailLayout
      title={contentType.name}
      status={doc.data.status}
      backLink={
        id ? (
          <Link to=".." relative="path" className="text-muted-foreground text-sm hover:underline">
            ← Go back
          </Link>
        ) : undefined
      }
      metadata={
        doc.data.updatedBy ? (
          <p className="text-muted-foreground text-sm">
            Last updated by <span className="font-bold">{doc.data.updatedBy.name}</span> on {formatAuditDate(doc.data.updatedAt)}
          </p>
        ) : undefined
      }>
      <ContentTypeBuilder
        contentTypeSlug={contentType.slug}
        schema={schema}
        query={{
          queryKey: ["documents", isSingle ? "single-type" : "collection-type", "detail", contentType.slug, doc.data.documentId, "data"],
          queryFn: () => api.get<CmsDocument>(apiBase).then((response) => stripSystemFields(response.data.data)),
        }}
        mutationFn={mutationFn}
        renderActions={({ isDirty: builderIsDirty, submitting }) => (
          <>
            {canPublish && (
              <Button
                type="button"
                variant="success"
                onClick={handlePublish}
                disabled={builderIsDirty || submitting || isPublishing}
                loading={isPublishing}
                loadingText="Publishing...">
                Publish
              </Button>
            )}
            {canUnpublish && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleUnpublish}
                disabled={submitting || isUnpublishing}
                loading={isUnpublishing}
                loadingText="Unpublishing...">
                Unpublish
              </Button>
            )}
          </>
        )}
      />
    </ContentDetailLayout>
  );
}

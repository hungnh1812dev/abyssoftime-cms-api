import { useParams } from "react-router-dom";

import { useContentTypeBySlug } from "@/hooks/useContentTypes";

import { CollectionListPage } from "./collection-type/layout/CollectionListPage";
import { ContentTypePanel } from "./content-type/ContentTypePanel";

export function ContentTypePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: contentType, isLoading } = useContentTypeBySlug(slug || "");

  if (!slug) {
    return <p className="text-muted-foreground">No content type slug provided.</p>;
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!contentType) {
    return <p className="text-muted-foreground">Content type not found.</p>;
  }

  if (contentType.kind === "single") {
    return <ContentTypePanel key={contentType.slug} contentType={contentType} />;
  }

  return <CollectionListPage key={contentType.slug} contentType={contentType} />;
}

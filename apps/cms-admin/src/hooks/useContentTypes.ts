import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ContentType, ContentTypeSummary } from "@/types/cms";

const KEYS = {
  all: ["content-types"] as const,
  bySlug: (slug: string) => ["content-types", "by-slug", slug] as const,
};

export function useContentTypes() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: () => api.get<ContentTypeSummary[]>("/content-types").then((response) => response.data),
  });
}

// There is no fetch-by-id route on this API — content types are only
// addressable by slug.
export function useContentTypeBySlug(slug: string) {
  return useQuery({
    queryKey: KEYS.bySlug(slug),
    queryFn: () => api.get<ContentType>(`/content-types/${slug}`).then((response) => response.data),
    enabled: Boolean(slug),
  });
}

export function useUpdateListFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, listFields }: { slug: string; listFields: string[] }) =>
      api.patch<ContentType>(`/content-types/${slug}/list-fields`, { listFields }).then((response) => response.data),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.bySlug(slug) });
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

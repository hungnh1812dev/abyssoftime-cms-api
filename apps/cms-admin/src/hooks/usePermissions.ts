import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";

import { api } from "@/lib/api";

export interface PermissionItem {
  documentId: string;
  slug: string;
  name: string;
  description: string;
}

const KEYS = {
  all: ["permissions"] as const,
};

export function usePermissions() {
  return useQuery<PermissionItem[]>({
    queryKey: KEYS.all,
    queryFn: () => api.get<PermissionItem[]>("/api/permissions").then((response) => response.data),
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; name: string; description?: string }) => api.post<PermissionItem>("/api/permissions", data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? "Failed to create permission";
      toast.error(message);
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: { name?: string; description?: string } }) =>
      api.put<PermissionItem>(`/api/permissions/${documentId}`, data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? "Failed to update permission";
      toast.error(message);
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/api/permissions/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? "Failed to delete permission";
      toast.error(message);
    },
  });
}

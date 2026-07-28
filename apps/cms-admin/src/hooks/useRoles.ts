import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface RoleItem {
  documentId: string;
  name: string;
  slug: string;
  permissions: string[];
  level: number;
  isDefault: boolean;
}

export interface CreateRoleInput {
  name: string;
  slug: string;
  permissions: string[];
  level: number;
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: string[];
  level?: number;
}

const KEYS = {
  all: ['roles'] as const,
};

export function useRoleList() {
  return useQuery<RoleItem[]>({
    queryKey: KEYS.all,
    queryFn: () => api.get<RoleItem[]>('/api/roles').then((response) => response.data),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleInput) => api.post<RoleItem>('/api/roles', data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? 'Failed to create role';
      toast.error(message);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: UpdateRoleInput }) => api.put<RoleItem>(`/api/roles/${documentId}`, data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? 'Failed to update role';
      toast.error(message);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/api/roles/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (error: unknown) => {
      const message = (error as AxiosError<{ error: string }>).response?.data?.error ?? 'Failed to delete role';
      toast.error(message);
    },
  });
}

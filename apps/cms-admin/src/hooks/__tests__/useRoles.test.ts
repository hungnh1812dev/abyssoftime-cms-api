import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { api } from '@/lib/api';
import { useRoleList, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/useRoles';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const role = { documentId: 'r1', name: 'Editor', slug: 'editor', permissions: ['document:read'], level: 60, isDefault: true };

describe('useRoleList', () => {
  it('returns list of roles from GET /api/roles', async () => {
    mock.onGet('/api/roles').reply(200, [role]);
    const { result } = renderHook(() => useRoleList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([role]);
  });
});

describe('useCreateRole', () => {
  it('sends POST to /api/roles with the tree-driven permissions payload', async () => {
    mock.onPost('/api/roles').reply(201, { ...role, documentId: 'r2', name: 'Custom', slug: 'custom', isDefault: false });
    const { result } = renderHook(() => useCreateRole(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'Custom', slug: 'custom', permissions: ['document:read', 'document:create'], level: 50 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: 'Custom', slug: 'custom', permissions: ['document:read', 'document:create'], level: 50 });
  });
});

describe('useUpdateRole', () => {
  it('sends PUT to /api/roles/{id}', async () => {
    mock.onPut('/api/roles/r1').reply(200, { ...role, permissions: ['document:read', 'media:read'] });
    const { result } = renderHook(() => useUpdateRole(), { wrapper: createWrapper() });

    result.current.mutate({ documentId: 'r1', data: { permissions: ['document:read', 'media:read'] } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ permissions: ['document:read', 'media:read'] });
  });
});

describe('useDeleteRole', () => {
  it('sends DELETE to /api/roles/{id}', async () => {
    mock.onDelete('/api/roles/r1').reply(204);
    const { result } = renderHook(() => useDeleteRole(), { wrapper: createWrapper() });

    result.current.mutate('r1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.delete).toHaveLength(1);
  });
});

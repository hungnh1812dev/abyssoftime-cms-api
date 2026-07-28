import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { api } from '@/lib/api';
import { useBulkDeleteCollectionDocuments, useCollectionDocuments } from '@/hooks/useCollectionDocuments';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: function Wrapper({ children }: { children: ReactNode }) {
      return createElement(QueryClientProvider, { client: queryClient }, children);
    },
  };
}

describe('useBulkDeleteCollectionDocuments', () => {
  it('sends documentIds in the DELETE body and invalidates the list query key on success', async () => {
    mock.onDelete('/api/document-manager/collection-type/articles/bulk').reply(200, { deleted: ['doc-1', 'doc-2'], failed: [] });

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useBulkDeleteCollectionDocuments(), { wrapper: Wrapper });

    result.current.mutate({ contentTypeSlug: 'articles', documentIds: ['doc-1', 'doc-2'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mock.history.delete[0].data).toBe(JSON.stringify({ documentIds: ['doc-1', 'doc-2'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', 'collection-type', 'articles'] });
  });

  it('shows a success toast when every document is deleted', async () => {
    mock.onDelete('/api/document-manager/collection-type/articles/bulk').reply(200, { deleted: ['doc-1'], failed: [] });
    const { toast } = await import('sonner');

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBulkDeleteCollectionDocuments(), { wrapper: Wrapper });

    result.current.mutate({ contentTypeSlug: 'articles', documentIds: ['doc-1'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a partial-failure toast with both counts when some documents fail', async () => {
    mock.onDelete('/api/document-manager/collection-type/articles/bulk').reply(200, {
      deleted: ['doc-1'],
      failed: [{ documentId: 'doc-2', error: 'not found' }],
    });
    const { toast } = await import('sonner');

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBulkDeleteCollectionDocuments(), { wrapper: Wrapper });

    result.current.mutate({ contentTypeSlug: 'articles', documentIds: ['doc-1', 'doc-2'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    const [message] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(message).toContain('1');
  });
});

describe('useCollectionDocuments', () => {
  it('forwards a non-empty search param in the request', async () => {
    mock.onGet('/api/document-manager/collection-type/articles').reply(200, { items: [], total: 0, start: 0, size: 10 });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCollectionDocuments('articles', 0, 10, 'en', 'id', 'desc', 'foo'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mock.history.get[0].params).toMatchObject({ search: 'foo' });
  });

  it('omits the search param from the request when empty', async () => {
    mock.onGet('/api/document-manager/collection-type/articles').reply(200, { items: [], total: 0, start: 0, size: 10 });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCollectionDocuments('articles', 0, 10, 'en', 'id', 'desc'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mock.history.get[0].params?.search).toBeUndefined();
  });
});

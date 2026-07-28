import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { useSearchParams, useNavigationType } from 'react-router-dom';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test-utils';
import { CollectionListPage } from '../CollectionListPage';
import type { ContentType, Document } from '@/types/cms';

function LocationProbe() {
  const [params] = useSearchParams();
  const navType = useNavigationType();
  return <div data-testid="location-probe" data-search={params.toString()} data-nav-type={navType} />;
}

vi.mock('@/content-type-registry', () => ({
  getRegistration: vi.fn().mockReturnValue(undefined),
}));

const ct: ContentType = {
  ID: 'ct-1',
  Name: 'Blog Posts',
  Slug: 'blog-posts',
  Kind: 'collection',
  Fields: [
    { name: 'title', type: 'text' },
    { name: 'active', type: 'boolean' },
    { name: 'views', type: 'number' },
  ],
  CreatedAt: '',
  UpdatedAt: '',
};

const doc1: Document = {
  status: 'draft',
  data: { documentId: 'doc-1', locale: 'en', createdAt: '', updatedAt: '', title: 'First Post', active: true, views: 42 },
};

const doc2: Document = {
  status: 'published',
  data: { documentId: 'doc-2', locale: 'en', createdAt: '', updatedAt: '', title: 'Second Post', active: false, views: 7 },
};

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
  mock.onGet('/api/locales').reply(200, [{ code: 'en', name: 'English', isDefault: true, createdAt: '', updatedAt: '' }]);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe('CollectionListPage — fallback (no registry columns)', () => {
  it('renders a row for each document using the first Data field as display', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByText('Second Post')).toBeInTheDocument();
    });
  });

  it('shows the status for each document', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => {
      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
    });
  });

  it('shows empty state when no documents exist', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [], total: 0, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => expect(screen.getByText(/no entries/i)).toBeInTheDocument());
  });
});

describe('CollectionListPage — registry columns', () => {
  it('renders columns defined in the registry', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'active', label: 'Active', type: 'boolean' },
        { key: 'views', label: 'Views', type: 'number' },
      ],
    });

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Views' })).toBeInTheDocument();
    });
  });

  it('renders boolean column as ✓ when true and — when false', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [{ key: 'active', label: 'Active', type: 'boolean' }],
    });

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders number column as a string value', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [{ key: 'views', label: 'Views', type: 'number' }],
    });

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('renders image column as an img element', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    const imgDoc: Document = { ...doc1, data: { ...doc1.data, cover: 'https://example.com/img.jpg' } };
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [{ key: 'cover', label: 'Cover', type: 'image' }],
    });

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [imgDoc], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    });
  });
});

describe('CollectionListPage — navigation', () => {
  it('Edit icon button is rendered for each document', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts'],
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
  });

  it('Add new item navigates to /new without creating a document', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [], total: 0, start: 0, size: 20 });

    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts'],
    });

    await waitFor(() => screen.getByRole('button', { name: /add/i }));
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mock.history.post).toHaveLength(0);
  });

  it('Delete button shows confirm dialog and calls DELETE', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    mock.onDelete('/api/document-manager/collection-type/blog-posts/doc-1').reply(204);

    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => screen.getByRole('button', { name: /delete/i }));
    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => screen.getByText('Delete entry'));
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mock.history.delete.some((r) => r.url === '/api/document-manager/collection-type/blog-posts/doc-1')).toBe(true));
  });

  it('Delete button does not call DELETE when user cancels confirm', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });

    renderWithProviders(<CollectionListPage contentType={ct} />);

    await waitFor(() => screen.getByRole('button', { name: /delete/i }));
    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => screen.getByText('Delete entry'));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByText('Delete entry')).not.toBeInTheDocument());
    expect(mock.history.delete).toHaveLength(0);
  });

  it('Duplicate button is rendered for each document', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /duplicate/i })).toHaveLength(2);
    });
  });

  it('Duplicate button calls POST duplicate endpoint', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    mock.onPost(/\/blog-posts\/doc-1\/duplicate/).reply(201, {
      data: { documentId: 'new-dup', locale: 'en', title: 'First Post' },
      status: 'draft',
    });

    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts'],
    });

    await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));
    await user.click(screen.getByRole('button', { name: /duplicate/i }));

    await waitFor(() => expect(mock.history.post.some((r) => r.url?.includes('/duplicate'))).toBe(true));
  });
});

describe('CollectionListPage — column chooser', () => {
  it('shows configure columns button when no registry override', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue(undefined);

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /configure columns/i })).toBeInTheDocument();
    });
  });

  it('hides configure columns button when registry override exists', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [{ key: 'title', label: 'Title', type: 'text' }],
    });

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /configure columns/i })).not.toBeInTheDocument();
    });
  });

  it('hides system columns when not in listFields', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue(undefined);

    const ctWithListFields: ContentType = {
      ...ct,
      listFields: ['title'],
    };
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctWithListFields} />);
    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
    });
    expect(screen.queryByText('Created At')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated At')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated By')).not.toBeInTheDocument();
  });

  it('shows system columns when included in listFields', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue(undefined);

    const ctWithListFields: ContentType = {
      ...ct,
      listFields: ['title', 'createdAt', 'updatedByName'],
    };
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctWithListFields} />);
    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
    });
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.queryByText('Updated At')).not.toBeInTheDocument();
    expect(screen.getByText('Updated By')).toBeInTheDocument();
  });
});

describe('CollectionListPage — bulk delete', () => {
  it('does not show the bulk-action bar when nothing is selected', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));
    expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument();
  });

  it('per-row checkbox selects that row and shows the bulk-action bar with count', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select doc-1' }));

    expect(screen.getByRole('button', { name: /delete selected \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select doc-1' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Select doc-2' })).toHaveAttribute('aria-checked', 'false');
  });

  it('header checkbox selects and deselects all loaded rows', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: /delete selected \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select doc-1' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Select doc-2' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument();
  });

  it('confirming bulk delete calls the bulk endpoint with the selected documentIds and clears selection', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    mock.onDelete('/api/document-manager/collection-type/blog-posts/bulk').reply(200, { deleted: ['doc-1', 'doc-2'], failed: [] });

    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: /delete selected \(2\)/i }));

    await waitFor(() => screen.getByText('Delete 2 entries'));
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mock.history.delete.some((r) => r.url === '/api/document-manager/collection-type/blog-posts/bulk')).toBe(true));
    const bulkRequest = mock.history.delete.find((r) => r.url === '/api/document-manager/collection-type/blog-posts/bulk');
    expect(JSON.parse(bulkRequest?.data as string)).toEqual({ documentIds: ['doc-1', 'doc-2'] });

    await waitFor(() => expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument());
  });

  it('cancelling the bulk-delete confirm dialog does not call the bulk endpoint and keeps the selection', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });

    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    await user.click(screen.getByRole('button', { name: /delete selected \(2\)/i }));

    await waitFor(() => screen.getByText('Delete 2 entries'));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByText('Delete 2 entries')).not.toBeInTheDocument());
    expect(mock.history.delete).toHaveLength(0);
    expect(screen.getByRole('button', { name: /delete selected \(2\)/i })).toBeInTheDocument();
  });

  it('clears selection when a sortable column header is clicked', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: /delete selected \(2\)/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^id$/i }));
    expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument();
  });

  it('clears selection when Next/Previous pagination is used', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 40, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: /delete selected \(2\)/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument();
  });

  it('clears selection when the locale changes', async () => {
    const user = userEvent.setup();
    mock.reset();
    mock.onGet('/api/locales').reply(200, [
      { code: 'en', name: 'English', isDefault: true, createdAt: '', updatedAt: '' },
      { code: 'fr', name: 'French', isDefault: false, createdAt: '', updatedAt: '' },
    ]);
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });

    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: /delete selected \(2\)/i })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /locale/i }));
    await user.click(await screen.findByRole('option', { name: 'French' }));

    expect(screen.queryByText(/delete selected/i)).not.toBeInTheDocument();
  });
});

describe('CollectionListPage — URL state (read)', () => {
  it('reads orderBy and sortDir from the URL on initial load', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?orderBy=createdAt&sortDir=asc'],
    });

    await waitFor(() => screen.getByText('First Post'));

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ orderBy: 'createdAt', sortDir: 'asc' });
  });

  it('reads locale and page from the URL on initial load', async () => {
    mock.reset();
    mock.onGet('/api/locales').reply(200, [
      { code: 'en', name: 'English', isDefault: true, createdAt: '', updatedAt: '' },
      { code: 'fr', name: 'French', isDefault: false, createdAt: '', updatedAt: '' },
    ]);
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 25, start: 10, size: 10 });

    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?locale=fr&page=2'],
    });

    await waitFor(() => screen.getByText('French'));
    await waitFor(() => screen.getByText('First Post'));

    const requests = mock.history.get.filter((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(requests.at(-1)?.params).toMatchObject({ locale: 'fr', start: 10 });
  });
});

describe('CollectionListPage — URL state (write)', () => {
  it('replaces (not pushes) history and omits orderBy from the URL when it stays at the default field', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
    );
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('button', { name: /^id$/i }));

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', 'sortDir=asc'));
    expect(screen.getByTestId('location-probe')).toHaveAttribute('data-nav-type', 'REPLACE');
  });

  it('updates locale in the URL and clears page, via replace', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/locales').reply(200, [
      { code: 'en', name: 'English', isDefault: true, createdAt: '', updatedAt: '' },
      { code: 'fr', name: 'French', isDefault: false, createdAt: '', updatedAt: '' },
    ]);
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?page=2'] },
    );
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('combobox', { name: /locale/i }));
    await user.click(await screen.findByRole('option', { name: 'French' }));

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', 'locale=fr'));
    expect(screen.getByTestId('location-probe')).toHaveAttribute('data-nav-type', 'REPLACE');
  });

  it('updates page in the URL via replace when paginating, omitting it when back at page 1', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 40, start: 0, size: 10 });
    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
    );
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', 'page=2'));
    expect(screen.getByTestId('location-probe')).toHaveAttribute('data-nav-type', 'REPLACE');

    await user.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', ''));
  });
});

describe('CollectionListPage — URL state (normalization)', () => {
  it('falls back to defaults for an invalid orderBy/locale/page and rewrites the URL to the canonical state', async () => {
    mock.onGet('/api/locales').reply(200, [
      { code: 'en', name: 'English', isDefault: true, createdAt: '', updatedAt: '' },
      { code: 'fr', name: 'French', isDefault: false, createdAt: '', updatedAt: '' },
    ]);
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });

    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?orderBy=bogus&sortDir=sideways&locale=xx&page=-5'] },
    );

    await waitFor(() => screen.getByText('First Post'));

    const requests = mock.history.get.filter((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(requests.at(-1)?.params).toMatchObject({ orderBy: 'id', sortDir: 'desc', locale: 'en', start: 0 });

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', ''));
  });

  it('strips explicit default-valued params from the URL on load', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });

    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?orderBy=id&sortDir=desc&page=1'] },
    );

    await waitFor(() => screen.getByText('First Post'));
    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', ''));
  });
});

describe('CollectionListPage — page size', () => {
  it('changing the page size selector updates the URL, resets to page 1, and re-queries with the new size', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 40, start: 0, size: 10 });
    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?page=2'] },
    );
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('combobox', { name: /page size/i }));
    await user.click(await screen.findByRole('option', { name: '50' }));

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', 'pageSize=50'));

    const requests = mock.history.get.filter((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(requests.at(-1)?.params).toMatchObject({ size: 50, start: 0 });
  });

  it('reads pageSize from the URL on initial load and requests that page size', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 60, start: 0, size: 50 });
    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?pageSize=50'],
    });

    await waitFor(() => screen.getByText('First Post'));

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ size: 50 });
  });

  it('normalizes an out-of-range pageSize in the URL to the default of 10', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 10 });
    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?pageSize=999'] },
    );

    await waitFor(() => screen.getByText('First Post'));

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ size: 10 });

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', ''));
  });
});

describe('CollectionListPage — search', () => {
  it('reads search from the URL on initial load, hydrates the input, and requests it', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?search=foo'],
    });

    await waitFor(() => screen.getByText('First Post'));

    expect(screen.getByRole('textbox', { name: /search/i })).toHaveValue('foo');

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ search: 'foo' });
  });

  it('typing in the search box updates the URL and re-queries after the debounce delay, resetting to page 1', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 40, start: 0, size: 10 });

    renderWithProviders(
      <>
        <CollectionListPage contentType={ct} />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/content-type/collection-type/blog-posts?page=2'] },
    );
    await waitFor(() => screen.getByText('First Post'));

    await user.type(screen.getByRole('textbox', { name: /search/i }), 'foo');

    await waitFor(() => expect(screen.getByTestId('location-probe')).toHaveAttribute('data-search', 'search=foo'), { timeout: 2000 });

    const requests = mock.history.get.filter((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(requests.at(-1)?.params).toMatchObject({ search: 'foo', start: 0 });
  });

  it('does not render a search box for a content type with no text-type columns', async () => {
    const ctNoText: ContentType = {
      ...ct,
      Fields: [
        { name: 'active', type: 'boolean' },
        { name: 'views', type: 'number' },
      ],
    };
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [], total: 0, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctNoText} />);

    await waitFor(() => expect(screen.getByText(/no entries/i)).toBeInTheDocument());
    expect(screen.queryByRole('textbox', { name: /search/i })).not.toBeInTheDocument();
  });
});

describe('CollectionListPage — sortable fields (schema-driven)', () => {
  it('accepts a primitive content field (number) as orderBy from the URL', async () => {
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?orderBy=views'],
    });

    await waitFor(() => screen.getByText('First Post'));

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ orderBy: 'views' });
  });

  it('falls back to id for a non-primitive field type (richtext), even though it exists on the schema', async () => {
    const ctWithRichtext: ContentType = { ...ct, Fields: [...ct.Fields, { name: 'body', type: 'richtext' }] };
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctWithRichtext} />, {
      initialEntries: ['/admin/content-type/collection-type/blog-posts?orderBy=body'],
    });

    await waitFor(() => screen.getByText('First Post'));

    const request = mock.history.get.find((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
    expect(request?.params).toMatchObject({ orderBy: 'id' });
  });
});

describe('CollectionListPage — column header sortability', () => {
  it('clicking a primitive-type content column header updates orderBy and re-queries', async () => {
    const user = userEvent.setup();
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1, doc2], total: 2, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ct} />);
    await waitFor(() => screen.getByText('First Post'));

    await user.click(screen.getByRole('button', { name: 'views' }));

    await waitFor(() => {
      const requests = mock.history.get.filter((entry) => entry.url === '/api/document-manager/collection-type/blog-posts');
      expect(requests.at(-1)?.params).toMatchObject({ orderBy: 'views' });
    });
  });

  it('a non-primitive-type column (media) renders a plain, non-clickable header', async () => {
    const ctWithMedia: ContentType = {
      ...ct,
      Fields: [...ct.Fields, { name: 'cover', type: 'media' }],
      listFields: ['title', 'cover'],
    };
    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctWithMedia} />);

    await waitFor(() => screen.getByText('First Post'));

    const coverHeader = screen.getByRole('columnheader', { name: 'cover' });
    expect(within(coverHeader).queryByRole('button')).not.toBeInTheDocument();
  });

  it('registry columns follow the schema field type, not the registry column type', async () => {
    const { getRegistration } = await import('@/content-type-registry');
    vi.mocked(getRegistration).mockReturnValue({
      slug: 'blog-posts',
      kind: 'collection',
      columns: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'body', label: 'Body', type: 'text' },
      ],
    });
    const ctWithRichtext: ContentType = { ...ct, Fields: [...ct.Fields, { name: 'body', type: 'richtext' }] };

    mock.onGet('/api/document-manager/collection-type/blog-posts').reply(200, { items: [doc1], total: 1, start: 0, size: 20 });
    renderWithProviders(<CollectionListPage contentType={ctWithRichtext} />);

    await waitFor(() => screen.getByText('First Post'));

    expect(screen.getByRole('button', { name: 'Title' })).toBeInTheDocument();
    const bodyHeader = screen.getByRole('columnheader', { name: 'Body' });
    expect(within(bodyHeader).queryByRole('button')).not.toBeInTheDocument();
  });
});

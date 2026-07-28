import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test-utils';
import { AccessTokensPage } from '../AccessTokensPage';

let mock: MockAdapter;

const emptyTokenList = { items: [], total: 0, page: 1, limit: 20 };
const contentTypesResponse = [{ ID: 'ct-1', Name: 'Blog Posts', Slug: 'blog-posts', Kind: 'collection' }];

beforeEach(() => {
  mock = new MockAdapter(api);
  mock.onGet('/api/access-tokens?page=1&limit=20').reply(200, emptyTokenList);
  mock.onGet('/api/content-types').reply(200, contentTypesResponse);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

async function openCreateDialog() {
  renderWithProviders(<AccessTokensPage />);
  const user = userEvent.setup();
  await waitFor(() => screen.getByText('Create new token'));
  await user.click(screen.getByText('Create new token'));
  return user;
}

describe('AccessTokensPage — permission popup', () => {
  it('renders all 6 Documents action checkboxes using the final vocabulary', async () => {
    await openCreateDialog();
    await waitFor(() => {
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Publish')).toBeInTheDocument();
      expect(screen.getByText('Unpublish')).toBeInTheDocument();
    });
  });

  it('the per-content-type sub-list is visible by default and disappears once Read (all types) is checked', async () => {
    const user = await openCreateDialog();
    await waitFor(() => expect(screen.getByText('Blog Posts')).toBeInTheDocument());

    await user.click(screen.getByText('Read'));
    await waitFor(() => expect(screen.queryByText('Blog Posts')).not.toBeInTheDocument());
  });

  it('Create/Update/Delete/Publish/Unpublish never show a per-type sub-list (only Read does)', async () => {
    const user = await openCreateDialog();
    // Read's own per-type list is visible by default (Read unchecked) — hide it first.
    await waitFor(() => screen.getByText('Read'));
    await user.click(screen.getByText('Read'));
    await waitFor(() => expect(screen.queryByText('Blog Posts')).not.toBeInTheDocument());

    // Checking Create must not independently reveal a per-type list of its own.
    await user.click(screen.getByText('Create'));
    expect(screen.queryByText('Blog Posts')).not.toBeInTheDocument();
  });

  it('checking Read produces the document:read scope', async () => {
    mock.onPost('/api/access-tokens').reply(201, { id: 't1', name: 'My Token', prefix: 'abcdef', scopes: ['document:read'], expiresAt: null, createdAt: '', token: 'plaintext-token' });

    const user = await openCreateDialog();
    await waitFor(() => screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'My Token');
    await user.click(screen.getByText('Read'));
    await user.click(screen.getByText('Create Token'));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.scopes).toEqual(['document:read']);
  });

  it('checking Create produces the document:create scope', async () => {
    mock.onPost('/api/access-tokens').reply(201, { id: 't1', name: 'My Token', prefix: 'abcdef', scopes: ['document:create'], expiresAt: null, createdAt: '', token: 'plaintext-token' });

    const user = await openCreateDialog();
    await waitFor(() => screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'My Token');
    await user.click(screen.getByText('Create'));
    await user.click(screen.getByText('Create Token'));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.scopes).toEqual(['document:create']);
  });

  it('renders Media (media:read) and Content Types (content_types:read) checkboxes under Other', async () => {
    await openCreateDialog();
    await waitFor(() => {
      expect(screen.getByText('Media assets')).toBeInTheDocument();
      expect(screen.getByText('Content type definitions')).toBeInTheDocument();
    });
  });

  it('checking Media produces the media:read scope', async () => {
    mock.onPost('/api/access-tokens').reply(201, { id: 't1', name: 'My Token', prefix: 'abcdef', scopes: ['media:read'], expiresAt: null, createdAt: '', token: 'plaintext-token' });

    const user = await openCreateDialog();
    await waitFor(() => screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'My Token');
    await user.click(screen.getByText('Media assets'));
    await user.click(screen.getByText('Create Token'));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.scopes).toEqual(['media:read']);
  });

  it('checking Content Types produces the content_types:read scope (underscore, not hyphen)', async () => {
    mock.onPost('/api/access-tokens').reply(201, { id: 't1', name: 'My Token', prefix: 'abcdef', scopes: ['content_types:read'], expiresAt: null, createdAt: '', token: 'plaintext-token' });

    const user = await openCreateDialog();
    await waitFor(() => screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'My Token');
    await user.click(screen.getByText('Content type definitions'));
    await user.click(screen.getByText('Create Token'));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const body = JSON.parse(mock.history.post[0].data);
    expect(body.scopes).toEqual(['content_types:read']);
  });

  it('Create button stays disabled until a name is entered and at least one scope is selected', async () => {
    const user = await openCreateDialog();
    await waitFor(() => screen.getByText('Create Token'));

    expect(screen.getByText('Create Token').closest('button')).toBeDisabled();

    await user.type(screen.getByLabelText('Name'), 'My Token');
    expect(screen.getByText('Create Token').closest('button')).toBeDisabled();

    await user.click(screen.getByText('Create'));
    expect(screen.getByText('Create Token').closest('button')).not.toBeDisabled();
  });

  it('renders scope badges in the token list using the final-vocabulary labels', async () => {
    mock.onGet('/api/access-tokens?page=1&limit=20').reply(200, {
      items: [{ id: 't1', name: 'Existing', prefix: 'abcdef', scopes: ['document:read', 'media:read', 'content_types:read'], expiresAt: null, lastUsedAt: null, createdAt: '' }],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderWithProviders(<AccessTokensPage />);

    await waitFor(() => {
      expect(screen.getByText('Read Documents')).toBeInTheDocument();
      expect(screen.getByText('Media')).toBeInTheDocument();
      expect(screen.getByText('Content Types')).toBeInTheDocument();
    });
  });
});

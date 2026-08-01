import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const dataFetchingSection: KnowledgeSection = {
  id: "data-fetching",
  title: "Data Fetching",
  icon: "Database",
  description: "SWR, TanStack Query, GraphQL with Apollo — client-side data fetching patterns and caching strategies.",
  style: {
    iconColor: "text-amber-500",
    headerBg: "bg-amber-500/10 dark:bg-amber-500/[0.08]",
    headerBorder: "border-amber-500/20 dark:border-amber-500/30",
    accentBorder: "border-amber-500/50 dark:border-amber-500/30",
    sidebarBg: "bg-amber-500/10",
    sidebarText: "text-amber-700 dark:text-amber-300",
  },
  items: [
    {
      id: "df-swr",
      title: "SWR: Stale-While-Revalidate",
      summary: "Data fetching hook with automatic caching, request deduplication, and revalidation — developed by Vercel.",
      tags: ["SWR", "useSWR", "SWRConfig", "mutate", "revalidate", "dedupe", "stale-while-revalidate"],
      body: '**SWR** (Stale-While-Revalidate) is a caching strategy: it returns cached data (stale) immediately, then issues a revalidation request in the background and updates the UI once new data is ready.\n\n**Core Hook**: `useSWR(key, fetcher, options)`\n- **key**: A unique identifier for the request — can be a string, array, or null/undefined to disable the query.\n- **fetcher**: An asynchronous function that accepts the key and returns data.\n- **options**: Options like `revalidateOnFocus`, `refreshInterval`, `dedupingInterval`, etc.\n\n**Array Key Pattern**: When passing arguments, use an array key like `["/api/users", id]` — this allows SWR to deduplicate requests correctly. **DO NOT** use dynamic template strings as keys since they are difficult to manage and break query deduplication.\n\n**Returns**: `{ data, error, isLoading, isValidating, mutate }`\n- `isLoading`: No data is available yet (first loading phase).\n- `isValidating`: A request is actively in-flight (initial load or background revalidation).\n\n**Global Config**: Use `<SWRConfig value={{ fetcher, ...defaults }}>` to share fetchers and options globally.',
      subtopics: [
        {
          title: "Deduplication & Caching",
          body: "When multiple components call `useSWR` with the exact same key, SWR dedupes the network requests and triggers only one query. The cache is kept in memory. SWR's `dedupingInterval` option (defaulting to 2,000ms) governs how long requests are deduplicated.",
          codeExample: {
            language: "typescript",
            code: `import useSWR from "swr";

// Global fetcher setup
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ✅ Array key — parameter changes trigger a new fetch; deduplication works correctly
function useUser(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? ["/api/users", id] : null, // null disables the query
    ([url, userId]) => fetcher(\`\${url}/\${userId}\`),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );
  return { user: data, error, isLoading };
}

// ❌ Template string — difficult to deduplicate; avoid using with dynamic parameters
// useSWR(\`/api/users/\${id}\`, fetcher) // works but not recommended for complex params`,
          },
        },
      ],
      codeExample: {
        language: "typescript",
        code: `import useSWR, { SWRConfig, mutate } from "swr";

// App-level config
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: (url: string) => fetch(url).then((r) => r.json()), revalidateOnFocus: false }}>
      {children}
    </SWRConfig>
  );
}

// Custom hook with error handling
function useUserList() {
  const { data, error, isLoading, mutate } = useSWR<User[]>("/api/users");

  return {
    users: data ?? [],
    error,
    isLoading,
    refresh: mutate, // trigger manual revalidation
  };
}

// Optimistic update
async function deleteUser(id: string) {
  // Update local cache immediately
  await mutate("/api/users", (users: User[]) => users.filter((u) => u.id !== id), {
    revalidate: false, // do not revalidate immediately
  });
  // Perform actual API delete
  await fetch(\`/api/users/\${id}\`, { method: "DELETE" });
  // Revalidate to synchronize with the server
  await mutate("/api/users");
}`,
      },
    },
    {
      id: "df-swr-patterns",
      title: "Advanced SWR Patterns",
      summary: "Pagination, infinite scrolls, optimistic UI updates, and conditional fetching with SWR.",
      tags: ["SWR", "pagination", "infinite scroll", "useSWRInfinite", "optimistic UI", "conditional fetching"],
      body: "**Conditional Fetching**: Pass `null` as the key to disable the fetch — useful for private routes or queries that depend on other state inputs.\n\n**`useSWRInfinite`**: Handles pagination and infinite scrolls. It accepts a `getKey(pageIndex, previousData)` callback to compute the key dynamically for each page index.\n\n**Optimistic UI**: Updates local cache immediately before receiving server confirmation. Configure with the `optimisticData` and `rollbackOnError` options.\n\n**Dependent Fetching**: Fetching query B after query A returns data. Use A's output value in B's key; SWR skips evaluation automatically if the key resolves to falsy.",
      codeExample: {
        language: "typescript",
        code: `import useSWR, { useSWRInfinite } from "swr";

// Conditional fetching — only fetch if user session is active
function useProfile() {
  const { data: session } = useSWR("/api/session");
  const userId = session?.userId;

  const { data: profile } = useSWR(
    userId ? ["/api/profile", userId] : null, // null skips the query
    ([url, id]) => fetch(\`\${url}/\${id}\`).then((r) => r.json())
  );
  return profile;
}

// Infinite scroll / pagination
function useInfiniteUsers() {
  const { data, size, setSize, isLoading } = useSWRInfinite(
    (pageIndex, previousData) => {
      if (previousData && !previousData.length) return null; // reached the end
      return \`/api/users?page=\${pageIndex + 1}&limit=20\`;
    },
    (url) => fetch(url).then((r) => r.json()) as Promise<User[]>
  );

  const users = data?.flat() ?? [];
  const isReachingEnd = data?.at(-1)?.length === 0;

  return { users, isLoading, loadMore: () => setSize((s) => s + 1), isReachingEnd };
}

// Optimistic UI
async function toggleLike(postId: string) {
  await mutate(
    ["/api/posts", postId],
    async (post: Post) => ({ ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) }),
    {
      optimisticData: (post: Post) => ({ ...post, liked: !post.liked }), // immediate UI update
      rollbackOnError: true, // revert if server returns an error
    }
  );
}`,
      },
    },
    {
      id: "df-tanstack-query",
      title: "TanStack Query",
      summary: "Asynchronous state management for server data — useQuery, useMutation, queryClient, and cache invalidation.",
      tags: ["tanstack query", "react query", "useQuery", "useMutation", "queryClient", "invalidate", "stale time", "cache"],
      body: "**TanStack Query** (formerly React Query) offers a more full-featured async state management engine compared to SWR: query invalidation, background refetching, retry logic, query dependencies, and superior DevTools.\n\n**Core Concepts**:\n- **Query Key**: A unique array identifying the query — e.g., `['users', id]`, `['users', { page, filter }]`.\n- **Stale Time**: The duration data remains fresh before it is marked as stale and needs revalidation (default: 0).\n- **GC Time** (Garbage Collection): The duration cache remains in memory after losing subscribers (default: 5 minutes).\n\n**Query Invalidation**: Following a mutation, call `queryClient.invalidateQueries({ queryKey: ['users'] })` to mark all queries prefixed with `'users'` as stale, triggering automatic refetches.\n\n**Prefetching**: Invoke `queryClient.prefetchQuery` in a server component or during mouse hover interactions to load data before the component renders.\n\n**SWR vs TanStack Query**: TanStack Query is ideal for complex CRUD architectures (mutations, pagination, dependency graphs, refetching control). SWR is smaller and simpler for straightforward cases.",
      codeExample: {
        language: "typescript",
        code: `import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Setup
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 2 } },
});

// useQuery
function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ["users", filters], // filters change triggers new query
    queryFn: () => fetch(\`/api/users?\${new URLSearchParams(filters as Record<string, string>)}\`).then((r) => r.json()) as Promise<User[]>,
    staleTime: 30_000, // 30 seconds before data is stale
    placeholderData: (previousData) => previousData, // keep old data while fetching
  });
}

// useMutation + invalidation
function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newUser: Omit<User, "id">) =>
      fetch("/api/users", { method: "POST", body: JSON.stringify(newUser), headers: { "Content-Type": "application/json" } }).then((r) => r.json()),

    onSuccess: () => {
      // Invalidate and refetch all queries starting with "users"
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },

    onMutate: async (newUser) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previous = queryClient.getQueryData<User[]>(["users"]);
      queryClient.setQueryData<User[]>(["users"], (old) => [...(old ?? []), { ...newUser, id: "temp" }]);
      return { previous }; // rollback context
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["users"], context?.previous);
    },
  });
}`,
      },
    },
    {
      id: "df-graphql-fundamentals",
      title: "GraphQL Fundamentals",
      summary: "Schemas, queries, mutations, and subscriptions — query exactly what you need.",
      tags: ["graphql", "schema", "query", "mutation", "subscription", "resolver", "fragment", "type system"],
      body: "**GraphQL** is a query language for APIs — the client specifies exactly what fields are required, and the server returns data in that exact shape.\n\n**GraphQL vs REST**:\n- ✅ Prevents over-fetching (retrieving unused fields) and under-fetching (requiring multiple roundtrip API requests).\n- ✅ Strongly typed schema — automatically generate TypeScript types from the schema.\n- ✅ Single HTTP endpoint `/graphql` instead of dozens of REST endpoints.\n- ❌ Caching is more complex than REST (does not support browser-level HTTP caching out of the box).\n- ❌ File uploads are more complex.\n\n**Core Concepts**:\n- **Schema**: Defines types and operations available — `type User { id: ID!, name: String! }`.\n- **Query**: Read operation — equivalent to GET.\n- **Mutation**: Write operation — equivalent to POST/PUT/DELETE.\n- **Subscription**: Real-time bidirectional updates via WebSockets.\n- **Fragment**: Reusable field selectors to reduce query duplication.\n- **Variables**: Parameterize queries instead of hardcoding inputs in the query string.\n\n**N+1 Problem**: Fetching 10 users, then running 10 separate queries to fetch posts for each user (11 total queries). Resolved using a batching library (e.g., DataLoader).",
      codeExample: {
        language: "typescript",
        code: `// GraphQL query with variables and fragment
const USER_FRAGMENT = \`
  fragment UserFields on User {
    id
    name
    email
    avatarUrl
  }
\`;

const GET_USERS = \`
  \${USER_FRAGMENT}
  query GetUsers($filter: UserFilter, $limit: Int = 20) {
    users(filter: $filter, limit: $limit) {
      ...UserFields
      createdAt
    }
  }
\`;

const CREATE_USER = \`
  \${USER_FRAGMENT}
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
\`;

// GraphQL request via standard fetch
async function gqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data;
}

// Usage
const data = await gqlRequest<{ users: User[] }>(GET_USERS, { filter: { role: "admin" }, limit: 10 });`,
      },
    },
    {
      id: "df-apollo-client",
      title: "Apollo Client",
      summary: "Full-featured GraphQL client — normalized cache, useQuery, useMutation, and local state management.",
      tags: ["apollo", "apollo client", "InMemoryCache", "useQuery", "useMutation", "cache", "fragments", "apollo devtools"],
      body: "**Apollo Client** is the most popular GraphQL client for React, integrating a normalized cache, error handling, and React hooks.\n\n**Normalized cache (`InMemoryCache`)**: Every object is stored using a key matching `__typename:id`. When a mutation updates a user, every query actively rendering that user is updated automatically — no manual cache updates or refetches are necessary.\n\n**Cache Policies**: `cache-first` (default), `network-only`, `cache-and-network`, `no-cache`.\n\n**`useQuery`**: Executes a query on component mount. Configure with options: `variables`, `skip`, `pollInterval`, `fetchPolicy`.\n\n**`useMutation`**: Returns `[mutate, { loading, error, data }]`. Allows manual cache updates after mutation completion via the `update` option.\n\n**`useLazyQuery`**: Executes a query programmatically on-demand (e.g. on button click) instead of on component mount.\n\n**Apollo DevTools**: Chrome extension used to inspect cache nodes, track queries, and run operations.",
      codeExample: {
        language: "tsx",
        code: `import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery, useMutation } from "@apollo/client";

// Setup
const client = new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache({
    typePolicies: {
      User: { keyFields: ["id"] }, // normalize by id (default)
      Query: {
        fields: {
          users: { merge: false }, // replace, do not merge arrays
        },
      },
    },
  }),
});

const GET_USERS = gql\`
  query GetUsers {
    users { id name email }
  }
\`;

const DELETE_USER = gql\`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) { id }
  }
\`;

function UserList() {
  const { data, loading, error } = useQuery<{ users: User[] }>(GET_USERS);

  const [deleteUser] = useMutation(DELETE_USER, {
    // Update cache after deletion to avoid refetching
    update(cache, { data: { deleteUser: deleted } }) {
      cache.modify({
        fields: {
          users(existingRefs, { readField }) {
            return existingRefs.filter((ref: Reference) => readField("id", ref) !== deleted.id);
          },
        },
      });
    },
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.users.map((u) => (
        <li key={u.id}>
          {u.name}
          <button onClick={() => deleteUser({ variables: { id: u.id } })}>Delete</button>
        </li>
      ))}
    </ul>
  );
}`,
      },
    },
    {
      id: "df-rest-vs-graphql",
      title: "REST API vs GraphQL",
      summary: "Architectural comparison — resource-based vs query-driven APIs, caching, tooling, and when to choose each.",
      tags: ["REST", "GraphQL", "comparison", "over-fetching", "under-fetching", "HTTP methods", "endpoints", "schema", "single endpoint"],
      body: "**REST (Representational State Transfer)** is the dominant API style for the web. It maps resources to URLs and uses HTTP verbs to express intent.\n\n**REST Characteristics**:\n- Multiple endpoints, each representing a resource: `GET /users`, `POST /orders`, `DELETE /posts/123`.\n- Response shape is fixed and server-defined — clients get whatever the endpoint returns.\n- Leverages HTTP caching (`Cache-Control`, ETags) natively.\n- Stateless: each request carries all needed context.\n\n**GraphQL** is a query language for APIs developed by Facebook (2015).\n\n**GraphQL Characteristics**:\n- Single endpoint (`POST /graphql`) — all operations go through it.\n- Client specifies exactly which fields it needs — no over-fetching.\n- Strongly typed schema (`SDL`) acts as a contract between client and server.\n- Mutations for writes, subscriptions for real-time updates via WebSocket.\n\n**Over-fetching vs Under-fetching**:\n- **Over-fetching** (REST): `GET /users` returns 20 fields but the UI only needs `name` and `email`.\n- **Under-fetching** (REST): Displaying a post with its author and comments requires 3 separate requests. GraphQL resolves all in one query.\n\n**Caching**:\n- REST: HTTP caching works out of the box — CDNs cache `GET` responses by URL.\n- GraphQL: All requests are `POST` → HTTP caching doesn't apply. Requires client-side normalized cache (Apollo `InMemoryCache`) or persisted queries.\n\n**When to choose**:\n- **REST**: Public APIs, simple CRUD, CDN caching needed, diverse clients (mobile, third-party).\n- **GraphQL**: Complex data relationships, multiple client types (web/mobile) with different field needs, rapid UI iteration.",
      subtopics: [
        {
          title: "Feature Comparison Table",
          body: "| Feature | REST | GraphQL |\n|---|---|---|\n| Endpoints | Multiple (`/users`, `/posts`) | Single (`/graphql`) |\n| Response shape | Server-defined (fixed) | Client-defined (flexible) |\n| Over-fetching | Common | Eliminated |\n| Under-fetching | Common (N+1 requests) | Eliminated (nested queries) |\n| HTTP caching | Native (GET + CDN) | Needs persisted queries |\n| Type system | OpenAPI / Swagger (optional) | Schema Definition Language (built-in) |\n| File uploads | Simple (`multipart/form-data`) | Complex (requires Apollo Upload) |\n| Real-time | SSE / WebSocket (manual) | Subscriptions (built-in) |\n| Learning curve | Low | Medium |\n| Tooling | Postman, curl, fetch | GraphQL Playground, Apollo Studio |\n| Best for | Public APIs, simple CRUD | Complex graphs, multi-client apps |",
        },
      ],
      codeExample: {
        language: "typescript",
        code: `// ─── Fetching the same data with REST vs GraphQL ──────────────────

// Scenario: Display a blog post with author name and first 3 comments

// ❌ REST — 3 separate HTTP requests (under-fetching)
const post    = await fetch("/api/posts/42").then((r) => r.json());
const author  = await fetch(\`/api/users/\${post.authorId}\`).then((r) => r.json());
const comments = await fetch("/api/posts/42/comments?limit=3").then((r) => r.json());
// Over-fetching: post response includes 15 fields, UI only needs title + body

// ✅ GraphQL — one request, exactly the fields needed
const QUERY = \`
  query GetPost($id: ID!) {
    post(id: $id) {
      title
      body
      publishedAt
      author {
        name
        avatarUrl
      }
      comments(first: 3) {
        content
        createdAt
        author { name }
      }
    }
  }
\`;

const { data } = await fetch("/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: QUERY, variables: { id: "42" } }),
}).then((r) => r.json());

// data.post = { title, body, publishedAt, author, comments }
// Only the fields requested — nothing more, nothing less

// ─── REST: HTTP caching (works out of the box) ────────────────────
// CDN caches this response by URL for 5 minutes
fetch("/api/posts/42", {
  headers: { "Cache-Control": "max-age=300" },
});

// ─── GraphQL: Persisted query for caching ─────────────────────────
// Pre-register query on server, use hash instead of full query string
fetch("/graphql?operationName=GetPost&extensions=" +
  JSON.stringify({ persistedQuery: { version: 1, sha256Hash: "abc123..." } }),
  { method: "GET" } // now a GET → CDN-cacheable
);`,
      },
    },
    {
      id: "df-comparison",
      title: "SWR vs TanStack Query vs Apollo",
      summary: "Choosing the right data fetching library based on use case, bundle size, and architectural complexity.",
      tags: ["comparison", "SWR", "TanStack Query", "Apollo", "bundle size", "REST", "GraphQL", "cache"],
      body: "| Feature | SWR | TanStack Query | Apollo Client |\n|---|---|---|---|\n| Bundle size | ~4kb | ~13kb | ~33kb |\n| API support | REST, any async | REST, any async | GraphQL-first |\n| Normalized cache | No | No | Yes (`InMemoryCache`) |\n| Mutations | Simple `mutate` | Full `useMutation` | `useMutation` + cache |\n| DevTools | No | Yes (TanStack DevTools) | Yes (Apollo DevTools) |\n| Dependent queries | Yes (null key) | Yes (`enabled` option) | Yes (`skip` option) |\n| Optimistic UI | Yes | Yes | Yes |\n| SSR (Next.js) | `SWRConfig` fallback | Hydration via dehydrate | Next.js plugin |\n\n**Selection Guide**:\n- REST API with simple caching requirements → **SWR** (lightweight, simple).\n- REST API with complex mutations, pagination, or needing DevTools → **TanStack Query**.\n- GraphQL API → **Apollo Client** or **urql** (lighter than Apollo).\n- GraphQL with existing TanStack setup → Using TanStack Query with a GraphQL fetcher works perfectly.",
    },
  ],
};

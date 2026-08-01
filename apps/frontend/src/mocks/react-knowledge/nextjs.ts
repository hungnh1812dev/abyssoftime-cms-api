import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const nextjsSection: KnowledgeSection = {
  id: "nextjs",
  title: "Next.js",
  icon: "Triangle",
  description: "App Router, rendering strategies, data fetching patterns, and framework-level caching.",
  style: {
    iconColor: "text-foreground",
    headerBg: "bg-muted dark:bg-muted/60",
    headerBorder: "border-border",
    accentBorder: "border-border",
    sidebarBg: "bg-accent",
    sidebarText: "text-accent-foreground",
  },
  items: [
    {
      id: "nextjs-app-router",
      title: "App Router vs Pages Router",
      summary: "App Router (Next.js 13+) featuring default Server Components and nested layouts.",
      tags: ["App Router", "Pages Router", "Server Components", "layout"],
      body: "**App Router** (introduced in Next.js 13, stable in 14) is a routing model built on React Server Components:\n- Files in the `app/` directory are **Server Components by default** — they render on the server without sending unnecessary client-side JavaScript.\n- Use the `'use client'` directive at the top of a file to opt-in to Client Component capabilities.\n- **Nested Layouts**: `layout.tsx` wraps nested page structures without re-mounting during transitions.\n- **Co-location**: You can place tests, stylesheets, and custom components directly alongside route files.\n- **Special Route Files**: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts`.\n\n**Pages Router** (legacy router, still supported):\n- All components are Client Components by default.\n- Dynamic data fetching is handled via `getServerSideProps`, `getStaticProps`, and `getStaticPaths`.\n- Relies on custom `_app.tsx` and `_document.tsx` for global layouts and styling.",
      subtopics: [
        {
          title: "Server Components vs Client Components",
          body: "**Server Components**: Run exclusively on the server, can be async, access databases or filesystems directly, and ship zero JS to browsers. They lack access to state, hooks, or client APIs. **Client Components**: Declared with the `'use client'` directive, run on both server (SSR) and client (hydration), and support hooks and browser APIs.\n\nKey boundary rule: Client Components cannot import Server Components directly. However, Server Components can pass other Server Components as the `children` prop into Client Components.",
          codeExample: {
            language: "tsx",
            code: `// ServerPage.tsx — Server Component (default)
async function ServerPage() {
  const data = await db.query("SELECT * FROM posts"); // direct DB access
  return <ClientWrapper>{data.map(p => <PostCard key={p.id} post={p} />)}</ClientWrapper>;
}

// ClientWrapper.tsx — Client Component
"use client";
function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return <div onClick={() => setIsOpen(o => !o)}>{children}</div>;
}`,
          },
        },
      ],
    },
    {
      id: "nextjs-data-fetching",
      title: "Data Fetching",
      summary: "Server Components fetching, Route Handlers, Server Actions, and request caching.",
      tags: ["fetch", "cache", "revalidate", "Server Actions", "Route Handlers"],
      body: "**Server Components**: Fetch data directly in your component using standard `async/await`. Next.js extends the global `fetch` API to offer custom caching.\n\n**Caching Model (Next.js 14)**:\n- `fetch(url)` → Cached by default (Static rendering, equivalent to getStaticProps).\n- `fetch(url, { cache: 'no-store' })` → Bypasses cache (Dynamic rendering, equivalent to getServerSideProps).\n- `fetch(url, { next: { revalidate: 60 } })` → ISR model, revalidating after 60 seconds.\n\n**Server Actions**: Asynchronous functions marked with `'use server'` that execute on the server, callable directly from client-side elements. Ideal for forms and mutations.\n\n**Route Handlers**: Custom API endpoints created in `app/api/route.ts` exporting GET, POST, PUT, DELETE operations.",
      subtopics: [
        {
          title: "React.cache() for request deduplication",
          body: "When multiple Server Components in the same request lifecycle require the same data, wrap the query in `React.cache()` to ensure it only runs once.",
          codeExample: {
            language: "typescript",
            code: `import { cache } from "react";

const getUser = cache(async (id: string) => {
  return await db.users.findById(id); // called once even if multiple components call it
});

// Used in multiple Server Components simultaneously
async function UserName({ id }: { id: string }) {
  const user = await getUser(id); // cached
  return <span>{user.name}</span>;
}

async function UserAvatar({ id }: { id: string }) {
  const user = await getUser(id); // same request context, no duplicate fetch
  return <img src={user.avatar} />;
}`,
          },
        },
        {
          title: "Server Actions",
          body: "Server Actions allow forms and mutations without creating separate REST API endpoints.",
          codeExample: {
            language: "typescript",
            code: `// actions/user.ts
"use server";
import { revalidatePath } from "next/cache";

export async function updateUser(formData: FormData) {
  const name = formData.get("name") as string;
  await db.users.update({ name });
  revalidatePath("/profile"); // invalidate client cache
}

// Component usage
<form action={updateUser}>
  <input name="name" />
  <button type="submit">Save</button>
</form>`,
          },
        },
      ],
    },
    {
      id: "nextjs-rendering",
      title: "Rendering Strategies",
      summary: "SSR, SSG, ISR, and Partial Pre-rendering (PPR).",
      tags: ["SSR", "SSG", "ISR", "PPR", "streaming"],
      body: "**Static Site Generation (SSG)**: HTML pages are generated once at build time. Extremely fast and CDN-friendly. Ideal for public, rarely changing content.\n\n**Server-Side Rendering (SSR)**: HTML is generated dynamically on the server for each request. Great for user-specific dynamic dashboards.\n\n**Incremental Static Regeneration (ISR)**: Combines SSG and SSR — serves static content instantly while regenerating it in the background after `revalidate` seconds.\n\n**Partial Pre-rendering (PPR)** (Experimental): Pre-renders static shells at build time while streaming dynamic sub-segments asynchronously on request. Serves static parts instantly, filling in dynamic slots over a single connection.",
      codeExample: {
        language: "tsx",
        code: `// SSG (default when using standard cached fetch)
async function StaticPage() {
  const data = await fetch("https://api.example.com/data"); // cached
  return <Content data={await data.json()} />;
}

// SSR (force dynamic request rendering)
export const dynamic = "force-dynamic";
async function DynamicPage() {
  const data = await fetch("https://api.example.com/data", { cache: "no-store" });
  return <Content data={await data.json()} />;
}

// ISR (regenerate page cache in the background)
async function ISRPage() {
  const data = await fetch("https://api.example.com/data", {
    next: { revalidate: 3600 }, // regenerate every hour
  });
  return <Content data={await data.json()} />;
}`,
      },
    },
    {
      id: "nextjs-streaming",
      title: "Streaming & Suspense",
      summary: "Streaming HTML in chunks, loading.tsx, and parallel data fetching.",
      tags: ["streaming", "Suspense", "loading.tsx", "parallel fetching"],
      body: "The App Router integrates React Streaming, sending page segments in HTML chunks as they finish rendering on the server rather than waiting for the entire page to compile.\n\n**loading.tsx**: Automatically wraps route paths in a Suspense boundary. Displays loading skeletons instantly during page transitions.\n\n**Parallel data fetching**: Running serial fetches sequentially creates waterfall delays. Use `Promise.all()` to trigger requests concurrently.",
      codeExample: {
        language: "tsx",
        code: `// app/dashboard/loading.tsx — rendered immediately on navigation
export default function Loading() {
  return <DashboardSkeleton />;
}

// app/dashboard/page.tsx
async function Dashboard() {
  // Sequential (waterfall) — AVOLD
  const user = await getUser();
  const posts = await getPosts(user.id); // waits for getUser to complete

  // Parallel — PREFERRED
  const [user2, analytics] = await Promise.all([getUser(), getAnalytics()]);

  return (
    <>
      <UserInfo user={user2} />
      <Suspense fallback={<Skeleton />}>
        <SlowWidget /> {/* Streamed and rendered separately */}
      </Suspense>
    </>
  );
}`,
      },
    },
    {
      id: "nextjs-middleware",
      title: "Middleware & i18n",
      summary: "Middleware routing to intercept requests for auth, i18n, and redirects.",
      tags: ["middleware", "NextResponse", "i18n", "locale"],
      body: "Middleware (`middleware.ts` located at the project root) runs on Edge Runtime prior to routing requests. It can perform URL redirects, path rewrites, headers modification, and basic auth gates.\n\n**i18n**: App Router does not support automatic i18n sub-routing out of the box — you must implement it manually inside Middleware or use libraries like `next-intl`.",
      codeExample: {
        language: "typescript",
        code: `// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // i18n redirect
  const locale = getLocale(request); // custom resolver via Accept-Language headers or cookie
  if (!pathname.startsWith(\`/\${locale}\`)) {
    return NextResponse.redirect(new URL(\`/\${locale}\${pathname}\`, request.url));
  }

  // Auth guard
  const token = request.cookies.get("auth-token");
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};`,
      },
    },
    {
      id: "nextjs-pros-cons",
      title: "Pros & Cons",
      summary: "Advantages and disadvantages of Next.js compared to Vite/CRA and other frameworks.",
      tags: ["pros", "cons", "tradeoffs", "performance", "complexity"],
      body: "**Advantages**:\n- **SEO-friendly**: SSR/SSG compile fully crawlable HTML elements.\n- **Performance optimizations**: Automatic image resizing, optimized font loading, and automatic code-splitting.\n- **Great DX**: Fast Refresh, first-class TypeScript support, and intuitive file-system routing.\n- **Full-stack capabilities**: Native API routes and Server Actions reduce the need for separate backend setups.\n- **Server Components**: Zero JS client bundle overhead for server-side data fetching.\n\n**Disadvantages**:\n- **Complex cache layers**: Caching rules inside Next.js 13-14 can be confusing and have historically changed.\n- **Client/Server boundary confusion**: Mixing Client and Server components can lead to hydration bugs.\n- **Cold starts**: Edge and serverless route functions suffer from cold start latency.\n- **Vendor lock-in**: Certain optimizations are heavily tailored towards Vercel deployment infrastructure.\n- **Bundle footprint**: Overusing `'use client'` results in bloated client bundles.\n- **Debugging hurdles**: Server-side error logs are more difficult to trace than pure client-side stack traces.",
    },
  ],
};

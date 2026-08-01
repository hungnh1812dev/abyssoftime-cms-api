import type { InterviewSection } from "../types";

export const frontendArchSection: InterviewSection = {
  id: "frontend-architecture",
  label: "II-G. Frontend Architecture",
  category: "Technical",
  iconName: "Layers",
  color: "text-indigo-500",
  bgColor: "bg-indigo-500/10",
  questions: [
    {
      id: "QG.1",
      question: "How do you structure a large-scale React project? Feature-based vs layer-based folder structure?",
      tags: ["folder structure", "feature-based", "architecture", "scalability"],
      answer: `**Layer-based:** Group by type — \`components/\`, \`hooks/\`, \`services/\`, \`utils/\`. Simple for small projects, but as the project grows, changing one feature requires edits across many folders.

**Feature-based (also called module-based or vertical slice):** Group by feature/domain — \`features/auth/\`, \`features/profile/\`, each containing its own components, hooks, and tests. Much better for large teams because:
- Feature teams own their folder; conflicts are rare.
- Deleting a feature = deleting one folder.
- Colocation — the code that changes together lives together.

**My approach (as used in this project):** Hybrid:
\`\`\`
src/
  views/           ← Feature components (one folder per page/feature)
  components/      ← Truly shared UI (layout, ui-cms primitives)
  lib/             ← Framework-agnostic utilities
  api/             ← Data fetching layer
\`\`\`

The rule: if something is used by only one feature, it lives inside that feature's folder. Promote to \`components/\` only when genuinely shared by 3+.`,
    },
    {
      id: "QG.2",
      question: "Micro-frontend architecture — what is it, when is it justified, and what are the trade-offs?",
      tags: ["micro-frontend", "architecture", "Module Federation", "trade-offs"],
      answer: `**Micro-frontends:** Split the frontend monolith into independently deployed and developed pieces, each owned by a separate team. Each micro-frontend can use a different framework/version.

**Implementation options:**
- **Build-time integration:** npm packages. Not true micro-frontends — you still deploy together.
- **iframes:** Strong isolation, terrible UX (routing, communication, shared auth).
- **Webpack Module Federation:** Share modules at runtime between separately deployed builds. Best of both worlds but complex.
- **Web Components:** Framework-agnostic, native browser support.

**When justified:**
- Large org (50+ engineers) where teams need to deploy independently.
- Legacy migration: wrap old Angular/jQuery section while writing new feature in React.
- Genuinely separate products sharing a shell.

**Trade-offs:**
- Operational complexity: multiple CI/CD pipelines, versioning contracts.
- Shared dependencies (React) can be duplicated if not federated, bloating bundle.
- UX consistency requires shared design system — another coordination cost.
- Debugging across micro-frontends is harder.

For most companies under 100 engineers, a well-structured monorepo is simpler and faster.`,
    },
    {
      id: "QG.3",
      question: "Design patterns in React — which design patterns do you regularly use?",
      tags: ["design patterns", "compound components", "render props", "custom hooks"],
      answer: `**Patterns I use regularly:**

**1. Compound Components:** Components that share state implicitly via React Context.
\`\`\`jsx
<Select>
  <Select.Trigger />
  <Select.Options>
    <Select.Option value="a" />
  </Select.Options>
</Select>
\`\`\`
Used in shadcn/ui throughout this project.

**2. Custom Hook (Hook Pattern):** Extract stateful logic from components into reusable hooks. \`useDebounce\`, \`useLocalStorage\`, \`useIntervalTimer\` — used extensively.

**3. Controlled vs Uncontrolled:** Forms with React Hook Form — uncontrolled inputs (refs) for performance, but the form state is controlled via RHF.

**4. Container/Presentational:** Separate data-fetching logic (server components, or hooks in "smart" components) from pure display components. The \`views/\` folder holds the smart components; \`components/ui-cms/\` holds presentational primitives.

**5. Provider Pattern:** Wrap subtrees with context providers for theme, locale, auth. Avoid for frequently-updating values.`,
    },
    {
      id: "QG.4",
      question: "How do you share code between projects (monorepo)? What tools have you used?",
      tags: ["monorepo", "Turborepo", "npm workspace", "code sharing"],
      answer: `I've worked with and studied several approaches:

**1. npm/bun workspaces (basic monorepo):** Link local packages using workspace protocol. Good for simple multi-package repos. No build orchestration.

**2. Turborepo:** Adds intelligent build caching and task orchestration on top of workspaces. Tasks that haven't changed (based on file hash) are skipped or restored from cache. Significant time savings in CI.

**3. Nx:** More opinionated, includes code generators, project graph analysis, affected-command running. Better for very large monorepos where you want to only test/build what changed.

**What I've used:** At Gameloft, projects were separate repos but shared a private npm registry for the design system (\`@gameloft/ui\`). In personal projects, bun workspaces. I haven't used Turborepo in production but have studied it and would recommend it for A's app's frontend monorepo.

**Key monorepo benefit for A's app:** Shared component library between web, WebView mini-apps, and admin CMS could live in one \`packages/ui\` — one source of truth for the design system.`,
    },
    {
      id: "QG.5",
      question: "Component library — how would you build and maintain an internal one? What's in a good component library?",
      tags: ["component library", "design system", "Storybook", "API design"],
      answer: `**What's in a good component library:**
- **Primitive components:** Button, Input, Select, Checkbox, Modal — correct ARIA attributes, keyboard navigation, focus management.
- **Composition API:** Components accept \`children\`, \`className\`, forwarded refs — not locked-down black boxes.
- **Theming:** CSS custom properties or a design token system so consumers can brand.
- **Documentation:** Storybook stories for every variant, props table, usage examples.
- **Versioning:** Semantic versioning; breaking changes in major versions with migration guides.

**How to build it:**
1. Start with Radix UI or Headless UI for accessibility primitives (keyboard, ARIA) — don't reinvent.
2. Add visual layer (Tailwind or CSS Modules) on top.
3. Export via a monorepo package (\`packages/ui\`).
4. Storybook for docs + visual regression testing (Chromatic).

**Maintenance:**
- \`peerDependencies\` for React — don't bundle React.
- Publish with tree-shakeable ESM.
- Changelog + deprecation notices before removals.

shadcn/ui (used in this project) follows this model — copy-paste component source into your repo, own the code, customize freely.`,
    },
    {
      id: "QG.6",
      question: "What is SOLID applied to React? Give concrete examples.",
      tags: ["SOLID", "React", "software design", "principles"],
      answer: `**S — Single Responsibility:** Each component does one thing. A \`UserCard\` renders user info; fetching data is in a \`useUser\` hook; formatting is in a utility.

**O — Open/Closed:** Components open for extension via props/children, closed for modification. A \`Button\` accepts \`variant\`, \`size\`, \`asChild\` — customize without editing the component.

**L — Liskov Substitution:** A \`PrimaryButton\` that extends \`Button\` should be usable anywhere \`Button\` is used. In React: components that compose should honor the parent's props contract.

**I — Interface Segregation:** Don't force components to accept props they don't use. Split large prop interfaces into smaller focused ones. A list component shouldn't need auth props.

**D — Dependency Inversion:** Components depend on abstractions, not concretions. Accept a \`fetchUser: (id: string) => Promise<User>\` prop instead of calling the API directly — makes testing trivial.

Most impactful in React: **S** (small, focused components + hooks) and **D** (inject dependencies as props/context rather than importing directly).`,
    },
    {
      id: "QG.7",
      question: "How do you handle internationalisation (i18n) in a Next.js app?",
      tags: ["i18n", "Next.js", "locale", "internationalisation"],
      answer: `**Next.js App Router i18n approach (used in this project):**

Route structure: \`app/[locale]/(main)/page.tsx\` — \`locale\` segment is \`en\` or \`vi\`.

Middleware intercepts requests, detects preferred locale (Accept-Language header or cookie), and redirects: \`/ → /en/\` or \`/vi/\`.

Translation files live in \`locales/en.json\` and \`locales/vi.json\`. A \`useTranslations(locale)\` hook or server-side \`getTranslations\` reads them.

**Popular libraries:**
- **next-intl** — first-class Next.js App Router support, async server component translations.
- **react-i18next** — most mature, works with any router.

**Challenges:**
- Date/number formatting (locale-aware with \`Intl.DateTimeFormat\`, \`Intl.NumberFormat\`).
- RTL layout (Arabic, Hebrew) — needs CSS logical properties (\`margin-inline-start\` vs \`margin-left\`).
- Pluralisation rules differ by language — libraries handle this.
- SEO: alternate \`hreflang\` tags, separate URLs per locale.

In this project, \`vi\` and \`en\` locales are implemented with this structure.`,
    },
    {
      id: "QG.8",
      question: "How do you handle error boundaries and global error handling in React?",
      tags: ["error boundary", "error handling", "React", "Next.js"],
      answer: `**Error Boundaries:** Class components (or \`react-error-boundary\` package for hooks-friendly API) that catch rendering errors in their subtree and display fallback UI instead of crashing the whole app.

\`\`\`jsx
<ErrorBoundary fallback={<ErrorPage />}>
  <RiskyComponent />
</ErrorBoundary>
\`\`\`

**In Next.js App Router:** \`error.tsx\` files act as error boundaries per route segment. \`global-error.tsx\` catches root layout errors.

**Error handling strategy:**
1. **Route-level boundaries** (\`error.tsx\`) — show inline error UI with retry button.
2. **Component-level boundaries** — wrap high-risk sections (third-party widgets, dynamic imports).
3. **Async errors in event handlers** — not caught by error boundaries! Use try/catch + toast notifications.
4. **Logging:** Integrate Sentry/Datadog in the error boundary's \`componentDidCatch\` or Next.js \`instrumentation.ts\` to capture errors with stack traces and user context.

What to show users: human-readable message, a retry action, a way to report the issue. Never expose stack traces in production.`,
    },
  ],
};

export const ssrRenderingSection: InterviewSection = {
  id: "ssr-rendering",
  label: "II-H. SSR / ISR / CSR / Hydration",
  category: "Technical",
  iconName: "Server",
  color: "text-teal-500",
  bgColor: "bg-teal-500/10",
  questions: [
    {
      id: "QH.1",
      question: "SSR vs SSG vs ISR vs CSR — explain each, their trade-offs, and when to choose each.",
      tags: ["SSR", "SSG", "ISR", "CSR", "Next.js", "rendering"],
      answer: `**CSR (Client-Side Rendering):** HTML shell + JS bundle → browser fetches data + renders. Poor SEO, slow FCP, great for auth-gated apps.

**SSG (Static Site Generation):** HTML pre-built at build time. Fastest TTFB (CDN-served), great SEO, but stale until rebuilt. Best for: docs, marketing sites, rarely-changing content.

**SSR (Server-Side Rendering):** HTML rendered per-request on the server. Always fresh, great SEO, but slower TTFB and server load. Best for: user-personalised pages, real-time data.

**ISR (Incremental Static Regeneration):** Static pages rebuilt in the background after a configured interval (or on-demand). Combines SSG speed with reasonable freshness.

| | TTFB | Fresh data | SEO | Server load |
|---|---|---|---|---|
| CSR | Fast | ✓ | Poor | Low |
| SSG | Fastest | ✗ | ✓ | None |
| ISR | Fast | ~Fresh | ✓ | Low |
| SSR | Slower | ✓ | ✓ | High |

**In Next.js App Router:** Server Components are SSR by default. Add \`export const revalidate = 60\` for ISR. \`"use client"\` + \`useEffect\` data fetching = CSR.`,
    },
    {
      id: "QH.2",
      question: "Hydration — what is it and what causes hydration mismatches?",
      tags: ["hydration", "SSR", "mismatch", "React", "Next.js"],
      answer: `**Hydration:** After SSR sends HTML to the browser, React "hydrates" it — attaches event listeners and reconciles the server-rendered HTML with what React would render client-side. If they match, no DOM changes are needed.

**Hydration mismatches (console error: "Hydration failed"):** Occur when the client renders different HTML than the server did. React falls back to a full client-side render.

**Common causes:**
1. **Browser-only APIs in render:** \`window\`, \`localStorage\`, \`navigator\` don't exist on server.
   - Fix: check \`typeof window !== 'undefined'\` or use \`useEffect\`.
2. **Date/time rendering:** Server renders at request time (e.g., UTC); client renders at user's local time.
   - Fix: either format consistently or render the date only on client via \`useEffect\`.
3. **Random IDs/values** generated during render.
4. **User agent-based rendering** (e.g., different UI for mobile/desktop detected by user agent).
5. **Invalid HTML:** \`<div>\` inside \`<p>\`, browser auto-corrects, causing mismatch.

**Fix pattern:** If content must differ between server and client, use \`suppressHydrationWarning\` on the element, or defer the client-specific rendering to a \`useEffect\`.`,
    },
    {
      id: "QH.3",
      question: "React Server Components (RSC) — how are they different from regular Server-Side Rendering?",
      tags: ["React Server Components", "RSC", "SSR", "streaming", "Next.js"],
      answer: `**Traditional SSR:** Renders entire page to HTML on the server, sends it. React then hydrates the whole tree. Client-side JavaScript bundle still includes all component code.

**RSC:** Components can be designated as server-only at the component level (not just the page level). Server Components:
- Run only on the server — never shipped to the client bundle.
- Can directly access databases, file system, secrets (no API layer needed).
- Output is a serialized component tree (React's wire format), not HTML.
- Cannot use browser APIs, event handlers, or state.

**Key benefits:**
- **Zero client JS** for server components — they don't add to bundle size.
- **Streaming:** Server can send parts of the page as they're ready (Progressive HTML delivery).
- **Data colocation:** Fetch data right where it's used, no prop drilling.

**Client components** (\`"use client"\`) still exist for interactivity — they're the "leaves" of the tree with event handlers and state.

In Next.js App Router, all components are server components by default. Add \`"use client"\` only when you need interactivity.`,
    },
    {
      id: "QH.4",
      question: "What is Streaming SSR? How does `Suspense` enable it in Next.js?",
      tags: ["streaming", "Suspense", "SSR", "Next.js", "TTFB"],
      answer: `**Traditional SSR bottleneck:** The server must fully render the entire page before sending any HTML. If one data fetch is slow, the user sees nothing until everything is ready.

**Streaming SSR:** The server sends HTML in chunks as components complete rendering. Users see the shell (header, layout) immediately; content streams in as data resolves.

**How \`<Suspense>\` enables it:**
\`\`\`jsx
export default function Page() {
  return (
    <Shell>          {/* Sent immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowDataComponent />  {/* Streamed when ready */}
      </Suspense>
    </Shell>
  );
}
\`\`\`

The server "holds" the \`<Suspense>\` boundary, sends everything else, then "flushes" the resolved content into an inline script that replaces the fallback — all via a single HTTP response using chunked transfer encoding.

**Benefits:**
- TTFB (Time to First Byte) is essentially instant — shell arrives immediately.
- Users see progressive content loading instead of a blank page.
- Each \`<Suspense>\` boundary is independent — one slow component doesn't block others.`,
    },
    {
      id: "QH.5",
      question: "Next.js caching layers — explain the four layers of caching in Next.js App Router.",
      tags: ["Next.js", "caching", "full route cache", "data cache", "router cache"],
      answer: `Next.js App Router has four distinct caching layers:

**1. Request Memoization:** Within a single render pass, identical \`fetch()\` calls to the same URL return the same cached result. Deduplicates requests across components in the same RSC render.

**2. Data Cache:** The fetch result is stored on the server between requests. Persists across deployments (unless revalidated). Controlled by \`cache: 'force-cache'\`, \`next: { revalidate: 60 }\`, or \`revalidateTag()\`.

**3. Full Route Cache:** Entire rendered pages (HTML + RSC payload) are stored on the server/CDN for static routes. Invalidated on revalidation or new deployment.

**4. Router Cache:** Client-side cache in the browser. Stores prefetched and visited RSC payloads. Prevents server roundtrips when navigating between already-visited pages. Duration: 30s for dynamic routes, 5min for static.

**Revalidation strategies:**
- **Time-based:** \`revalidate = 60\` — refetch after 60 seconds.
- **On-demand:** \`revalidateTag('products')\` / \`revalidatePath('/products')\` — call from a Server Action after a mutation.`,
    },
    {
      id: "QH.6",
      question: "How would you implement authentication in a Next.js App Router app?",
      tags: ["authentication", "Next.js", "middleware", "cookies", "session"],
      answer: `**Recommended approach: cookie-based session with middleware protection.**

**Flow:**
1. User submits credentials → Server Action or API Route validates.
2. On success: create a signed session token (JWT or opaque), set as \`httpOnly; Secure; SameSite=Lax\` cookie.
3. Next.js \`middleware.ts\` runs on every request before routing — reads the cookie, verifies the token, redirects to \`/login\` if invalid.

\`\`\`ts
// middleware.ts
export function middleware(req: NextRequest) {
  const token = req.cookies.get('session');
  if (!token && isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
\`\`\`

**Libraries:** Auth.js (formerly NextAuth) handles the session lifecycle, OAuth providers, and token rotation out of the box.

**This project's approach (rules/auth.md):** Proxy session with a passcode, checked in middleware. \`PROTECTED_PATHS\` config determines which routes require auth. Cookie is set server-side after passcode verification.

**Security considerations:** \`httpOnly\` prevents XSS from reading the cookie; \`SameSite=Lax\` prevents CSRF; short expiry + refresh rotation; CSRF token for mutation routes.`,
    },
    {
      id: "QH.7",
      question: "What are Server Actions in Next.js? When would you use them over API Routes?",
      tags: ["Server Actions", "API Routes", "Next.js", "mutations", "forms"],
      answer: `**Server Actions:** Async functions that run on the server, called directly from Client Components or forms. No separate API endpoint — the framework handles the network layer.

\`\`\`ts
// actions.ts
'use server';
export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  await db.user.update({ where: { id: session.userId }, data: { name } });
  revalidatePath('/profile');
}

// In a Client Component:
<form action={updateProfile}>
  <input name="name" />
  <button type="submit">Save</button>
</form>
\`\`\`

**When to use Server Actions:**
- Form submissions and mutations that need server-side validation.
- Mutations that need to revalidate the cache after (\`revalidatePath\`, \`revalidateTag\`).
- Simple CRUD — no need to define a separate API endpoint.

**When to prefer API Routes:**
- Need the endpoint consumed by external clients (mobile app, third-party service).
- Need fine-grained HTTP method control (GET/POST/PUT/DELETE with proper status codes).
- Long-running operations — Server Actions have a timeout.
- When you want a stable, versioned public API.`,
    },
  ],
};

export const toolingSection: InterviewSection = {
  id: "tooling",
  label: "II-I. Build Tools & Tooling",
  category: "Technical",
  iconName: "Wrench",
  color: "text-stone-500",
  bgColor: "bg-stone-500/10",
  questions: [
    {
      id: "QI.1",
      question: "Webpack vs Vite vs Turbopack — explain the key differences. Why is Vite so much faster in development?",
      tags: ["Webpack", "Vite", "Turbopack", "bundler", "ESM", "HMR"],
      answer: `**Webpack:** Module bundler that processes the entire dependency graph at startup. Bundles everything even in development. Powerful but slow for large projects.

**Vite:** Uses **native ES modules** in development — no bundling! The browser imports modules directly via \`import\`. Vite serves files on-demand (only the module the browser requests). HMR replaces only the changed module, not an entire bundle chunk.

Why Vite is faster:
1. **No bundle step on startup** — starts in milliseconds regardless of project size.
2. **On-demand transformation** — only processes files when requested.
3. **ESM HMR** — module boundary is fine-grained, HMR updates are near-instant.

For production, Vite uses Rollup (full bundling for optimization).

**Turbopack:** Rust-based bundler from Vercel, designed as Webpack's successor. Powers Next.js \`--turbopack\` flag. Faster than Webpack but still maturing. Uses incremental computation (only reprocesses changed modules).

**In this project:** Next.js 16 + Turbopack (\`bun run dev --turbopack\`).`,
    },
    {
      id: "QI.2",
      question: "TypeScript — `strict` mode flags. What do `unknown` vs `any` vs `never` represent?",
      tags: ["TypeScript", "strict mode", "unknown", "any", "never"],
      answer: `**\`strict\` mode** enables: \`strictNullChecks\`, \`noImplicitAny\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`alwaysStrict\`.

**\`any\`:** Opts out of type checking entirely. Assignable to and from anything. Disables TypeScript's value. Never use in strict projects.

**\`unknown\`:** The type-safe alternative to \`any\`. Can hold any value, but you must narrow the type before using it. Forces defensive programming:
\`\`\`ts
function parse(data: unknown) {
  if (typeof data === 'string') return data.toUpperCase(); // safe
  // data.toUpperCase(); // TS error — must narrow first
}
\`\`\`

**\`never\`:** Represents values that never exist — the bottom type. A function that throws always has return type \`never\`. Exhaustive switch statements use it:
\`\`\`ts
function assertNever(x: never): never { throw new Error('Unexpected: ' + x); }
// TS errors if a switch is missing a case
\`\`\`

Rule in this project: no \`any\` — use \`unknown\` for genuinely unknown inputs and narrow explicitly.`,
    },
    {
      id: "QI.3",
      question: "ESLint + Prettier — how do you configure them together? What rules do you enforce?",
      tags: ["ESLint", "Prettier", "linting", "code quality"],
      answer: `**ESLint vs Prettier separation:**
- **ESLint** — code quality rules (unused variables, no-console, import order, accessibility).
- **Prettier** — code formatting (indentation, quotes, trailing commas, line length).

Use \`eslint-config-prettier\` to disable ESLint formatting rules that conflict with Prettier. Never try to configure formatting through ESLint.

**Typical config stack for Next.js + TypeScript:**
\`\`\`
eslint-config-next                 (Next.js rules + React rules)
@typescript-eslint/recommended     (TS-specific rules)
eslint-plugin-jsx-a11y             (accessibility)
eslint-config-prettier             (disable formatting conflicts)
\`\`\`

**Rules I always enforce:**
- \`@typescript-eslint/no-explicit-any\` — error
- \`no-unused-vars\` (TS version) — error
- \`react-hooks/rules-of-hooks\` — error
- \`react-hooks/exhaustive-deps\` — warn

**Automation:** Prettier runs via PostToolUse hook (in this project) and \`lint-staged\` pre-commit to format only staged files. ESLint runs in CI (\`bun run lint\` blocks merges on error).`,
    },
    {
      id: "QI.4",
      question: "Git workflow — how do you structure branches and commits in a team? Conventional Commits?",
      tags: ["Git", "branching", "Conventional Commits", "workflow"],
      answer: `**Branch strategy (GitHub Flow, simpler alternative to Git Flow):**
- \`main\` / \`develop\` — protected, always deployable.
- \`feature/feature-name\` — branch from develop, PR back to develop.
- \`fix/bug-description\` — same pattern for bug fixes.
- \`release/v1.2.0\` — release prep if needed.

**Conventional Commits:** Structured commit message format:
\`\`\`
<type>(scope): <description>

Types: feat, fix, docs, style, refactor, test, chore
Example: feat(auth): add OAuth Google login
         fix(carousel): prevent autoplay timer leak on unmount
\`\`\`

**Benefits:**
- Machine-readable — \`semantic-release\` auto-generates CHANGELOG and bumps version.
- Clear history — \`git log --oneline\` is scannable.
- Enforced via \`commitlint\` + Husky pre-commit hook.

**PR discipline:**
- Small PRs (< 400 lines changed) — easier to review.
- One concern per PR.
- Draft PRs for WIP / early feedback.
- Squash merge to keep main history clean.`,
    },
    {
      id: "QI.5",
      question: "Docker basics — how would you containerise a Next.js app?",
      tags: ["Docker", "containerisation", "Next.js", "deployment"],
      answer: `**Dockerfile for Next.js (multi-stage build):**
\`\`\`dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

Key points:
- **Multi-stage build** — final image contains only production artifacts, not devDependencies or build tools.
- **\`output: 'standalone'\`** in \`next.config.ts\` — includes a minimal server (\`server.js\`) with only the needed modules.
- **\`.dockerignore\`** excludes \`node_modules\`, \`.next\`, \`.git\`, \`.env*\`.`,
    },
    {
      id: "QI.6",
      question: "CI/CD — how have you set up CI/CD pipelines? What checks run before merge?",
      tags: ["CI/CD", "GitHub Actions", "pipeline", "deployment"],
      answer: `**At Gameloft:** Jenkins pipelines. Build triggered on PR creation, ran lint + unit tests, deployed preview to a staging URL. Merge to main triggered production deploy to CDN.

**My personal project setup (GitHub Actions):**
\`\`\`yaml
on: [push, pull_request]
jobs:
  quality:
    steps:
      - bun install
      - bun run lint          # ESLint — block on error
      - bun run type-check    # tsc --noEmit
      - bun run test          # Jest unit tests
  build:
    needs: quality
    steps:
      - bun run build         # Full Next.js production build
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - Deploy to Vercel / server
\`\`\`

**Checks I enforce before merge:**
1. Lint (zero errors)
2. TypeScript type check
3. Unit test suite
4. Build (catches import errors, type errors in client components)
5. Lighthouse CI (on PRs touching performance-sensitive pages)

**For A's app at scale:** Also add E2E smoke tests, bundle size regression check, and visual regression (Chromatic for design system changes).`,
    },
  ],
};

export const apiNetworkingSection: InterviewSection = {
  id: "api-networking",
  label: "II-J. API & Networking",
  category: "Technical",
  iconName: "Globe",
  color: "text-cyan-500",
  bgColor: "bg-cyan-500/10",
  questions: [
    {
      id: "QJ.1",
      question: "REST vs GraphQL vs tRPC — compare them. When would you choose each?",
      tags: ["REST", "GraphQL", "tRPC", "API design"],
      answer: `**REST:** Resource-based endpoints (\`GET /users/:id\`). Simple, widely understood, great tooling. Problem: over-fetching (too many fields) and under-fetching (need multiple requests for related data).

**GraphQL:** Single endpoint, clients specify exactly what data they need. Solves over/under-fetching. Excellent for complex, relationship-heavy data (social graph, e-commerce catalog). Downside: complexity (schema, resolvers, caching is harder than HTTP cache), learning curve, N+1 query problem.

**tRPC:** End-to-end type-safe RPC for TypeScript monorepos. Call server functions as if they were local functions. Zero schema definition — types inferred from server functions automatically. Requires TypeScript on both ends.

**When to choose:**
- **REST:** Public APIs (third-party consumers), simple CRUD, team unfamiliar with GraphQL.
- **GraphQL:** Multiple client types (web, mobile) with different data needs, complex relational data, BFF (Backend for Frontend) patterns.
- **tRPC:** TypeScript full-stack monorepo, internal APIs, fast iteration speed matters.

A's app uses GraphQL — makes sense given the scale and multiple client types.`,
    },
    {
      id: "QJ.2",
      question: "HTTP/2 vs HTTP/3 — key differences. How do they affect frontend performance?",
      tags: ["HTTP/2", "HTTP/3", "QUIC", "multiplexing", "performance"],
      answer: `**HTTP/1.1 problems:** One request per connection (browsers work around this with 6 parallel connections). Head-of-line blocking.

**HTTP/2:**
- **Multiplexing:** Multiple requests over a single TCP connection simultaneously.
- **Header compression** (HPACK): Removes redundant headers.
- **Server push:** Server can proactively send resources (limited real-world adoption).
- **Binary framing** instead of text.

Frontend impact: Connection pooling, fewer TCP handshakes, eliminates HTTP/1.1 hacks (domain sharding, sprite sheets, JS concatenation for request reduction).

**HTTP/3 (QUIC):**
- Runs over **UDP** instead of TCP.
- **No TCP head-of-line blocking:** In HTTP/2, a dropped TCP packet blocks ALL streams. HTTP/3's QUIC handles stream-level loss independently.
- **0-RTT connection** — re-connections (e.g., mobile switching from WiFi to cellular) are much faster.

Frontend impact: Faster on high-latency, packet-loss-prone networks (mobile in Vietnam). Critical for apps with real-time features.`,
    },
    {
      id: "QJ.3",
      question: "WebSockets vs Server-Sent Events (SSE) vs Long Polling — when to use each?",
      tags: ["WebSocket", "SSE", "long polling", "real-time"],
      answer: `**Long Polling:** Client requests → server holds open until there's data → responds → client immediately re-requests. Simulates push but wastes connections. Use only for legacy environments without WebSocket.

**SSE (Server-Sent Events):** One-way server-to-client stream over HTTP. Client opens connection, server pushes events. Built into browsers (\`EventSource\` API). Automatically reconnects. Works with HTTP/2 multiplexing.

Use when: server pushes updates to client only — live scores, notification feeds, log streaming, real-time dashboard data.

**WebSockets:** Full-duplex, persistent TCP connection. Both client and server can push messages anytime.

Use when: bidirectional communication needed — chat, collaborative editing, multiplayer games, real-time trading.

**Comparison:**
| | Long Poll | SSE | WebSocket |
|---|---|---|---|
| Direction | Bi-direction (via request) | Server → Client | Full duplex |
| Protocol | HTTP | HTTP | WS |
| Browser reconnect | Manual | Auto | Manual |
| Proxy/CDN friendly | ✓ | ✓ | Sometimes ✗ |

For A's app chat: **WebSockets**. For notification delivery: **SSE**.`,
    },
    {
      id: "QJ.4",
      question: "How do you handle API errors and retry logic in React?",
      tags: ["error handling", "retry", "React Query", "exponential backoff"],
      answer: `**Error categorisation:**
- **Retryable:** Network timeout, 503 Service Unavailable, 429 Too Many Requests (with backoff).
- **Non-retryable:** 400 Bad Request (client error), 401 Unauthorized (re-auth needed), 404 Not Found.

**With React Query (automatic retry):**
\`\`\`ts
useQuery({
  queryKey: ['user', id],
  queryFn: fetchUser,
  retry: (failureCount, error) => {
    if (error.status === 401 || error.status === 404) return false; // don't retry
    return failureCount < 3;
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // exponential backoff
});
\`\`\`

**Exponential backoff with jitter** (avoids thundering herd when many clients retry simultaneously):
\`\`\`ts
const delay = Math.min(base * 2 ** attempt, maxDelay) * (0.5 + Math.random() * 0.5);
\`\`\`

**User-facing patterns:**
- Inline error state with retry button for non-critical sections.
- Toast notifications for mutation failures.
- Optimistic updates with rollback on failure (React Query's \`onMutate\` + \`onError\`).
- Circuit breaker pattern for repeated failures — stop retrying after N failures, show degraded UI.`,
    },
    {
      id: "QJ.5",
      question: "CORS — what is it, why does it exist, and how do you configure it in Next.js?",
      tags: ["CORS", "security", "preflight", "same-origin", "Next.js"],
      answer: `**Same-Origin Policy:** Browsers block JavaScript from reading responses of cross-origin requests (different domain/port/protocol). Security mechanism — prevents \`evil.com\` from reading your banking data via XHR.

**CORS (Cross-Origin Resource Sharing):** Allows servers to explicitly opt-in to cross-origin requests by returning specific headers.

**Preflight:** For "non-simple" requests (POST with JSON body, custom headers), the browser sends an \`OPTIONS\` request first. The server must respond with appropriate CORS headers or the actual request is blocked.

**Key headers:**
- \`Access-Control-Allow-Origin: https://app.example.com\` — allowed origin(s).
- \`Access-Control-Allow-Methods: GET, POST, PUT\`
- \`Access-Control-Allow-Headers: Content-Type, Authorization\`
- \`Access-Control-Allow-Credentials: true\` — for cookies/auth (requires specific origin, not \`*\`).

**In Next.js:**
\`\`\`ts
// next.config.ts headers() or in API Route:
res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
// Or use the cors npm package in API Routes
\`\`\`

**Common mistake:** Setting \`Access-Control-Allow-Origin: *\` with \`credentials: true\` — browsers reject this combination.`,
    },
    {
      id: "QJ.6",
      question: "How does GraphQL caching work? How do you handle it with Apollo Client or React Query?",
      tags: ["GraphQL", "caching", "Apollo Client", "normalization"],
      answer: `**REST caching** is URL-based — easy to cache by URL (CDN, HTTP headers). GraphQL uses a single endpoint with POST, so HTTP caching doesn't apply to query results.

**Apollo Client's normalized cache:**
- Stores fetched data in a normalized format keyed by \`__typename + id\`.
- If two queries return the same object (e.g., \`User:123\`), they share the same cache entry — update in one place, all queries see the update.
- After a mutation, you can either: \`refetchQueries\` (re-fetch related queries), \`update\` the cache manually, or use \`evict\` to invalidate.

**React Query with GraphQL (no Apollo):**
- Query key = the operation name + variables: \`['GetUser', { id: '123' }]\`.
- Manual cache invalidation: \`queryClient.invalidateQueries({ queryKey: ['GetUser'] })\` after mutation.
- No normalized cache — simpler but must invalidate more aggressively.

**A's app likely uses Apollo Client** given the GraphQL + scale. Key patterns: \`fetchPolicy: 'cache-and-network'\` for fresh data with fast display, optimistic updates with \`cache.modify\`.`,
    },
    {
      id: "QJ.7",
      question: "How do you prevent and handle XSS and CSRF in a React/Next.js app?",
      tags: ["XSS", "CSRF", "security", "React", "Next.js"],
      answer: `**XSS (Cross-Site Scripting):**

React prevents most XSS by default — JSX escapes all values before rendering. \`<div>{userInput}</div>\` is safe even if \`userInput\` contains \`<script>...\`.

**When XSS can still occur:**
- \`dangerouslySetInnerHTML={{ __html: userContent }}\` — only use with a sanitizer (\`DOMPurify\`).
- Injecting user-controlled URLs into \`href\` without validation — \`javascript:alert(1)\`.

\`\`\`ts
// Safe: sanitize before dangerouslySetInnerHTML
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userHtml);
\`\`\`

**Content Security Policy (CSP):** HTTP header that restricts what scripts can run. Prevents injected scripts from executing even if XSS occurs.

**CSRF (Cross-Site Request Forgery):**
- Mitigated by \`SameSite=Lax\` or \`SameSite=Strict\` cookie attribute — cookies not sent on cross-site requests.
- For mutation endpoints: require a CSRF token in a request header (browsers can't set custom headers on cross-site form submissions).
- Next.js Server Actions include built-in CSRF protection via origin checking.`,
    },
  ],
};

export const testingSection: InterviewSection = {
  id: "testing",
  label: "II-K. Testing Strategy",
  category: "Technical",
  iconName: "TestTube",
  color: "text-green-600",
  bgColor: "bg-green-600/10",
  questions: [
    {
      id: "QK.1",
      question: "Testing pyramid — unit vs integration vs E2E. What's the right balance?",
      tags: ["testing", "unit test", "integration test", "E2E", "testing pyramid"],
      answer: `**Testing Pyramid (from base to top):**

**Unit tests (many):** Test a single function or component in isolation. Fast (milliseconds), cheap, run on every save. Cover business logic, utilities, pure functions.

**Integration tests (moderate):** Test how multiple units work together — a form component submitting data to a mock API, a hook with real store integration. Medium speed.

**E2E tests (few):** Run in a real browser (Playwright, Cypress) against a real/staging server. Test complete user journeys. Slow (seconds each), brittle, expensive to maintain. Run in CI, not on every save.

**My balance:** 70% unit, 20% integration, 10% E2E. The E2E tests cover the most critical user paths only — login, core feature creation, payment flow.

**The "test honeycomb" variant (for API-heavy apps):** More integration tests than unit, fewer unit tests. Integration tests that hit a real database are more valuable than unit tests that mock everything.

**Rule from this project:** No mocking crypto functions in integration tests — real encryption/decryption tested.`,
    },
    {
      id: "QK.2",
      question: "How do you test React components with React Testing Library? What's the philosophy?",
      tags: ["React Testing Library", "testing", "user-centric", "accessibility"],
      answer: `**Philosophy:** Test what the user sees and does, not implementation details. Don't test internal state, don't query by component name or CSS class. Query by what's visible/accessible.

**Query priority (high to low):**
1. \`getByRole\` — \`getByRole('button', { name: /submit/i })\` — mirrors what screen readers see.
2. \`getByLabelText\` — for form inputs.
3. \`getByText\` — for visible text.
4. \`getByTestId\` — last resort for elements without semantic meaning.

**Example:**
\`\`\`ts
test('submits the form with user data', async () => {
  render(<ProfileForm onSubmit={mockSubmit} />);
  await userEvent.type(screen.getByLabelText(/name/i), 'Hung');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(mockSubmit).toHaveBeenCalledWith({ name: 'Hung' });
});
\`\`\`

**What NOT to test:** That a \`useState\` variable is true, that a component calls a specific internal method, CSS classes (unless they have user-visible meaning). Test behavior, not implementation.`,
    },
    {
      id: "QK.3",
      question: "Mocking in Jest — `jest.mock`, `jest.spyOn`, `msw`. When to use each?",
      tags: ["Jest", "mocking", "jest.mock", "msw", "spyOn"],
      answer: `**\`jest.mock('module')\`:** Replaces an entire module with an automatic or manual mock. Use for: replacing an API client module, mocking \`next/navigation\` hooks, mocking \`crypto\` (though avoid for crypto in integration tests).

\`\`\`ts
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
\`\`\`

**\`jest.spyOn(object, method)\`:** Wraps an existing method to observe calls without fully replacing it. Can also \`.mockReturnValue()\` to change behavior temporarily. Restores with \`.mockRestore()\`.

\`\`\`ts
const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);
\`\`\`

**MSW (Mock Service Worker):** Intercepts actual HTTP requests at the network level. Works in browser (via Service Worker) and Node (via http interceptor). Your component makes real \`fetch\` calls — MSW intercepts and returns mock responses. Tests behave exactly as in a real browser.

**When to use:**
- **\`jest.mock\`** — module-level dependencies you can't control.
- **\`jest.spyOn\`** — observing/temporarily overriding methods.
- **MSW** — testing network request behaviour (loading states, error states, data rendering) — most realistic.`,
    },
    {
      id: "QK.4",
      question: "Playwright E2E — how do you write maintainable tests?",
      tags: ["Playwright", "E2E", "Page Object Model", "maintainability"],
      answer: `**Key practices for maintainable Playwright tests:**

**1. Page Object Model:** Extract page interactions into classes. Tests become readable; selector changes only update one place.
\`\`\`ts
class LoginPage {
  constructor(private page: Page) {}
  async login(email: string, pw: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(pw);
    await this.page.getByRole('button', { name: 'Log in' }).click();
  }
}
\`\`\`

**2. Prefer user-visible locators:** \`getByRole\`, \`getByLabel\`, \`getByText\` over CSS selectors or XPath. More resilient to styling changes.

**3. Avoid hardcoded waits (\`page.waitForTimeout\`):** Use \`expect(locator).toBeVisible()\`, \`waitForURL\`, \`waitForResponse\`.

**4. Test one concern per test.** Don't test login + profile update + logout in one test — it's harder to diagnose failures.

**5. Fixtures for shared setup:** Playwright fixtures provide authenticated browser state, reusable across tests.

**In this project:** Playwright is configured in \`application/e2e/\`. Run with \`bun run test:e2e\`.`,
    },
    {
      id: "QK.5",
      question: "Code coverage — what does it mean and what are its limitations?",
      tags: ["code coverage", "testing", "quality", "limitations"],
      answer: `**Code coverage metrics:**
- **Statement coverage:** % of statements executed.
- **Branch coverage:** % of branches (if/else paths) taken.
- **Function coverage:** % of functions called.
- **Line coverage:** % of lines executed.

**Limitations:**
- **100% coverage ≠ correct code.** You can execute every line without testing meaningful scenarios.
\`\`\`ts
function divide(a, b) { return a / b; }
// test: divide(6, 2) === 3  → 100% coverage
// but divide(6, 0) → Infinity, never tested
\`\`\`
- **Metric gaming:** Easy to write tests that execute code without asserting anything.
- **Coverage for coverage's sake** creates maintainability burden — tests of internal implementation details.

**What to actually do:**
- Use coverage to find **untested paths**, not to hit a number.
- Prioritise covering **business-critical logic** and **edge cases** over utility functions.
- A meaningful 60% coverage beats gaming 100% with assertion-free tests.
- Branch coverage is more valuable than line coverage.`,
    },
    {
      id: "QK.6",
      question: "How do you test custom React hooks?",
      tags: ["React hooks", "testing", "renderHook", "React Testing Library"],
      answer: `Use \`renderHook\` from \`@testing-library/react\`:

\`\`\`ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

test('increments counter', () => {
  const { result } = renderHook(() => useCounter({ initial: 0 }));
  expect(result.current.count).toBe(0);

  act(() => { result.current.increment(); });
  expect(result.current.count).toBe(1);
});
\`\`\`

**Key patterns:**
- **\`act()\`** wraps state updates (including async ones) to flush effects before asserting.
- **For hooks that need context** (React Query, Router, Theme): provide a wrapper:
\`\`\`ts
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
renderHook(() => useUserData(), { wrapper });
\`\`\`
- **For async hooks** (\`useQuery\`): \`await waitFor(() => expect(result.current.data).toBeDefined())\`.
- **For hooks with timers:** use \`jest.useFakeTimers()\` + \`act(() => jest.advanceTimersByTime(1000))\`.`,
    },
    {
      id: "QK.7",
      question: "TDD (Test-Driven Development) — do you practise it? When is it useful?",
      tags: ["TDD", "test-driven development", "methodology"],
      answer: `I don't do strict TDD (Red-Green-Refactor cycle for every line) in practice — for UI-heavy frontend work, writing tests before the component's interface is defined often wastes effort.

**Where I do use TDD-like thinking:**
- **Business logic functions** — data transformations, validation, pure utilities. Write the test first: "given this input, expect this output." Extremely fast to iterate.
- **Bug fixes** — write a failing test that reproduces the bug, then fix it. The test becomes a regression test.
- **API contracts** — define the expected response shape in a test before implementing the fetcher.

**Where TDD slows me down:**
- Component UI — the interface (props, markup structure) changes as I discover the design. Tests written too early need constant rewriting.
- Exploratory code — when I don't know the shape of the solution yet.

**Best of both worlds:** Write tests alongside or immediately after the code while the intent is fresh. Commit code and tests together. Never let tests lag more than one commit behind.`,
    },
    {
      id: "QK.8",
      question: "How would you design the test strategy for A's app Mini App (WebView-based)?",
      tags: ["testing strategy", "Mini App", "WebView", "A's app"],
      answer: `A's app Mini Apps run in a constrained WebView environment — the native layer provides APIs (file access, payments, contacts) via a JS bridge. Testing strategy must account for this.

**Layers:**

**1. Unit tests (Jest):** Pure business logic, data transformations, utilities. Fast, run everywhere.

**2. Component tests (RTK + JSDOM):** UI components in isolation with mocked JS bridge APIs.
\`\`\`ts
jest.mock('@zmp-sdk/all', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
}));
\`\`\`

**3. Integration tests (MSW):** Test API integration with real component rendering; mock network, real bridge.

**4. E2E in real device/emulator (Playwright or native test runner):** Test the complete flow including actual JS bridge calls. Run on a physical Android/iOS device or emulator in CI.

**5. Manual smoke tests** on A's app's Mini App sandbox before each release.

**Key challenge:** JS bridge APIs (\`getAccessToken\`, \`showToast\`, \`openCamera\`) are not available in JSDOM or Playwright's Chromium. Must mock at the bridge level for most tests; validate real bridge behaviour in device E2E.`,
    },
  ],
};

export const webviewSection: InterviewSection = {
  id: "webview-miniapp",
  label: "II-L. WebView & Mini Apps",
  category: "Technical",
  iconName: "Smartphone",
  color: "text-lime-600",
  bgColor: "bg-lime-600/10",
  questions: [
    {
      id: "QL.1",
      question: "What is a Mini App / WebView app? How does it differ from a regular web app or a native app?",
      tags: ["Mini App", "WebView", "native app", "web app"],
      answer: `**WebView app:** A native app shell that embeds a browser engine (WKWebView on iOS, WebView on Android). The UI is rendered by web technologies (HTML/CSS/JS) inside this shell. The native layer provides access to device APIs (camera, GPS, contacts, payments) via a JavaScript bridge.

**Mini App:** A WebView app embedded inside a host platform (A's app, WeChat, TikTok). The host platform provides the JS bridge and the container; developers build the web UI. Mini Apps launch without installation and share the host app's auth session.

**Differences:**

| | Web App | WebView/Mini App | Native App |
|---|---|---|---|
| Distribution | URL | Platform marketplace | App Store |
| Installation | None | None | Required |
| Device access | Limited (Web APIs) | Via JS bridge | Full |
| Performance | Browser-limited | Browser-limited | Native |
| Auth | Own auth | Host app's auth | Own auth |
| Update | Instant | Instant | App Store review |

**Why companies build Mini Apps:** No app store review cycle, instant deployment, access to host platform's user base, shared auth.`,
    },
    {
      id: "QL.2",
      question: "What are the performance constraints in a WebView environment? How do you optimise for them?",
      tags: ["WebView", "performance", "Mini App", "optimisation"],
      answer: `**Constraints vs regular browser:**
- **JavaScript engine:** WebView on older Android uses System WebView which may be outdated (lower V8 version, no JIT). iOS WKWebView is more current.
- **Memory:** More restricted — the host app takes memory too. Large React bundles + many components held in memory cause OOM (Out of Memory) crashes on low-end devices.
- **CPU:** Background JS bridge calls and heavy animations compete with the host app.
- **Network:** Mini Apps often run in areas with poor connectivity (in-app browsing in A's app).

**Optimisations:**
1. **Aggressive code splitting** — route-level and feature-level dynamic imports. Load only what the current screen needs.
2. **Bundle size discipline** — no heavy libraries (Moment.js, large icon sets). Use tree-shakeable alternatives.
3. **Avoid memory leaks** — clean up event listeners and timers when components unmount. Critical in WebView — leaked memory isn't recovered until app restart.
4. **Virtual scroll** for long lists — never render 500+ items at once.
5. **Image optimization** — WebP, appropriate sizes, lazy loading.
6. **Skeleton screens** instead of spinners — perceived performance.
7. **Prefetch** critical data before the user navigates to a screen.`,
    },
    {
      id: "QL.3",
      question: "JavaScript Bridge — how does communication between WebView and native work?",
      tags: ["JS bridge", "WebView", "native communication", "postMessage"],
      answer: `**JS Bridge pattern:** The native app injects a JavaScript object into the WebView's global scope (e.g., \`window.ZMPBridge\`). The web code calls methods on this object to trigger native actions.

**Communication directions:**

**Web → Native:**
\`\`\`js
// Injected by native host
window.ZMPBridge.getAccessToken({ success: (token) => { ... }, fail: (err) => { ... } });
// Or Promise-based:
const token = await ZaloMiniApp.getAccessToken();
\`\`\`

**Native → Web:**
Native evaluates JS in the WebView:
\`\`\`java
webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('nativeEvent', { detail: data }))", null);
\`\`\`
Web listens via \`window.addEventListener('nativeEvent', handler)\`.

**\`postMessage\` (standard Web approach):**
\`\`\`js
window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'GET_TOKEN' }));
window.addEventListener('message', (e) => { const data = JSON.parse(e.data); });
\`\`\`

**Challenges:**
- Async with no request ID tracking — responses can arrive out of order.
- Error handling — native side may not respond at all.
- Not type-safe — must validate responses.`,
    },
    {
      id: "QL.4",
      question: "How would you debug a Mini App running inside A's app?",
      tags: ["debugging", "Mini App", "WebView", "remote debugging"],
      answer: `**Debugging options:**

**1. Remote DevTools:**
- Android: Enable USB debugging → \`chrome://inspect\` in desktop Chrome → inspect the WebView. Full Chrome DevTools including console, network, performance.
- iOS: Develop menu in Safari → Connect device → inspect WKWebView.

**2. A's app Mini App sandbox/dev environment:**
A's app provides a developer mode where Mini Apps load from a local dev server (via QR code or local network URL). Combines with remote DevTools for live editing + debugging.

**3. In-app console overlay:**
When remote debugging isn't possible, inject a floating console that mirrors \`console.log\` output on screen:
\`\`\`js
const originalLog = console.log;
console.log = (...args) => { originalLog(...args); appendToOverlay(args); };
\`\`\`

**4. Error reporting:**
Send errors to a logging endpoint: \`window.onerror\` + \`window.addEventListener('unhandledrejection')\`.

**5. Network inspection:** Proxy network traffic through Charles or mitmproxy — configure device WiFi to use proxy, install CA cert.

**Most useful in practice:** Chrome remote debugging covers 80% of cases. The overlay console is the escape hatch for iOS or when USB isn't available.`,
    },
    {
      id: "QL.5",
      question: "How do you handle authentication inside a Mini App? How does the JS bridge auth flow work?",
      tags: ["authentication", "Mini App", "JS bridge", "access token", "A's app"],
      answer: `Inside a Mini App, the host platform (A's app) manages the user's identity. The Mini App doesn't need its own login — it delegates to the host.

**Typical A's app Mini App auth flow:**
1. Mini App calls \`ZaloMiniApp.getAccessToken()\` via JS bridge.
2. A's app returns a short-lived access token tied to the current user's session.
3. Mini App sends this token to the Mini App's backend API as a Bearer token.
4. Backend validates the token by calling A's app's token introspection API → gets user ID.
5. Backend issues its own session (JWT) if needed, or uses the token directly for the session lifetime.

**Security considerations:**
- The access token is short-lived — re-fetch before each API call or implement silent refresh.
- Never store the access token in localStorage — it's readable by XSS. Use it in memory only.
- Validate the token on the server every time — don't trust client-side user data.

**Edge cases:**
- Token expired between calls → catch 401, call \`getAccessToken()\` again, retry.
- User not logged into A's app → bridge returns error → Mini App shows "Please log in to A's app first."`,
    },
    {
      id: "QL.6",
      question: "What are the limitations of CSS and layout in WebView environments?",
      tags: ["WebView", "CSS", "layout", "Safari", "Android"],
      answer: `**iOS WebView (WKWebView) — essentially Safari:**
- **\`position: fixed\` issues:** The virtual keyboard pushing content up breaks fixed positioning. Use \`interactive-widget=resizes-content\` in the viewport meta or CSS env(\`keyboard-inset-height\`) workarounds.
- **Momentum scrolling:** Need \`-webkit-overflow-scrolling: touch\` (older iOS) or it stops abruptly.
- **\`100vh\` bug:** The address bar is included in \`vh\` calculation, so \`100vh\` is taller than the visible area. Use \`dvh\` (dynamic viewport height) or JS to measure.
- **CSS features:** Older iOS versions in A's app's minimum support range may lack certain CSS features.

**Android WebView:**
- System WebView version depends on the Android version. Very old devices (Android 5-6) have Chrome 44 WebView — missing many modern CSS features.
- A's app's Android minimum version determines the WebView floor.

**General WebView limitations:**
- No Web Bluetooth, Web NFC, push notifications (use native bridge instead).
- File access via input \`type="file"\` may need native bridge assistance on some versions.
- \`position: sticky\` can be unreliable in certain scroll containers.

**Mitigation:** Target the minimum WebView version A's app supports, test on low-end Android devices, use PostCSS Autoprefixer.`,
    },
    {
      id: "QL.7",
      question: "How would you implement offline support in a Mini App?",
      tags: ["offline", "Service Worker", "IndexedDB", "Mini App", "cache"],
      answer: `**Challenge in Mini Apps:** Service Workers may not be available or may behave differently in WebView depending on the host platform's restrictions.

**Offline strategy layers:**

**1. HTTP caching:** Cache-Control headers for static assets. The WebView cache persists between sessions.

**2. Application-level caching:**
- Cache API data responses in localStorage or IndexedDB when received online.
- On next load (online or offline), serve from cache immediately (stale-while-revalidate pattern).
- React Query / SWR support this via \`persistQueryClient\` / cache persistence plugins.

**3. IndexedDB for structured data:**
- Store user content (messages, drafts, saved items) in IndexedDB.
- Sync queue: when offline, queue mutations; on reconnect, process the queue.

**4. Optimistic updates:**
- Apply changes to local cache immediately, even before API confirmation.
- Show "Syncing…" indicator, rollback on network failure.

**5. Network status detection:**
\`\`\`ts
window.addEventListener('online', syncQueue);
window.addEventListener('offline', showOfflineBanner);
\`\`\`

**Practical note:** For most Mini Apps, even partial offline support (reading cached content) is valuable. Full offline sync (conflict resolution for writes) is complex — worth the investment only for content creation features.`,
    },
    {
      id: "QL.8",
      question: "Given your Gameloft background with WebGL/game development, how would you apply those skills to Mini App development?",
      tags: ["WebGL", "game development", "performance", "Mini App", "Gameloft"],
      answer: `Game development instils performance discipline that directly transfers to Mini App work:

**1. Frame budget thinking:** Games target 60fps = 16ms per frame. I'm accustomed to profiling main-thread work at millisecond granularity. In Mini Apps, I apply the same discipline — identify what runs in the critical path and optimize aggressively.

**2. Memory management discipline:** Game engines require manual lifecycle management (allocate → use → free). In React + WebView, I apply this by:
- Cleaning up all timers, subscriptions, and event listeners in \`useEffect\` cleanup functions.
- Avoiding long-lived closures that capture large data.
- Using WeakRef/WeakMap for caches.

**3. Asset loading pipelines:** Game loading screens taught me to separate initial render from asset loading. In Mini Apps: render shell immediately, load data progressively, skeleton screens during fetch.

**4. WebGL for rich animations:** Campaign sites at Gameloft used Three.js/WebGL for interactive 3D elements. While Mini Apps rarely need this, particle effects or canvas-based animations can differentiate the UX — and I can implement them with performance awareness.

**5. Build optimization:** Games ship heavily compressed assets. I bring the same mindset to JS bundle optimization, image compression, and lazy loading in Mini Apps.`,
    },
  ],
};

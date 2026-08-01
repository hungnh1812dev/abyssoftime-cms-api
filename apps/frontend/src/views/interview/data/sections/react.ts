import type { InterviewSection } from "../types";

export const reactSection: InterviewSection = {
  id: "react-ecosystem",
  label: "II-A. ReactJS Ecosystem",
  category: "Technical",
  iconName: "Atom",
  color: "text-sky-400",
  bgColor: "bg-sky-400/10",
  questions: [
    {
      id: "QA.1",
      question: "Explain the React reconciliation algorithm. How does Fiber architecture differ from the old stack reconciler?",
      tags: ["reconciliation", "Fiber", "rendering", "internals"],
      answer: `**Reconciliation** is React's algorithm for diffing two virtual DOM trees to determine the minimum set of DOM changes needed.

The old **stack reconciler** processed the tree synchronously and recursively — once started, it couldn't pause. This caused jank on large updates because the main thread was blocked for the entire duration.

**Fiber** (React 16+) replaces this with an incremental, interruptible architecture. Each component becomes a "fiber" node — a plain JS object with pointers: \`type\`, \`key\`, \`stateNode\`, \`child\`, \`sibling\`, \`return\`. Work is split into two phases:

- **Render phase** (interruptible) — walks the fiber tree, calculates changes, can pause/resume via scheduler priority.
- **Commit phase** (synchronous) — applies all DOM changes in one batch, cannot be interrupted.

Key benefits: ability to prioritize updates (urgent vs non-urgent), pause low-priority work to handle high-priority events (user input), and the foundation for Concurrent Mode features.`,
    },
    {
      id: "QA.2",
      question: "What are the key changes in React 18/19? Concurrent rendering, Suspense, useTransition, useDeferredValue — which have you used?",
      tags: ["React 18", "React 19", "concurrent", "Suspense"],
      answer: `**React 18:**
- **Automatic batching** — state updates inside promises, setTimeout, and native event handlers are now batched (previously only synthetic events were batched).
- **Concurrent rendering** — \`createRoot\` enables concurrent features.
- **\`useTransition\`** — marks state updates as non-urgent, keeps UI responsive. I've used this for filtering large lists.
- **\`useDeferredValue\`** — defers re-rendering of a value; used for search inputs where the results list update lags behind typing.
- **Streaming SSR** with \`renderToPipeableStream\`.

**React 19:**
- **React Compiler** — automatic memoization, replacing manual \`useMemo\`/\`useCallback\`.
- **\`use()\` hook** — reads promises and context in render.
- **Server Actions** — form handling with server mutations.
- **\`ref\` as a regular prop** — no more \`forwardRef\` wrapper needed.

I've used \`useTransition\` and \`useDeferredValue\` in production. Haven't adopted React 19 features in production yet.`,
    },
    {
      id: "QA.3",
      question: "When should you use `useMemo`, `useCallback`, `React.memo`? Give an example where using them actually hurts performance.",
      tags: ["useMemo", "useCallback", "React.memo", "optimization"],
      answer: `**When to use:**
- \`React.memo\` — when a component re-renders frequently with the same props (expensive render).
- \`useMemo\` — when computing a derived value is expensive (sorting/filtering large arrays).
- \`useCallback\` — when passing callbacks to memoized children (otherwise new function reference breaks \`React.memo\`).

**When they hurt:**
- **Trivial computations** — \`useMemo(() => a + b, [a, b])\` adds overhead (comparison cost) for a calculation cheaper than the memoization itself.
- **Unstable dependencies** — if deps change every render, you pay the comparison cost AND the recomputation.
- **Premature memoization** — wrapping every component in \`React.memo\` adds memory overhead. If props always change, \`React.memo\` does a shallow compare every render and still re-renders anyway.

Classic example: \`<Memo style={{ color: 'red' }} />\` — inline object is recreated every render, so \`React.memo\` always re-renders anyway but now pays the shallow comparison cost on top.`,
    },
    {
      id: "QA.4",
      question: "Custom hooks — describe a complex custom hook you've built. Why did you choose a hook over other patterns?",
      tags: ["custom hooks", "composition", "hooks"],
      answer: `I built \`useInfiniteScroll\` for the DDV wrap-up feature that combined:
- Intersection Observer for detecting scroll position (sentinel element at bottom of list)
- React Query's \`useInfiniteQuery\` for paginated data fetching
- \`useCallback\` for the observer callback to avoid re-attaching on every render
- Cleanup logic to disconnect the observer on unmount
- A ref for the sentinel element

Usage: \`const { data, hasMore, isFetching } = useInfiniteScroll(queryFn)\`

**Why a hook over a HOC:**
- Hooks compose naturally — the consumer just destructures what they need.
- No wrapper component overhead or DevTools nesting hell.
- TypeScript inference works far better with hooks than HOCs.
- A HOC for this pattern would require render prop gymnastics.`,
    },
    {
      id: "QA.5",
      question: "Besides referencing DOM elements, what other purposes have you used `useRef` for?",
      tags: ["useRef", "mutable values", "stale closure"],
      answer: `- **Storing mutable values across renders without triggering re-render** — timer IDs, WebSocket instances, AbortController references, tracking whether a component is mounted.

- **The "latest ref" pattern to avoid stale closures** in intervals/event listeners:
\`\`\`js
const callbackRef = useRef(callback);
callbackRef.current = callback; // sync every render
useEffect(() => {
  const id = setInterval(() => callbackRef.current(), 1000);
  return () => clearInterval(id);
}, []); // safe — never stale
\`\`\`

- **Tracking previous props/state** for comparison without causing a re-render.

- **Storing animation frame IDs** so they can be cancelled on unmount.

\`useRef\` is the right choice when you need something that persists across renders but whose changes should NOT trigger a re-render.`,
    },
    {
      id: "QA.6",
      question: "What's the difference between controlled and uncontrolled components? When do you pick one over the other?",
      tags: ["controlled", "uncontrolled", "forms"],
      answer: `**Controlled:** React state is the single source of truth. Every input change goes through \`onChange\` → \`setState\` → re-render. Use when: you need validation on every keystroke, conditional formatting, or the value depends on other state.

**Uncontrolled:** The DOM holds the value, accessed via \`ref\`. Use when: simple forms where you only need the value on submit, integrating with non-React code, or when you need to avoid re-renders on every keystroke.

I default to **controlled** for most cases because they're more predictable and testable. I use **uncontrolled** for file inputs (inherently uncontrolled in browsers) and occasionally for performance-sensitive inputs where re-rendering on every keystroke is too expensive.

React Hook Form defaults to uncontrolled internally for performance — that's why it's so fast with large forms.`,
    },
    {
      id: "QA.7",
      question: "How does the `useEffect` cleanup function work? Tell me about a bug you encountered from forgetting cleanup.",
      tags: ["useEffect", "cleanup", "memory leaks"],
      answer: `Cleanup runs in two situations: (1) before the effect re-runs (when dependencies change), and (2) when the component unmounts. It's React's way of preventing leaks from subscriptions, timers, and event listeners.

**Bug I encountered:** In DDV wrap-up, an auto-advancing carousel used \`setInterval\` inside \`useEffect\`. I forgot the cleanup. When users navigated away and came back, multiple intervals stacked — the carousel started advancing faster and faster with each visit.

\`\`\`js
useEffect(() => {
  const id = setInterval(advance, 3000);
  return () => clearInterval(id); // this was missing
}, []);
\`\`\`

**Rule of thumb:** Any effect that creates a subscription, timer, or event listener MUST return a cleanup function. React 18 Strict Mode exposes this class of bug by double-invoking effects in development.`,
    },
    {
      id: "QA.8",
      question: "React Server Components (RSC) — how do you understand them? How are they different from traditional SSR?",
      tags: ["RSC", "Server Components", "SSR", "bundle size"],
      answer: `**Traditional SSR:** The entire component tree renders to HTML on the server, sends it to the client, then the client downloads all the JS and hydrates the entire tree. The component code runs on BOTH server and client.

**RSC:** Components are marked as either Server Components or Client Components.

Server Components:
- Run **only on the server** — their code is never sent to the client.
- Can directly access databases, file systems, secrets.
- Output a serialized React tree (not HTML) that the client streams and renders incrementally.
- Cannot use state, effects, or browser APIs.

**Key difference:** RSC reduces client-side JS bundle size because server component code stays on the server. With traditional SSR, all component code eventually ships to the client for hydration. RSC + SSR together: server rendering for initial HTML + smaller client bundles because only interactive components ship JS.

This is significant for a platform like A's app where JS parse time on mobile devices is a real bottleneck.`,
    },
    {
      id: "QA.9",
      question: "How do Error Boundaries work under the hood? Why can't you use hooks for Error Boundaries?",
      tags: ["Error Boundaries", "class components", "error handling"],
      answer: `Error Boundaries use class component lifecycle methods:
- \`static getDerivedStateFromError(error)\` — updates state to trigger fallback UI render.
- \`componentDidCatch(error, info)\` — logs the error with component stack trace.

They catch errors during rendering, in lifecycle methods, and in constructors of child components. They do NOT catch errors in event handlers or async code.

**Why no hooks equivalent?** There's no hook for \`getDerivedStateFromError\`. These are catch mechanisms that need to intercept the render phase — hooks run during render, they can't catch errors thrown during that same render. It's a fundamental architectural limitation. The React team has considered adding an \`useErrorBoundary\` hook but hasn't shipped it (the \`react-error-boundary\` library provides one as a workaround).

In Gameloft Club (in-app browser), I wrapped each major feature section in its own Error Boundary. An uncaught error in a WebView shows a blank white screen with no debugging tools — feature-level boundaries kept the rest of the app functional when one section crashed.`,
    },
    {
      id: "QA.10",
      question: "You upgraded React mid-project — what versions were involved, what were the main breaking changes, and how did you handle the migration?",
      tags: ["migration", "React 18", "upgrade", "breaking changes"],
      answer: `We upgraded from **React 16 to React 18** on the DDV main site.

**Breaking changes we hit:**
- \`ReactDOM.render\` → \`createRoot\` — updated the app entry point.
- **Automatic batching** changed some component behavior — we had code that relied on sequential state updates causing intermediate renders (for DOM measurements). These renders were now batched and measurements broke.
- **Strict Mode double-invocation** exposed effects with missing cleanup (the carousel interval bug).
- Some third-party libraries weren't compatible initially — had to pin versions or find alternatives.

**Migration approach:**
1. Updated React + ReactDOM packages.
2. Fixed all TypeScript errors from the new type definitions.
3. Ran the full test suite.
4. Fixed batching-related issues using \`flushSync\` where sequential rendering was intentional.
5. QA regression testing.
6. Staged rollout to 10% → 100%.

Lesson: upgrade in a separate branch, treat it like a refactor, give QA dedicated time for it.`,
    },
  ],
};

export const reactProblemsSection: InterviewSection = {
  id: "react-problems",
  label: "II-A2. React Problems 2022–2025",
  category: "Technical",
  iconName: "AlertTriangle",
  color: "text-violet-500",
  bgColor: "bg-violet-500/10",
  questions: [
    {
      id: "QA2.1",
      question:
        "React 18 introduced concurrent rendering, which caused 'tearing' with external state stores. What is tearing, why did it happen, and how did React fix it with `useSyncExternalStore`?",
      tags: ["tearing", "concurrent", "useSyncExternalStore", "Redux", "Zustand"],
      answer: `**What is tearing?** In concurrent rendering, React can pause a render, let a higher-priority update run, then resume. If an external store (Redux, Zustand, MobX) changes its value between the pause and resume, different parts of the same render tree can read **different versions of the same state**. The UI shows inconsistent data — one component shows the old value, another shows the new one.

**Why it happened:** Before React 18, rendering was synchronous — the store value couldn't change mid-render. Concurrent rendering broke this assumption. External stores didn't know React had paused.

**The fix — \`useSyncExternalStore\` (React 18):**
\`\`\`js
const value = useSyncExternalStore(
  store.subscribe,       // how to subscribe to changes
  store.getSnapshot,     // how to read current value
  store.getServerSnapshot // optional: SSR value
);
\`\`\`

This guarantees React reads a **consistent snapshot** during the entire render. If the store changes mid-render, React discards the in-progress render and starts fresh with the new value.

**Impact:** Redux (v8+), Zustand (v4+), and most state libraries updated to use \`useSyncExternalStore\` internally. Apps using older versions with React 18 concurrent features could see intermittent UI inconsistencies.`,
    },
    {
      id: "QA2.2",
      question: "React 18 Strict Mode started double-invoking `useEffect` in development. Why did the React team do this? What category of bugs does it expose?",
      tags: ["Strict Mode", "useEffect", "cleanup", "Offscreen API"],
      answer: `**Why the React team did this:** To surface bugs caused by effects that don't properly clean up. React 18 Strict Mode mounts → unmounts → remounts every component in development. This simulates the upcoming **Offscreen API** (a component is hidden but state is preserved, then shown again — like tab navigation in a future React feature).

**Bugs it exposes:**
- **Effects without cleanup** — subscriptions, timers, event listeners that leak on remount.
- **Non-idempotent effects** — an effect that appends to a list instead of replacing it will double the entries.
- **One-time initialization that should be resilient** — analytics init that fires twice, API calls that should be deduped.

**Common examples that broke:**
- \`useEffect(() => { fetchData() }, [])\` — fires twice, two API requests. Fix: use React Query/SWR (built-in deduplication) or AbortController.
- \`useEffect(() => { socket.connect() }, [])\` — opens two connections. Fix: return cleanup.
- \`useEffect(() => { analytics.init() }, [])\` — initializes twice. Fix: module-level flag.

**The correct fix is NOT to remove Strict Mode.** The correct fix is to write effects that work correctly when mounted, unmounted, and remounted.`,
    },
    {
      id: "QA2.3",
      question:
        "React 18's automatic batching changed how `setState` works inside promises, setTimeout, and native event handlers. What broke in existing apps, and when should you use `flushSync`?",
      tags: ["batching", "flushSync", "setState"],
      answer: `**Before React 18:** Only state updates inside React synthetic event handlers were batched. Updates inside \`setTimeout\`, \`Promise.then\`, and native event handlers were NOT batched — each \`setState\` triggered a separate re-render.

**After React 18:** ALL state updates are batched regardless of where they happen.

**What broke:**
- Code that relied on intermediate renders between state updates (e.g., reading DOM measurements between two setState calls).
- Code that expected a re-render after each setState to trigger dependent effects sequentially.

**\`flushSync\` escape hatch:**
\`\`\`js
import { flushSync } from 'react-dom';

setTimeout(() => {
  flushSync(() => setCount(1));  // re-render immediately
  // DOM is updated here — can read measurements
  flushSync(() => setFlag(true)); // re-render again
}, 0);
\`\`\`

In practice, needing \`flushSync\` is rare and usually signals a design issue. If you need intermediate DOM state between updates, consider restructuring to use \`useLayoutEffect\` for measurements instead.`,
    },
    {
      id: "QA2.4",
      question: 'The "setState on unmounted component" warning was removed in React 18. Why was it removed? Was it actually a memory leak?',
      tags: ["unmounted component", "memory leak", "warning"],
      answer: `**The old warning:** "Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application."

**Why it was removed in React 18:**

1. **It was almost always a false positive.** Typical trigger: an API call completes after the component unmounts and calls \`setState\`. The state update is a no-op. But it's **NOT a memory leak** — the closure is garbage collected after the callback runs. There's no retained reference.

2. **It caused harmful workarounds.** Developers added \`isMounted\` ref checks or AbortController cancellation in EVERY effect, adding complexity without fixing actual bugs. Many introduced new race conditions.

3. **Real memory leaks are different.** An actual leak: a \`setInterval\` that's never cleared, or an event listener that's never removed — these keep the callback alive indefinitely. A one-shot API callback that runs and completes is not a leak.

**When you SHOULD still cancel:** When the cancelled work has visible side effects (showing stale data) or when the request is expensive and wasting bandwidth. Not for "preventing leaks."`,
    },
    {
      id: "QA2.5",
      question:
        "React 18/19 made hydration mismatch errors much stricter — many apps broke on upgrade. What are the most common causes and how do you systematically prevent them?",
      tags: ["hydration", "SSR", "mismatch", "React 18"],
      answer: `**React 18 made hydration mismatches errors instead of silent fixes.** Previously React patched differences silently. Now it warns loudly and falls back to full client re-render, defeating SSR's purpose.

**Most common causes:**

1. **Date/time:** Server renders in UTC, client in local timezone.
\`\`\`js
// BAD
<p>{new Date().toLocaleString()}</p>
// FIX: render dates only on client via useEffect, or use UTC
\`\`\`

2. **Browser-only APIs in render:**
\`\`\`js
// BAD
<div>{window.innerWidth > 768 ? 'Desktop' : 'Mobile'}</div>
// FIX: default to one value, update in useEffect
\`\`\`

3. **Random/non-deterministic values:**
\`\`\`js
// BAD: Math.random() differs between server and client
// FIX: useId() from React 18
\`\`\`

4. **Browser extensions** injecting DOM elements the server never rendered.

5. **Conditional rendering based on auth/cookies** — server doesn't have the cookie.

**Systematic prevention:**
- Use \`useId()\` for generated IDs.
- Never use browser APIs (\`window\`, \`localStorage\`) during render — only in \`useEffect\`.
- Use \`suppressHydrationWarning\` only for intentional differences (like timestamps).
- Test with SSR in development, not just client rendering.`,
    },
    {
      id: "QA2.6",
      question: "`forwardRef` has been a long-standing pain point. React 19 removes the need for it. What was the problem, and how does the new `ref` as prop approach work?",
      tags: ["forwardRef", "React 19", "ref", "component API"],
      answer: `**The problem with \`forwardRef\`:**
\`\`\`js
// React 18: verbose wrapper required
const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});
// TypeScript: React.forwardRef<HTMLInputElement, InputProps> — painful
\`\`\`

Problems:
- Extra wrapper function obscures the component's shape in DevTools.
- TypeScript typing is verbose and error-prone.
- Can't easily use hooks that depend on ref alongside \`forwardRef\`.
- Confusing for beginners: "Why is \`ref\` special?"

**React 19 fix — ref is a regular prop:**
\`\`\`js
// React 19: ref is just another prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
\`\`\`

\`forwardRef\` still works (not removed for backwards compatibility), just unnecessary. The migration: remove the \`forwardRef\` wrapper, move \`ref\` from the second argument into the props object.

**Impact:** Design systems with hundreds of components that all needed \`forwardRef\` can remove significant boilerplate. TypeScript types also simplify dramatically.`,
    },
    {
      id: "QA2.7",
      question:
        "The React team spent years building React Compiler (React Forget). What problem does it solve? Why is manual `useMemo`/`useCallback` considered a design flaw? What are the compiler's limitations?",
      tags: ["React Compiler", "memoization", "performance", "auto-memo"],
      answer: `**The problem:** Developers must manually optimize React with \`useMemo\`, \`useCallback\`, and \`React.memo\`. This is:
- **Error-prone** — wrong dependencies cause stale values; missing memoization causes performance bugs.
- **Noisy** — wrapping every callback and computed value in memoization hooks clutters code.
- **A leaky abstraction** — developers must deeply understand React's re-rendering model just to avoid unnecessary work.

**What the compiler does:** Analyzes components at build time and automatically inserts the right memoization. It determines which values need caching based on dependency analysis.

\`\`\`js
// What you write:
function Component({ items }) {
  const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
  const handleClick = () => console.log(sorted);
  return <List items={sorted} onClick={handleClick} />;
}

// What the compiler emits (conceptually):
function Component({ items }) {
  const sorted = useMemo(() => items.sort(...), [items]);
  const handleClick = useCallback(() => console.log(sorted), [sorted]);
  return useMemo(() => <List items={sorted} onClick={handleClick} />, [...]);
}
\`\`\`

**Limitations:**
- Requires code to follow the **Rules of React** — pure render functions, no side effects during render. Code that breaks these rules won't be optimized (or will be optimized incorrectly).
- Doesn't fix architectural performance issues (huge component trees, missing virtualization).
- Doesn't work with external mutable stores accessed during render without \`useSyncExternalStore\`.
- Currently in beta — Instagram uses it in production, but broad adoption is still ramping.`,
    },
    {
      id: "QA2.8",
      question:
        "`use()` is a new hook in React 19 that breaks the 'rules of hooks' (can be called conditionally). What does it do, why was it introduced, and how does it change data fetching patterns?",
      tags: ["use()", "React 19", "Suspense", "data fetching"],
      answer: `**What it does:** \`use()\` reads the value from a Promise or Context. Unlike other hooks, it **can be called conditionally** and inside loops.

\`\`\`js
// Reading a Promise (replaces Suspense + throw pattern)
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// Reading Context conditionally — impossible with useContext
function Theme({ isDark }) {
  if (isDark) {
    const theme = use(ThemeContext);  // conditional! legal with use()
    return <div style={{ background: theme.dark }} />;
  }
  return <div />;
}
\`\`\`

**Why introduced:**
- Simplifies data fetching — instead of \`useState\` + \`useEffect\` + loading/error state boilerplate, just \`use(promise)\` and let Suspense handle loading.
- Enables patterns impossible with strict hooks rules.
- Works with Server Components passing promises as props to client components.

**Old vs new data fetching:**
\`\`\`js
// Old: verbose
const [user, setUser] = useState(null);
useEffect(() => { fetchUser(id).then(setUser); }, [id]);
if (!user) return <Spinner />;

// New: concise
const user = use(fetchUser(id)); // Suspense shows fallback automatically
\`\`\`

**Caveat:** The Promise should be created outside the component (in a loader or server component). Creating it inside render re-triggers suspension on every render.`,
    },
    {
      id: "QA2.9",
      question:
        "React 18 had a subtle but critical issue: memoized values from `useMemo` could be silently discarded by React when memory pressure was high. What are the implications, and how should you code defensively against this?",
      tags: ["useMemo", "cache eviction", "stability", "useRef"],
      answer: `React's documentation explicitly states: *"In the future, React may add features that take advantage of discarding the cache — for example, if React adds built-in support for virtualized lists, it would make sense to discard the cache for items that scroll out of the viewport."*

This means \`useMemo\` is a **performance hint, not a semantic guarantee**. React can throw away cached values whenever it wants.

**Implications:**
- \`useMemo\` should **never** be used for correctness — only for performance. If your code breaks when \`useMemo\` recomputes, you have a bug.

\`\`\`js
// BAD: relies on useMemo for reference stability
const options = useMemo(() => [{ value: 'a' }], []);
// If React evicts this, a new array is created and downstream
// effects depending on reference equality will re-fire

// GOOD: useMemo for performance only — code works without it, just slower
const sortedItems = useMemo(() => items.sort(compareFn), [items]);
\`\`\`

**Defensive coding:**
- For values that MUST be stable references: use \`useRef\` (refs are never evicted).
- For expensive objects that must be created exactly once: use lazy initializer \`useState(() => createExpensiveThing())\`.
- Don't use \`useMemo\` to "prevent re-renders" — use \`React.memo\` on the child component instead.`,
    },
    {
      id: "QA2.10",
      question:
        "Context performance has been a known problem for years — all consumers re-render when any value in the context changes. What solutions exist today, and why hasn't the React team shipped `useContextSelector` natively?",
      tags: ["Context", "performance", "useContextSelector", "re-render"],
      answer: `**The problem:**
\`\`\`js
const AppContext = createContext({ theme: 'dark', user: null, locale: 'en' });

function ThemeButton() {
  const { theme } = useContext(AppContext);
  // Re-renders when user or locale changes too — even though we only use theme!
}
\`\`\`

**Existing solutions:**

1. **Split contexts** — separate \`ThemeContext\`, \`UserContext\`, \`LocaleContext\`. Most effective, but verbose.

2. **\`use-context-selector\` library** (by Dai Shi):
\`\`\`js
const theme = useContextSelector(AppContext, ctx => ctx.theme);
// Only re-renders when theme changes
\`\`\`

3. **Zustand / Jotai** — subscription-based updates natively (only re-render components that read the specific atom that changed).

4. **React Compiler** — may eventually optimize this transparently by detecting which context values a component actually reads.

**Why hasn't React shipped \`useContextSelector\` natively?**
- Selectors need to be called during render, and comparing selector results mid-render adds complexity to the concurrent reconciler.
- The React team believes the **React Compiler** is a better long-term solution — transparent, no new API surface.
- Adding \`useContextSelector\` as a hook creates API surface that must be supported forever.
- Official advice: split your contexts. The community disagrees (hence \`use-context-selector\` having millions of weekly downloads).`,
    },
    {
      id: "QA2.11",
      question:
        "In 2025, a critical security issue was discovered around React Server Components and Server Actions. Explain the vulnerability: how are Server Actions exposed as public HTTP endpoints, how can closure variables leak sensitive data, and what are the best practices to defend against these attacks?",
      tags: ["security", "RSC", "Server Actions", "closure", "authorization"],
      answer: `**Attack Surface 1: Server Actions are public HTTP endpoints**

When you write \`"use server"\`, the function becomes a **publicly accessible POST endpoint**. Anyone can call it — not just your UI. The framework generates a unique action ID exposed as a POST endpoint.

\`\`\`js
// DANGEROUS — no authorization
"use server";
export async function deleteUser(userId: string) {
  await db.users.delete(userId); // attacker can call this directly!
}

// CORRECT — treat like a public API route
"use server";
export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Unauthorized");
  if (typeof userId !== "string" || !isValidUUID(userId)) throw new Error("Invalid input");
  await db.users.delete(userId);
}
\`\`\`

Every Server Action must: authenticate the caller, authorize the action, validate all inputs, and rate limit.

---

**Attack Surface 2: Closure variable serialization leaks sensitive data**

Server Actions defined inside Server Components capture closure variables. Next.js serializes these captured variables (bound args) and embeds them **encrypted** in the HTML sent to the client.

\`\`\`js
async function UserSettings() {
  const secretApiKey = process.env.INTERNAL_API_KEY; // captured!

  async function updateName(formData: FormData) {
    "use server";
    // secretApiKey is captured even though unused here
    // It gets serialized into the client-side HTML (encrypted)
  }
}
\`\`\`

Risks: encryption key compromise decrypts all captured closures; replay attacks; over-capture of unused variables.

**Best practices checklist:**
- Treat every \`"use server"\` function as a PUBLIC API endpoint.
- Always authenticate + authorize inside Server Actions.
- Validate and sanitize ALL arguments (they're user input).
- Never capture sensitive variables (API keys, secrets) in Server Action closures.
- Move Server Actions to separate files (\`"use server"\` at file top) to avoid accidental capture.
- Set explicit encryption keys in production.
- Rate limit Server Actions (especially mutations).`,
    },
    {
      id: "QA2.12",
      question:
        "Explain React2Shell (CVE-2025-55182) — the CVSS 10.0 RCE vulnerability in React Server Components discovered in December 2025. What is the RSC Flight protocol? How did unsafe deserialization allow unauthenticated Remote Code Execution? What versions were affected, and what lessons should frontend developers learn?",
      tags: ["CVE-2025-55182", "RCE", "security", "RSC", "Flight protocol"],
      answer: `**React2Shell (CVE-2025-55182)** — the single most severe vulnerability in React's history. CVSS 10.0 (maximum severity). Unauthenticated Remote Code Execution via a single HTTP request. Disclosed December 3, 2025 by Lachlan Davidson. Exploited in the wild within hours by China-nexus threat groups.

---

**What is the RSC Flight Protocol?**

When a client requests a Server Component or invokes a Server Action, the server sends a stream of serialized JS objects using the **Flight protocol** — a line-based format prefixed with IDs:

\`\`\`
1:{"type":"div","props":{"className":"header"}}
2:$@1
3:["user",{"name":"Hung","role":"admin"}]
\`\`\`

Special symbols indicate data types: \`$@\` for references, \`$F\` for Server Action references, etc. The **server-side decoder** reconstructs client-sent data into JS objects.

---

**How the exploit worked:**

The decoder failed to validate incoming payload structure, allowing prototype chain traversal:

\`\`\`
POST /rsc HTTP/1.1
Content-Type: application/x-react-flight

0:{"$1:__proto__:constructor:constructor":"return process.mainModule.require('child_process').execSync('id').toString()"}
\`\`\`

This single request achieved unauthenticated RCE — no login, no complex chain, no user interaction required.

---

**Affected versions:**
- React 19.0, 19.1.0, 19.1.1, 19.2.0 → patched in 19.0.3, 19.1.4, 19.2.3
- Next.js 15.0.0–16.0.6 (App Router) → patched in 16.0.7+
- NOT affected: React 18 and earlier, Pages Router, client-side-only React apps.

**The fix:** Hardened the Flight deserializer — blocked prototype chain traversal (\`__proto__\`, \`constructor\`, \`prototype\`), added whitelist-based deserialization, strict input validation.

---

**Lessons for frontend developers:**

- **The server boundary is a security boundary.** RSC processes untrusted client data on the server. A frontend vulnerability can now lead to full server compromise.
- **Serialization/deserialization is a classic attack vector.** (Log4Shell for Java, pickle for Python, now Flight for React.)
- **"Frontend" no longer means "client-only."** With RSC, frontend code runs on the server with full privileges.
- **Patch management is critical.** Time from disclosure to active exploitation: hours. Need automated dependency monitoring (Dependabot, Renovate) and ability to deploy patches within hours.
- **After a confirmed compromise:** Rotate ALL secrets — env vars, API keys, database credentials.`,
    },
  ],
};

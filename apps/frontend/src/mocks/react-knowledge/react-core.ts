import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const reactCoreSection: KnowledgeSection = {
  id: "react-core",
  title: "React.js Core",
  icon: "Atom",
  description: "Virtual DOM, Fiber architecture, lifecycles, state batching, concurrent features, and render phases.",
  style: {
    iconColor: "text-sky-400",
    headerBg: "bg-sky-400/10 dark:bg-sky-400/[0.08]",
    headerBorder: "border-sky-400/20 dark:border-sky-400/30",
    accentBorder: "border-sky-400/50 dark:border-sky-400/30",
    sidebarBg: "bg-sky-400/10",
    sidebarText: "text-sky-700 dark:text-sky-300",
  },
  items: [
    {
      id: "react-vdom",
      title: "Virtual DOM & Reconciliation",
      summary: "How React diffs and updates the DOM using reconciliation algorithms.",
      tags: ["Virtual DOM", "Fiber", "reconciliation", "diffing", "key"],
      body: "**Virtual DOM** is a JavaScript object tree representing the UI. When state or props change, React generates a new VDOM tree and compares it to the old one (diffing) to compute the minimal set of updates required to apply to the real DOM.\n\n**Fiber Architecture** (React 16+): Every React element is represented by a Fiber node — a unit of work. Fiber enables:\n- **Incremental rendering**: Splitting rendering work into chunks, allowing it to pause, resume, or abort.\n- **Priority scheduling**: Urgent updates (like user input) are prioritized over non-urgent background updates.\n- **Concurrency**: The concurrent features in React 18 leverage Fiber to render multiple versions of the UI tree in parallel.\n\n**Diffing Heuristics**:\n1. Different element types → React destroys the old tree and builds the new tree from scratch.\n2. Same element types → React updates the changed props in-place on the existing DOM node.\n3. `key` prop: Helps React identify items in dynamic lists. Keys should be stable, unique, and predictable (use database IDs, rather than array indices which can reorder).",
      subtopics: [
        {
          title: "key prop",
          body: "Missing keys or using array indices in reorderable lists causes bugs: component state might persist incorrectly across elements, and unnecessary re-renders will occur. Keys should always be stable unique IDs from your data.",
          codeExample: {
            language: "tsx",
            code: `// Bad: index key in a sortable list
{items.map((item, i) => <Item key={i} data={item} />)}

// Good: stable ID
{items.map(item => <Item key={item.id} data={item} />)}

// Force a component to remount by changing its key
<ProfileForm key={userId} userId={userId} />`,
          },
        },
      ],
    },
    {
      id: "react-render-phases",
      title: "Render Phases",
      summary: "The 4 phases of a React update cycle: Render → Commit → Browser Paint → Post-commit.",
      tags: ["render phase", "commit phase", "paint", "useEffect", "useLayoutEffect"],
      body: "A React update cycle consists of four distinct phases:\n\n**1. Render Phase** (pure, interruptible):\n- React calls your component functions or render() to construct the new element tree.\n- Compares it with the previous tree (reconciliation/diffing).\n- This phase is pure — no side effects are allowed, and the real DOM is not modified.\n- Can be paused, discarded, or restarted by React (Concurrent Mode).\n\n**2. Commit Phase** (synchronous, non-interruptible):\n- React applies the minimal changes to the real DOM.\n- Runs cleanup and setup of `useLayoutEffect` synchronously.\n- Invokes `useImperativeHandle` handlers.\n- Since it is synchronous, it temporarily blocks the browser UI thread.\n\n**3. Browser Paint**:\n- The browser renders the updated DOM onto the screen.\n- React does not control this phase.\n\n**4. Post-commit Phase**:\n- React calls the cleanup and setup functions of `useEffect` (asynchronous, runs after the paint).\n- These passive effects run without blocking user interaction.",
      codeExample: {
        language: "tsx",
        code: `function Component() {
  // RENDER PHASE: runs here (pure, no side effects)
  const value = expensiveComputation();

  useLayoutEffect(() => {
    // COMMIT PHASE: runs synchronously after DOM mutation, before paint
    // Use for: DOM measurements, preventing visual flicker
    const height = ref.current.getBoundingClientRect().height;
    setOffset(height);
  });

  useEffect(() => {
    // POST-COMMIT: runs after browser paint
    // Use for: subscriptions, data fetching, analytics
    const sub = subscribe(onUpdate);
    return () => sub.unsubscribe();
  });

  return <div ref={ref}>{value}</div>;
}`,
      },
    },
    {
      id: "react-batching",
      title: "Batching Mechanism",
      summary: "React groups multiple state updates into a single re-render to optimize performance.",
      tags: ["batching", "automatic batching", "flushSync", "React 18"],
      body: "**Batching** is the optimization mechanism where React groups multiple `setState` calls into a single re-render.\n\n**React 17 and earlier** (Legacy Batching):\n- Only batches updates inside React event handlers (like onClick or onChange).\n- Updates inside `setTimeout`, `Promise.then`, or native event listeners are NOT batched, leading to multiple synchronous re-renders.\n\n**React 18** (Automatic Batching):\n- Batches ALL state updates regardless of where they originate: event handlers, setTimeout, Promises, or native events.\n- Enabled by default when using the `createRoot()` API.\n- You can opt-out and force synchronous updates using `flushSync()`.\n\n**Scheduler Priority Queue**: React 18 schedules tasks with different priorities:\n- `ImmediatePriority`: User-blocking (e.g., cursor input, keyboard gestures).\n- `UserBlockingPriority`: User interactions (e.g., clicking to toggle UI elements).\n- `NormalPriority`: Default asynchronous updates (e.g., fetching data).\n- `LowPriority`: Transitions (e.g., filtering large tables using startTransition).\n- `IdlePriority`: Low priority background work.",
      subtopics: [
        {
          title: "React 17: No batching outside event handlers",
          body: "In React 17, executing multiple state updates outside of a React event callback causes multiple separate re-renders.",
          codeExample: {
            language: "tsx",
            code: `// React 17: triggers 2 separate re-renders
setTimeout(() => {
  setCount(c => c + 1); // re-render 1
  setFlag(f => !f);     // re-render 2
}, 1000);

// React 17 Workaround: force batching using unstable_batchedUpdates
import { unstable_batchedUpdates } from "react-dom";
unstable_batchedUpdates(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}); // 1 re-render`,
          },
        },
        {
          title: "React 18: Automatic batching + flushSync",
          body: "React 18 automatically batches all updates. If you explicitly need synchronous updates, wrap them in `flushSync`.",
          codeExample: {
            language: "tsx",
            code: `// React 18: automatically batched — only 1 re-render
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);

// Opt-out: force immediate synchronous rendering
import { flushSync } from "react-dom";
flushSync(() => setCount(c => c + 1)); // immediate re-render and DOM flush
flushSync(() => setFlag(f => !f));     // immediate re-render and DOM flush
// → 2 re-renders total, DOM updated after each flushSync`,
          },
        },
      ],
    },
    {
      id: "react-lifecycle",
      title: "Component Lifecycle",
      summary: "Comparing class component lifecycle methods to their hook equivalents.",
      tags: ["lifecycle", "mounting", "updating", "unmounting", "getDerivedStateFromProps"],
      body: "**Class Component Lifecycle**:\n- **Mounting**: constructor → getDerivedStateFromProps → render → DOM update → componentDidMount\n- **Updating**: getDerivedStateFromProps → shouldComponentUpdate → render → getSnapshotBeforeUpdate → DOM update → componentDidUpdate\n- **Unmounting**: componentWillUnmount\n- **Errors**: getDerivedStateFromError → componentDidCatch\n\n**Functional Component Equivalent Mapping**:\n- `componentDidMount` → `useEffect(() => {...}, [])`\n- `componentDidUpdate` → `useEffect(() => {...}, [deps])`\n- `componentWillUnmount` → Return cleanup function inside useEffect.\n- `shouldComponentUpdate` → Wrap component in `React.memo` or use `useMemo` for children.\n- `getSnapshotBeforeUpdate` → Handled inside `useLayoutEffect` combined with a ref.\n- `getDerivedStateFromProps` → Perform computation directly during render (e.g., memoizing or comparing previous props).",
      codeExample: {
        language: "tsx",
        code: `// Class component lifecycle
class Timer extends React.Component {
  componentDidMount() { this.id = setInterval(this.tick, 1000); }
  componentWillUnmount() { clearInterval(this.id); }
  render() { return <div>{this.state.seconds}s</div>; }
}

// Function component equivalent
function Timer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id); // cleanup runs during unmount
  }, []); // Empty deps array replicates componentDidMount
  return <div>{seconds}s</div>;
}`,
      },
    },
    {
      id: "react-memo",
      title: "React.memo, useMemo & Performance",
      summary: "Techniques for preventing unnecessary component re-renders.",
      tags: ["memo", "useMemo", "useCallback", "profiler", "virtualization"],
      body: "React re-renders a component when its state changes, its props change, its parent component re-renders, or context values it subscribes to update.\n\n**React.memo**: A higher-order component that shallowly compares props. If props haven't changed, React skips rendering the component. Do not use it if props change on every render or if the component is very fast to render.\n\n**useMemo**: Caches a computed value. **useCallback**: Caches a function reference. Both require accurate dependency arrays.\n\n**Common Performance Pitfalls**:\n- Creating new object or array references inline within JSX (creates new references on every render).\n- Hoisting state too high in the tree, causing massive subtrees to re-render.\n- Missing keys or using array indices as keys in dynamic lists.\n- Failing to split large components, causing small state updates to trigger large renders.",
      subtopics: [
        {
          title: "Virtualization",
          body: "When rendering extremely long lists (1,000+ items), virtualization renders only the items currently visible in the viewport. Libraries like `@tanstack/react-virtual` or `react-window` are used. This project uses `@tanstack/react-virtual` on the Vocabulary page.",
          codeExample: {
            language: "tsx",
            code: `import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40,
});

return (
  <div ref={parentRef} style={{ height: "400px", overflow: "auto" }}>
    <div style={{ height: rowVirtualizer.getTotalSize() }}>
      {rowVirtualizer.getVirtualItems().map(vRow => (
        <div key={vRow.key} style={{ transform: \`translateY(\${vRow.start}px)\` }}>
          {items[vRow.index].name}
        </div>
      ))}
    </div>
  </div>
);`,
          },
        },
      ],
    },
    {
      id: "react-portals-suspense",
      title: "Portals, Suspense & Error Boundaries",
      summary: "Portals for rendering outside the DOM tree, Suspense for async loading, and Error Boundaries for error handling.",
      tags: ["Portal", "Suspense", "ErrorBoundary", "lazy"],
      body: '**Portals**: `ReactDOM.createPortal(children, domNode)` renders children into a separate DOM node (outside the parent component\'s DOM tree). Events still bubble up the React component tree naturally. Used for modals, tooltips, or dropdowns to escape parent containers with `overflow: hidden` or specific `z-index` stacks.\n\n**Suspense**: `<Suspense fallback={<Spinner/>}>` displays fallback content while children are in a "pending" state (e.g., lazy components loading, or data fetching using the new `use()` hook in React 19). Combined with `React.lazy()` for component-level code splitting.\n\n**Error Boundaries**: React class components implementing `getDerivedStateFromError` (to render a fallback UI) and `componentDidCatch` (to log errors). Functional components cannot natively act as Error Boundaries — use the `react-error-boundary` package.',
      codeExample: {
        language: "tsx",
        code: `// Portal Example
const Modal = ({ children }) =>
  createPortal(
    <div className="modal-overlay">{children}</div>,
    document.getElementById("modal-root")!
  );

// Lazy Loading + Suspense
const HeavyChart = React.lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<Skeleton />}>
        <HeavyChart />
      </Suspense>
    </ErrorBoundary>
  );
}`,
      },
    },
    {
      id: "react-concurrent",
      title: "Concurrent Features (React 18)",
      summary: "Concurrent rendering features, startTransition, streaming SSR, and hydration.",
      tags: ["concurrent", "startTransition", "Suspense", "streaming", "React 18"],
      body: "React 18's Concurrent Mode allows React to prepare multiple versions of the UI in parallel and interrupt long-running renders to handle urgent tasks.\n\n**createRoot**: Replaces `ReactDOM.render` to opt-in to Concurrent Mode features.\n\n**startTransition**: Marks state updates as non-urgent. If a user performs an urgent action (like typing), React interrupts the ongoing non-urgent render to prioritize the input.\n\n**useDeferredValue**: Defers re-rendering parts of the UI when a frequently changing value (e.g., typing query) updates.\n\n**Streaming SSR**: Allows the server to stream HTML in chunks, and React hydrates chunks as they arrive rather than waiting for the entire bundle, improving TTFB (Time to First Byte) and FID (First Input Delay).",
      codeExample: {
        language: "tsx",
        code: `import { createRoot, hydrateRoot } from "react-dom/client";

// Opt-in to Concurrent Mode
createRoot(document.getElementById("root")!).render(<App />);

// startTransition allows React to interrupt re-renders if the user continues typing
const [query, setQuery] = useState("");
const [results, setResults] = useState([]);

function handleChange(e) {
  setQuery(e.target.value); // urgent update — immediate re-render
  startTransition(() => {
    setResults(search(e.target.value)); // non-urgent update — can be deferred/interrupted
  });
}`,
      },
    },
    {
      id: "react-version-history",
      title: "React Version History",
      summary: "Major architectural changes across versions from React 16 to React 19.",
      tags: ["React 16", "React 17", "React 18", "React 19", "Fiber", "Hooks"],
      body: "Timeline of major React milestones and features:",
      subtopics: [
        {
          title: "React 16 (2017) — Fiber Architecture",
          body: "A complete rewrite of the React reconciliation core from Stack Reconciler to Fiber. Resulted in incremental rendering and established the async rendering foundation. Features introduced: Error Boundaries, Portals, Fragments (`<>`), `createRef()`, returning arrays/strings from render, and `ReactDOM.hydrate()`.",
        },
        {
          title: "React 16.3 (2018) — New Context API",
          body: "Introduced the modern Context API with `React.createContext()`, `Context.Provider`, and `Context.Consumer`. Added new lifecycle methods: `getDerivedStateFromProps` and `getSnapshotBeforeUpdate`. Deprecated: `componentWillMount`, `componentWillReceiveProps`, and `componentWillUpdate` (renamed with UNSAFE_ prefix).",
        },
        {
          title: "React 16.8 (2019) — Hooks",
          body: "The biggest shift in React history. Functional components gained access to state, side effects, and custom state logic. Introduced hooks: useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, and useDebugValue. Rules of hooks: Only call at the top level, and only call from React functional components or custom hooks.",
        },
        {
          title: "React 17 (2020) — Event Delegation",
          body: "No major user-facing feature additions. Moved event delegation from the `document` root to the React root DOM node, allowing multiple React versions to coexist peacefully on the same page. Introduced a new JSX transform (no longer requiring `import React from 'react'`). Paved the way for React 18 Concurrent Mode.",
        },
        {
          title: "React 18 (2022) — Concurrent Mode",
          body: "Concurrent rendering became stable. Enabled automatic batching for all updates. Added hooks: useTransition, useDeferredValue, useId, useSyncExternalStore, and useInsertionEffect. Replaced ReactDOM.render with createRoot/hydrateRoot. Added Streaming SSR support and official Suspense support for data fetching.",
        },
        {
          title: "React 19 (2024) — Server Components Stable",
          body: "React Server Components (RSC) became stable, enabling components to render exclusively on the server without shipping JavaScript to the client. Server Actions allow clients to call server-side async functions directly. Added hooks: `use()` (reading resources or promises during render), `useFormState` (renamed in final release), `useFormStatus`, and `useOptimistic`. Breaking changes: `ref` is now passed as a regular prop (no `forwardRef` needed). Added `React.cache()` for request deduplication. Improved hydration error messages.",
          codeExample: {
            language: "tsx",
            code: `// React 19: ref as prop (no forwardRef needed)
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// Server Action
async function submitForm(formData: FormData) {
  "use server";
  const name = formData.get("name");
  await db.save({ name });
}

// useOptimistic
const [optimisticLikes, addOptimisticLike] = useOptimistic(likes);
async function handleLike() {
  addOptimisticLike(likes + 1); // instant UI update
  await likePost(postId);       // actual server call
}`,
          },
        },
      ],
    },
  ],
};

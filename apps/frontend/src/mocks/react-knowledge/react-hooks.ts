import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const reactHooksSection: KnowledgeSection = {
  id: "react-hooks",
  title: "React Hooks",
  icon: "Zap",
  description: "All built-in React hooks categorized by render phase classification, including caveats and code examples.",
  style: {
    iconColor: "text-violet-500",
    headerBg: "bg-violet-500/10 dark:bg-violet-500/[0.08]",
    headerBorder: "border-violet-500/20 dark:border-violet-500/30",
    accentBorder: "border-violet-500/50 dark:border-violet-500/30",
    sidebarBg: "bg-violet-500/10",
    sidebarText: "text-violet-700 dark:text-violet-300",
  },
  items: [
    {
      id: "use-state",
      title: "useState",
      hookSignature: "useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]",
      summary: "Declares a state variable that triggers a re-render when updated.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Lazy initializer runs once during mounting; calling the setter enqueues state updates for the next render",
      },
      body: "useState declares a state variable. The initial value is only used during the first render; in subsequent renders, React ignores this argument and returns the current state. Calling the setter function enqueues a state update and schedules a re-render. React 18+ automatically batches all updates.",
      whenToUse: "Any local UI state: toggled visibility, form field values, counters. Keep state as close as possible to the component that consumes it.",
      caveats: [
        "Setter is asynchronous — reading the state immediately after calling the setter will return the old value.",
        "Use functional updates like `setCount(c => c + 1)` when the next state depends on the previous state.",
        "Lazy initializers like `useState(() => expensiveCompute())` prevent recalculating the initial state on every render.",
        "If the setter receives the same value (using Object.is), React bails out and skips the re-render.",
      ],
      codeExample: {
        language: "typescript",
        code: `const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);

// Lazy initializer — runs only on first mount
const [list, setList] = useState(() => JSON.parse(localStorage.getItem("list") ?? "[]"));

// Functional update — safe when next state depends on prev
setCount(prev => prev + 1);

// Update nested object (immutably)
setUser(prev => prev ? { ...prev, name: "Alice" } : null);`,
      },
    },
    {
      id: "use-reducer",
      title: "useReducer",
      hookSignature:
        "useReducer<R extends Reducer<any, any>>(reducer: R, initialArg: ReducerState<R>, init?: (arg: ReducerState<R>) => ReducerState<R>): [ReducerState<R>, Dispatch<ReducerAction<R>>]",
      summary: "An alternative to useState for managing complex state logic with multiple sub-values.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "The reducer is a pure function called during render; dispatching actions enqueues state updates",
      },
      body: "useReducer is ideal when the next state depends on the previous state and involves multiple sub-fields, or when the update logic is complex enough to benefit from separation. Reducers must be pure. The dispatch function reference is stable, meaning it is safe to omit from useEffect/useCallback dependency arrays.",
      whenToUse: "Form state with validation, multi-step wizards, complex UI state machines. Helps centralize update logic and makes testing easier.",
      caveats: [
        "The reducer must be a pure function — no side effects, and do not mutate state directly.",
        "React 18+ batches dispatch calls identically to setStates.",
        "dispatch identity is stable — no need to include it in useCallback/useEffect dependency arrays.",
      ],
      codeExample: {
        language: "typescript",
        code: `type State = { count: number; step: number };
type Action =
  | { type: "inc" }
  | { type: "dec" }
  | { type: "setStep"; payload: number }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "inc":     return { ...state, count: state.count + state.step };
    case "dec":     return { ...state, count: state.count - state.step };
    case "setStep": return { ...state, step: action.payload };
    case "reset":   return { count: 0, step: 1 };
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });`,
      },
    },
    {
      id: "use-context",
      title: "useContext",
      hookSignature: "useContext<T>(context: Context<T>): T",
      summary: "Reads and subscribes to a React context value from the nearest ancestor Provider.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Called during the render phase; subscribes to the nearest ancestor Provider",
      },
      body: "useContext subscribes a component to the nearest matching Provider. When the context value changes, every consumer re-renders. To avoid unnecessary re-renders, split contexts based on change frequency or memoize the context value.",
      whenToUse: "Global theme, locale, authenticated user, feature flags. Avoid using for frequently-changing data — prefer Zustand/Jotai for performance-sensitive states.",
      caveats: [
        "Every consumer component re-renders when the context value reference changes — wrap the value in useMemo.",
        "Context is a dependency injection tool, not a state management or performance optimization tool.",
        "There are no selectors — you cannot subscribe to only a specific part of a context value.",
      ],
      codeExample: {
        language: "typescript",
        code: `const ThemeContext = createContext<"light" | "dark">("light");

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const value = useMemo(() => theme, [theme]); // stable reference
  return (
    <ThemeContext.Provider value={value}>
      <Page />
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}`,
      },
    },
    {
      id: "use-ref",
      title: "useRef",
      hookSignature: "useRef<T>(initialValue: T): MutableRefObject<T>",
      summary: "Holds a mutable value that does not trigger a re-render when mutated.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Returns the same ref object on every render; mutating .current is a side effect that must run outside of the render phase",
      },
      body: "useRef returns a mutable ref object whose .current property is initialized with the passed argument. Unlike state, mutating .current does not trigger a re-render. Used to hold DOM references, store timer IDs, hold previous values, or persist any mutable value without causing UI renders.",
      whenToUse:
        "DOM node access, imperative API calls (focus, play, scroll), storing values that need to persist across renders without causing re-renders (timer IDs, previous values, dirty flags, instance variables).",
      caveats: [
        "Do not read or write .current during the render phase — it is a side effect.",
        "The ref is only attached to the DOM element after the component mounts.",
        "If you need to execute code when a ref changes, use a callback ref instead of useRef.",
      ],
      codeExample: {
        language: "typescript",
        code: `const inputRef = useRef<HTMLInputElement>(null);

// DOM access
function focusInput() { inputRef.current?.focus(); }

// Persist mutable value without re-render
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const prevValueRef = useRef(value);
useEffect(() => { prevValueRef.current = value; });
const prevValue = prevValueRef.current; // previous render's value

return <input ref={inputRef} />;`,
      },
    },
    {
      id: "use-effect",
      title: "useEffect",
      hookSignature: "useEffect(setup: () => void | (() => void), deps?: DependencyList): void",
      summary: "Synchronizes a component with an external system after browser paint.",
      renderPhase: {
        phase: "post-commit",
        label: "Post-commit",
        timing: "Runs asynchronously after the browser paint phase",
      },
      body: "useEffect runs after the browser has painted the committed DOM changes. It is the appropriate place for side effects that do not block visual updates: data fetching, subscriptions, timers, and syncing with non-React APIs. The cleanup function runs before every execution of the effect and before the component unmounts.",
      whenToUse: "Fetching data, subscribing to events, starting animations, syncing with third-party libraries. Do not use for DOM measurements (use useLayoutEffect instead).",
      caveats: [
        "Runs after paint — do not use it for DOM layout measurements that affect visual updates (causes layout flicker).",
        "Missing dependencies cause stale closure bugs; extra dependencies trigger unnecessary effect re-runs.",
        "An empty dependency array `[]` runs the effect once during mounting and cleanups during unmounting.",
        "React 18 Strict Mode: Effects run twice in development to surface missing cleanup routines.",
        "Use an AbortController to cancel fetches when the component unmounts.",
      ],
      codeExample: {
        language: "typescript",
        code: `useEffect(() => {
  const controller = new AbortController();
  fetch(\`/api/users/\${userId}\`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== "AbortError") setError(err); });
  return () => controller.abort(); // cleanup when userId changes or unmounts
}, [userId]);`,
      },
    },
    {
      id: "use-layout-effect",
      title: "useLayoutEffect",
      hookSignature: "useLayoutEffect(setup: () => void | (() => void), deps?: DependencyList): void",
      summary: "Identical to useEffect but runs synchronously after DOM mutations and before browser paint.",
      renderPhase: {
        phase: "commit",
        label: "Commit",
        timing: "Runs synchronously after DOM mutations but before the browser paints the screen",
      },
      body: "useLayoutEffect runs synchronously after React commits DOM mutations but before the browser paints. This is the correct place to read DOM layout (getBoundingClientRect, scrollHeight) and update state/styles synchronously to avoid visible flicker.",
      whenToUse: "DOM measurements, tooltip positioning, scroll restoration, and any update that would cause visible flicker if deferred to useEffect.",
      caveats: [
        "Blocks painting — expensive computations here will delay Time-to-Interactive.",
        "Triggers a React warning when SSR'ed — guard using `typeof window !== 'undefined'` if necessary.",
        "Prefer useEffect for all effects that do not require measuring the DOM.",
      ],
      codeExample: {
        language: "typescript",
        code: `const ref = useRef<HTMLDivElement>(null);
const [tooltipHeight, setTooltipHeight] = useState(0);

useLayoutEffect(() => {
  if (!ref.current) return;
  const { height } = ref.current.getBoundingClientRect();
  setTooltipHeight(height); // update before paint — no flicker
}, [isVisible]);

return <div ref={ref} style={{ top: -tooltipHeight }}>Tooltip</div>;`,
      },
    },
    {
      id: "use-memo",
      title: "useMemo",
      hookSignature: "useMemo<T>(factory: () => T, deps: DependencyList): T",
      summary: "Caches the result of an expensive calculation across renders.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "The factory function runs during the render phase; the result is cached until dependencies change",
      },
      body: "useMemo caches the result of a computation. React only recalculates when the dependency array changes. Used to skip expensive calculations or to maintain referential identity of objects/arrays passed as props to memoized child components.",
      whenToUse:
        "Expensive derived data (filtered/sorted lists), and maintaining stable object/array references passed as props to React.memo children or dependencies of other hooks.",
      caveats: [
        "React 18+ may discard the cached value in low-memory conditions — do not rely on it for semantic correctness.",
        "Premature memoization adds complexity for cheap computations without tangible benefits.",
        "`useMemo(() => fn, deps)` is functionally equivalent to `useCallback(fn, deps)`.",
      ],
      codeExample: {
        language: "typescript",
        code: `// Expensive computation
const filteredItems = useMemo(
  () => items.filter(i => i.active && i.name.toLowerCase().includes(query.toLowerCase())),
  [items, query]
);

// Stable object reference to prevent child re-renders
const contextValue = useMemo(
  () => ({ user, permissions }),
  [user, permissions]
);`,
      },
    },
    {
      id: "use-callback",
      title: "useCallback",
      hookSignature: "useCallback<T extends Function>(fn: T, deps: DependencyList): T",
      summary: "Caches a function reference across renders.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Returns the same function reference as long as dependencies have not changed",
      },
      body: "useCallback returns a memoized function reference. The function is only recreated when its dependency array changes. Its primary purpose is to avoid child component re-renders when functions are passed as props to memoized children.",
      whenToUse: "Passing stable callbacks to React.memo children, or using them as dependencies in other hooks (useEffect/useCallback) downstream.",
      caveats: [
        "Only useful when passing the function to a memoized child component or as a dependency in other hook arrays.",
        "Every variable referenced inside the callback should be listed in deps or captured via a ref.",
        "Functionally equivalent to `useMemo(() => fn, deps)`.",
      ],
      codeExample: {
        language: "typescript",
        code: `const handleSubmit = useCallback(
          (e: React.FormEvent) => {
            e.preventDefault();
            onSave(formData); // onSave from props — must be in deps
          },
          [formData, onSave]
        );

// Passed to memoized child — won't trigger its re-render if formData/onSave are unchanged
return <Form onSubmit={handleSubmit} />;`,
      },
    },
    {
      id: "use-imperative-handle",
      title: "useImperativeHandle",
      hookSignature: "useImperativeHandle<T>(ref: Ref<T>, init: () => T, deps?: DependencyList): void",
      summary: "Customizes the instance value exposed via a ref to a parent component.",
      renderPhase: {
        phase: "commit",
        label: "Commit",
        timing: "Runs during the commit phase, synchronously after DOM mutations",
      },
      body: "useImperativeHandle customizes the ref handle that a component exposes. Used alongside forwardRef, it allows parents to call specific imperative methods (like focus, scroll, or play) without exposing the entire underlying DOM node.",
      whenToUse: "Library components exposing an imperative API (e.g. VideoPlayer, TextEditor), or modal/drawer components exposing open()/close() methods.",
      caveats: ["Avoid using refs for data flow — prefer props and state.", "Requires wrapping the component in forwardRef (React 18). React 19 passes ref as a normal prop."],
      codeExample: {
        language: "typescript",
        code: `interface InputHandle { focus: () => void; clear: () => void; }

const FancyInput = forwardRef<InputHandle, Props>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { if (inputRef.current) inputRef.current.value = ""; },
  }), []);

  return <input ref={inputRef} {...props} />;
});

// Parent usage
const ref = useRef<InputHandle>(null);
ref.current?.focus(); // call custom method`,
      },
    },
    {
      id: "use-transition",
      title: "useTransition",
      hookSignature: "useTransition(): [isPending: boolean, startTransition: (action: () => void) => void]",
      summary: "Marks state updates as non-urgent transitions to keep the UI responsive.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "startTransition defers the update; isPending reflects whether a concurrent render is in progress",
      },
      body: "useTransition allows deferring state updates to prevent them from blocking the UI. Updates wrapped inside startTransition are treated as low-priority transitions. isPending is true while the transition is in-flight.",
      whenToUse: "Filtering or sorting large lists, switching tabs, loading search results, or any state update that may be slow but shouldn't block user input response.",
      caveats: [
        "startTransition must be called synchronously — do not wrap async work directly inside it.",
        "Transitions can be interrupted if a new urgent update arrives.",
        "Do not use for updates that must reflect immediately (e.g., text inputs, animations).",
      ],
      codeExample: {
        language: "typescript",
        code: `const [isPending, startTransition] = useTransition();

function handleTabChange(tab: string) {
  startTransition(() => {
    setActiveTab(tab); // non-urgent — won't block typing
  });
}

return (
  <>
    {isPending && <Spinner />}
    <TabContent tab={activeTab} />
  </>
);`,
      },
    },
    {
      id: "use-deferred-value",
      title: "useDeferredValue",
      hookSignature: "useDeferredValue<T>(value: T, initialValue?: T): T",
      summary: "Defers re-rendering part of the UI to keep other elements responsive.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Returns a stale copy of the value until React re-renders it at a lower priority",
      },
      body: "useDeferredValue receives a value and returns a deferred copy that lags behind. During urgent renders, the deferred value remains at its previous version, preventing an expensive subtree from blocking quick updates. Similar to startTransition but used when you do not control the state setter directly.",
      whenToUse: "Expensive derived renders (like a large filtered list) when typing — used when you do not control the component receiving the value directly.",
      caveats: [
        "Does not prevent the computation work — it only defers it. The deferred render will still occur eventually.",
        "Works best when combined with React.memo on the deferred subtree.",
      ],
      codeExample: {
        language: "typescript",
        code: `const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);

return (
  <>
    <input value={query} onChange={e => setQuery(e.target.value)} />
    {/* Render with deferredQuery — won't block typing */}
    <ResultsList query={deferredQuery} />
  </>
);`,
      },
    },
    {
      id: "use-id",
      title: "useId",
      hookSignature: "useId(): string",
      summary: "Generates a stable unique ID that is consistent between server and client.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Computed during render; stable across re-renders for the same component instance",
      },
      body: "useId generates a unique string ID that is consistent between the server and the client, resolving hydration mismatches that occur when using Math.random() or auto-incrementing counters. Ideal for ARIA attributes and associating form labels with inputs.",
      whenToUse: "Linking `<label htmlFor>` with `<input id>`, aria-describedby, and aria-labelledby. Do not use as keys in lists.",
      caveats: [
        "Do not use as list keys — keys should originate from your data.",
        "Generated IDs contain colons (`:`) — they are valid in HTML but require escaping in CSS selectors.",
      ],
      codeExample: {
        language: "typescript",
        code: `function PasswordField() {
  const id = useId();
  const descId = \`\${id}-desc\`;
  return (
    <div>
      <label htmlFor={id}>Password</label>
      <input id={id} type="password" aria-describedby={descId} />
      <p id={descId}>At least 8 characters</p>
    </div>
  );
}`,
      },
    },
    {
      id: "use-sync-external-store",
      title: "useSyncExternalStore",
      hookSignature: "useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T",
      summary: "Subscribes to an external mutable store in a way that is safe for concurrent rendering.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "getSnapshot is called during render; subscribe sets up the external listener",
      },
      body: "useSyncExternalStore is the recommended API to subscribe to external stores (Redux, Zustand internals, or browser APIs). Safe for concurrent rendering — React will yield and re-render synchronously if it detects a snapshot change mid-render.",
      whenToUse: "Building state-management library integrations, or subscribing to browser APIs (localStorage, media queries, network status, window size).",
      caveats: [
        "getSnapshot must return the same reference if the value hasn't changed.",
        "The subscribe callback should have a stable reference so React doesn't re-subscribe on every render.",
      ],
      codeExample: {
        language: "typescript",
        code: `function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true // server snapshot
  );
}

const isOnline = useOnlineStatus();`,
      },
    },
    {
      id: "use-debug-value",
      title: "useDebugValue",
      hookSignature: "useDebugValue<T>(value: T, format?: (value: T) => unknown): void",
      summary: "Displays a label in React DevTools for custom hooks.",
      renderPhase: {
        phase: "post-commit",
        label: "Post-commit",
        timing: "Only active within React DevTools; does not affect production code",
      },
      body: "useDebugValue allows custom hooks to display a descriptive label in React DevTools. You can pass an optional formatting function to defer expensive string serialization until the hook is actively inspected.",
      whenToUse: "Inside custom hooks to improve the debugging experience. Do not use in standard components.",
      caveats: ["Only visible within React DevTools; does not alter hook behavior.", "Pass a formatting function to defer expensive string computations until inspected."],
      codeExample: {
        language: "typescript",
        code: `function useFormattedDate(date: Date) {
  useDebugValue(date, d => d.toLocaleDateString("en-US"));
  return format(date);
}

// DevTools shows: "useFormattedDate: 05/22/2026" instead of Date object`,
      },
    },
    {
      id: "use-insertion-effect",
      title: "useInsertionEffect",
      hookSignature: "useInsertionEffect(setup: () => void | (() => void), deps?: DependencyList): void",
      summary: "Runs before any DOM mutations — specifically designed for CSS-in-JS library authors.",
      renderPhase: {
        phase: "commit",
        label: "Commit",
        timing: "Runs before DOM mutations in the commit phase — earlier than useLayoutEffect",
      },
      body: "useInsertionEffect runs synchronously before React modifies the DOM. Designed exclusively for CSS-in-JS libraries to inject styles before layout effects run and trigger reflows. Application code should never use this hook.",
      whenToUse: "Only within CSS-in-JS library internals (e.g. styled-components, emotion). Do not use in application code.",
      caveats: ["Cannot read refs or update state inside this hook.", "Using this hook outside CSS-in-JS libraries is an anti-pattern."],
      codeExample: {
        language: "typescript",
        code: `// CSS-in-JS library internals only — not for application code
useInsertionEffect(() => {
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = cssText;
    document.head.appendChild(style);
  }
}, [cssText]);`,
      },
    },
    // React 19 hooks
    {
      id: "use",
      title: "use",
      hookSignature: "use<T>(resource: Promise<T> | Context<T>): T",
      summary: "Reads a Promise or Context — can be called inside loops and conditionals, unlike standard hooks.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Called synchronously in the render phase; suspends the component if the Promise has not resolved yet",
      },
      body: "use is a special React 19 API: it does not follow standard Rules of Hooks, meaning it can be called inside loops, if/else conditions, or after early returns. When passed a Promise, the component suspends until the Promise resolves; when passed a Context, it behaves identically to useContext but is more flexible in call placement.",
      whenToUse:
        "Reading a Promise passed from a Server Component down to a Client Component. Reading Context conditionally. Cannot be used to initiate a Promise inside render — only consume Promises created elsewhere (typically on the server).",
      caveats: [
        "Cannot be used to create a Promise — only to consume it.",
        "When consuming a Promise, the component must be wrapped in a Suspense boundary.",
        "Avoid creating Promises inline during render — doing so will cause the component to suspend repeatedly.",
      ],
      codeExample: {
        language: "tsx",
        code: `import { use, Suspense } from "react";

// Server Component — creates Promise and passes it down
async function UserPage({ id }: { id: string }) {
  const userPromise = fetchUser(id); // Promise, NOT awaited
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// Client Component — consumes Promise with \`use\`
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// Reading Context inside a conditional — impossible with useContext
function ThemedButton({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext); // ✅ OK with \`use\`, ❌ throws with useContext
    return <button style={{ color: theme.primary }}>Click</button>;
  }
  return <button>Click</button>;
}`,
      },
    },
    {
      id: "use-action-state",
      title: "useActionState",
      hookSignature:
        "useActionState<S>(action: (state: S, payload: FormData) => Promise<S> | S, initialState: S, permalink?: string): [state: S, dispatch: (payload: FormData) => void, isPending: boolean]",
      summary: "Manages state for Server Actions, returning the current state, dispatch function, and pending status.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "State updates after the action completes; isPending is true while the action runs",
      },
      body: "useActionState (introduced in React 19 to replace useFormState from react-dom) wraps an action function and tracks its state and pending status. Highly suited for form submissions with Server Actions in the Next.js App Router. The action receives the previous state and FormData, returning the new state.",
      whenToUse:
        "Form submissions with Next.js Server Actions. Any async operation where you need to track pending state and result state simultaneously. Replaces the useState + useTransition pattern for async form handling.",
      caveats: [
        "Import from 'react', not 'react-dom' (unlike the deprecated useFormState).",
        "The action must be an async function or a Server Action.",
        "isPending is true from the moment dispatch is called until the action resolves — useful for disabling submit buttons.",
      ],
      codeExample: {
        language: "tsx",
        code: `"use client";
import { useActionState } from "react";
import { submitContactForm } from "./actions"; // Server Action

type FormState = { success: boolean; error?: string } | null;

export function ContactForm() {
  const [state, formAction, isPending] = useActionState<FormState>(
    submitContactForm,
    null // initial state
  );

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send"}
      </button>
      {state?.error && <p className="text-destructive">{state.error}</p>}
      {state?.success && <p className="text-green-600">Message sent!</p>}
    </form>
  );
}

// actions.ts — Server Action
"use server";
export async function submitContactForm(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;
  try {
    await sendEmail({ email, message });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send. Please try again." };
  }
}`,
      },
    },
    {
      id: "use-form-status",
      title: "useFormStatus",
      hookSignature: "useFormStatus(): { pending: boolean; data: FormData | null; method: string | null; action: string | ((formData: FormData) => void | Promise<void>) | null }",
      summary: "Retrieves submission status of the parent form — must be called inside a child component of the <form>.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "Reactive to the form submission state; updates when the form submits or resolves",
      },
      body: "useFormStatus (imported from 'react-dom') allows child components to query the form's submission state without prop drilling. It must be called in a component that is rendered inside a `<form>` element, not in the component rendering the form itself.",
      whenToUse: "Submit buttons that need to be disabled during submission. Loading indicators inside forms. Any nested component needing form state without manual prop passing.",
      caveats: [
        "Import from 'react-dom', NOT 'react'.",
        "The component calling useFormStatus must be a child of `<form>`, not the component rendering the form.",
        "Only reactive to form submissions — unrelated to external state managers.",
      ],
      codeExample: {
        language: "tsx",
        code: `"use client";
import { useFormStatus } from "react-dom"; // ← react-dom, not react

// ✅ Correct — SubmitButton is a separate child component
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save Changes"
      )}
    </button>
  );
}

// Form component — renders SubmitButton inside
function ProfileForm() {
  return (
    <form action={updateProfile}>
      <input name="name" />
      <input name="bio" />
      <SubmitButton /> {/* ← useFormStatus works correctly here */}
    </form>
  );
}

// ❌ Incorrect — calling useFormStatus in the component rendering the <form>
function BadForm() {
  const { pending } = useFormStatus(); // ← will not work as expected
  return <form action={updateProfile}>...</form>;
}`,
      },
    },
    {
      id: "use-optimistic",
      title: "useOptimistic",
      hookSignature: "useOptimistic<S, A>(state: S, updateFn: (currentState: S, optimisticValue: A) => S): [optimisticState: S, addOptimistic: (optimisticValue: A) => void]",
      summary: "Provides optimistic UI updates — rendering the expected result immediately before the server confirms.",
      renderPhase: {
        phase: "render",
        label: "Render",
        timing: "optimisticState updates synchronously and reverts to the original state once the async action finishes",
      },
      body: "useOptimistic allows displaying the expected UI state immediately when a user triggers an action, while an asynchronous operation (like a Server Action) executes in the background. When the action completes, the optimistic state syncs with the actual server-returned state. If the action fails, React automatically rolls back to the original state.",
      whenToUse:
        "Like/unlike buttons, todo toggles, delete actions — any mutation where immediate UI feedback is desired. Pairs well with useActionState for a comprehensive optimistic data flow.",
      caveats: [
        "Optimistic updates are only visible within async transitions — wrap addOptimistic in startTransition or use with Server Actions.",
        "If the async action fails, React reverts the state, but you must handle user-facing errors yourself.",
        "optimisticState is UI-only — the actual state must be updated via server responses.",
      ],
      codeExample: {
        language: "tsx",
        code: `"use client";
import { useOptimistic, useTransition } from "react";
import { toggleLike } from "./actions";

interface Post {
  id: string;
  liked: boolean;
  likeCount: number;
}

function LikeButton({ post }: { post: Post }) {
  const [isPending, startTransition] = useTransition();

  const [optimisticPost, addOptimistic] = useOptimistic(
    post,
    // updateFn: computes optimistic state from current + action value
    (currentPost, action: "like" | "unlike") => ({
      ...currentPost,
      liked: action === "like",
      likeCount: currentPost.likeCount + (action === "like" ? 1 : -1),
    })
  );

  const handleToggle = () => {
    const action = optimisticPost.liked ? "unlike" : "like";
    startTransition(async () => {
      addOptimistic(action); // update UI immediately
      await toggleLike(post.id, action); // actual server mutation
    });
  };

  return (
    <button onClick={handleToggle} disabled={isPending} className="flex items-center gap-1">
      <HeartIcon className={optimisticPost.liked ? "fill-red-500 text-red-500" : ""} />
      <span>{optimisticPost.likeCount}</span>
    </button>
  );
}`,
      },
    },
  ],
};

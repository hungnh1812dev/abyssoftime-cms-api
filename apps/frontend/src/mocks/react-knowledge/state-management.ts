import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const stateManagementSection: KnowledgeSection = {
  id: "state-management",
  title: "State Management",
  icon: "Layers",
  description: "Jotai, Redux Toolkit, React Context, and how to choose the right state management solution.",
  style: {
    iconColor: "text-purple-500",
    headerBg: "bg-purple-500/10 dark:bg-purple-500/[0.08]",
    headerBorder: "border-purple-500/20 dark:border-purple-500/30",
    accentBorder: "border-purple-500/50 dark:border-purple-500/30",
    sidebarBg: "bg-purple-500/10",
    sidebarText: "text-purple-700 dark:text-purple-300",
  },
  items: [
    {
      id: "sm-decision-guide",
      title: "Decision Guide",
      summary: "Decision tree to select the right state solution based on scope, complexity, and data source.",
      tags: ["local state", "global state", "server state", "decision tree", "useState", "context", "jotai", "redux"],
      body: "Choosing the wrong state management solution is the source of many bugs and performance issues. Follow this decision guide:\n\n**1. State is only used inside a single component?** → Use `useState` or `useReducer`.\n\n**2. State needs to be shared between nearby components (2–3 levels apart)?** → Lift state up + pass via props, or use `useContext` if prop-drilling becomes too deep.\n\n**3. State comes from a server API (data fetching)?** → **DO NOT use global client state management libraries**. Use SWR or TanStack Query — they manage caching, automatic revalidation, loading, and error states natively.\n\n**4. State is truly global and needs to be synchronized in many places?**\n- For simple, atomic-based needs with great DX → **Jotai**\n- For complex needs, requiring powerful DevTools in larger teams → **Redux Toolkit**\n- For form state → Use React Hook Form (no global state needed)\n\n**Rule of Thumb**: Keep as little state global as possible. Local state is easier to test, debug, and prevents application-wide re-renders.",
      subtopics: [
        {
          title: "Server State vs Client State",
          body: "**Server state**: Data fetched from an API — asynchronous, potentially stale, and needs synchronization with the database. Let SWR/React Query manage this.\n\n**Client state**: UI-only state unrelated to the server — modal open/close states, local theme, UI filters, and shopping carts. This is what client state management libraries should actually manage.\n\nCommon mistake: Storing server responses inside Redux/Jotai instead of SWR/React Query, leading to stale data and manual cache invalidation work.",
        },
      ],
    },
    {
      id: "sm-jotai",
      title: "Jotai: Atom-Based State",
      summary: "Atomic state management — each piece of state is an independent atom with precise subscriptions.",
      tags: ["jotai", "atom", "useAtom", "useAtomValue", "useSetAtom", "derived atom", "atomFamily"],
      body: "**Jotai** is inspired by Recoil and based on an atomic model: each atom is the smallest unit of state. Components only re-render when the specific atom they subscribe to changes — avoiding the global re-render sweeps typical of legacy Redux.\n\n**Key Primitives**:\n- `atom(initialValue)` — Creates an atom.\n- `useAtom(anAtom)` — Reads and writes, returning `[value, setValue]`.\n- `useAtomValue(anAtom)` — Read-only subscription (does not trigger re-render of setters).\n- `useSetAtom(anAtom)` — Write-only (component won't re-render when the atom value changes).\n\n**Derived Atoms** (read-only): Computed from other atoms — automatically update when dependencies change.\n\n**Write Atoms**: Atoms with custom setter logic — useful for validation, side effects, or updating multiple atoms at once.\n\n**Advantages over Redux**:\n- No boilerplate (no actions, no reducers, no selectors required).\n- Smaller bundle footprint (~3kb vs ~7kb).\n- Excellent TypeScript type inference.\n- You can co-locate atom definitions with components.",
      codeExample: {
        language: "typescript",
        code: `import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";

// Primitive atom
export const countAtom = atom(0);
export const userAtom = atom<User | null>(null);

// Derived atom (read-only) — updates automatically when dependencies change
export const doubleCountAtom = atom((get) => get(countAtom) * 2);

// Derived atom from multiple source atoms
export const isLoggedInAtom = atom((get) => get(userAtom) !== null);

// Write atom with custom logic
export const incrementByAtom = atom(null, (get, set, delta: number) => {
  set(countAtom, get(countAtom) + delta);
});

// Inside a component
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleCountAtom); // read-only

  return (
    <div>
      <span>{count} (double: {double})</span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}

// Component only needs the setter — won't re-render when countAtom changes
function ResetButton() {
  const setCount = useSetAtom(countAtom);
  return <button onClick={() => setCount(0)}>Reset</button>;
}`,
      },
    },
    {
      id: "sm-jotai-patterns",
      title: "Advanced Jotai",
      summary: "Async atoms with Suspense, atomFamily, atomWithStorage, and utility atoms.",
      tags: ["jotai", "async atom", "atomFamily", "atomWithStorage", "atomWithQuery", "suspense", "loadable"],
      body: "**Async atoms**: Atoms can return Promises — when consumed with `useAtom`, the component automatically suspends until the Promise resolves.\n\n**`atomFamily`**: Creates atoms dynamically based on keys — ideal for normalized entity stores (e.g. user by ID).\n\n**`atomWithStorage`**: Persists the atom value to localStorage/sessionStorage/AsyncStorage — automatically syncs across multiple tabs.\n\n**`atomWithReset`**: Atoms that can be reset to their initial values using `useResetAtom`.\n\n**`loadable(anAtom)`**: Wraps async atoms to read loading/error state inline without needing React Suspense.\n\n**Jotai DevTools**: Use `useAtomsDevtools()` from `jotai-devtools` to inspect the atom graph inside Redux DevTools.",
      codeExample: {
        language: "typescript",
        code: `import { atom } from "jotai";
import { atomFamily, atomWithStorage, atomWithReset, loadable } from "jotai/utils";

// Async atom — components consuming this will trigger Suspense
export const currentUserAtom = atom(async () => {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Not authenticated");
  return res.json() as Promise<User>;
});

// atomFamily — dynamic atoms mapped by key
export const userAtomFamily = atomFamily((userId: string) =>
  atom(async () => {
    const res = await fetch(\`/api/users/\${userId}\`);
    return res.json() as Promise<User>;
  })
);

// atomWithStorage — persist to localStorage
export const themeAtom = atomWithStorage<"light" | "dark">("theme", "light");
export const sidebarOpenAtom = atomWithStorage("sidebarOpen", true);

// loadable — read async state without using Suspense
const loadableUserAtom = loadable(currentUserAtom);

function UserHeader() {
  const user = useAtomValue(loadableUserAtom);
  if (user.state === "loading") return <Spinner />;
  if (user.state === "hasError") return <ErrorMsg error={user.error} />;
  return <span>{user.data.name}</span>;
}

// atomWithReset
import { atomWithReset, useResetAtom } from "jotai/utils";
export const filterAtom = atomWithReset({ search: "", page: 1 });

function FilterBar() {
  const reset = useResetAtom(filterAtom);
  return <button onClick={reset}>Clear Filters</button>;
}`,
      },
    },
    {
      id: "sm-context-pattern",
      title: "React Context Best Practices",
      summary: "Avoiding unnecessary re-renders — context splitting, memoization, and common anti-patterns.",
      tags: ["context", "useContext", "createContext", "memoization", "re-render", "provider", "anti-pattern"],
      body: "**Context is not a state management system** — Context is a dependency injection mechanism. Whenever the context value reference changes, **all** consumer components re-render, even if they only read a small subset of the value.\n\n**Common Anti-patterns**:\n1. Putting all state fields into a single massive context → Every consumer re-renders when any field changes.\n2. Creating new object references in provider values during render → `{ theme, setTheme }` creates a new reference on every render.\n3. Using context for frequently changing values (like cursor position or scroll offset) → Use an external store instead.\n\n**Solutions**:\n- **Context splitting**: Divide state into smaller, domain-specific contexts (e.g. ThemeContext, AuthContext).\n- **Separate read/write contexts**: Create one context for the value, and a separate context for the updater/setter. Components that only trigger actions won't re-render when the value changes.\n- **`useMemo` for value**: Ensure you memoize object references passed to providers.\n- **`memo`** for Provider children to block unnecessary downstream rendering.",
      codeExample: {
        language: "tsx",
        code: `// ❌ Anti-pattern — single context object triggers re-renders on all consumers
const AppContext = createContext({ user: null, theme: "light", cart: [], setTheme: () => {} });

// ✅ Context splitting
const ThemeValueContext = createContext<"light" | "dark">("light");
const ThemeSetContext = createContext<Dispatch<SetStateAction<"light" | "dark">>>(() => {});

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Stable setter reference is safe — useState updaters are stable by design
  return (
    <ThemeValueContext.Provider value={theme}>
      <ThemeSetContext.Provider value={setTheme}>
        {children}
      </ThemeSetContext.Provider>
    </ThemeValueContext.Provider>
  );
}

// Component only reading theme — re-renders when theme changes
function ThemeIcon() {
  const theme = useContext(ThemeValueContext);
  return theme === "dark" ? <MoonIcon /> : <SunIcon />;
}

// Component only calling toggle — DOES NOT re-render when theme changes
function ThemeToggle() {
  const setTheme = useContext(ThemeSetContext);
  return <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>Toggle</button>;
}`,
      },
    },
    {
      id: "sm-redux-toolkit",
      title: "Redux Toolkit",
      summary: "Modern Redux with RTK — createSlice, createAsyncThunk, RTK Query, and Immer.",
      tags: ["redux", "redux toolkit", "RTK", "createSlice", "createAsyncThunk", "RTK Query", "immer", "configureStore"],
      body: '**Redux Toolkit (RTK)** is the officially recommended way to write Redux, eliminating almost all boilerplate code associated with legacy Redux.\n\n**Core APIs**:\n- `configureStore` — Automatically sets up the store with DevTools extension support and standard middlewares (thunk).\n- `createSlice` — Declares actions and reducers simultaneously, using Immer under the hood for clean immutable updates.\n- `createAsyncThunk` — Manages async operations (API requests) by dispatching pending, fulfilled, and rejected actions.\n- `createEntityAdapter` — Simplifies CRUD operations on normalized data structures.\n\n**RTK Query**: A powerful data-fetching and caching layer integrated directly into RTK, operating similarly to SWR/React Query inside the Redux ecosystem.\n\n**Immer**: Integrated into RTK, allowing you to write "mutating" logic directly in reducers which safely compiles to immutable updates.\n\n**When to choose Redux**:\n- Large teams requiring rigid architectural conventions.\n- Storing highly complex state logic with deep interdependencies.\n- Needing advanced time-travel debugging (Redux DevTools).\n- Implementing complex custom middlewares (e.g. offline syncing, persistence, undo/redo logs).',
      codeExample: {
        language: "typescript",
        code: `import { configureStore, createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Async thunk
export const fetchUser = createAsyncThunk("user/fetch", async (id: string) => {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json() as Promise<User>;
});

// Slice — creates actions + reducer together
const userSlice = createSlice({
  name: "user",
  initialState: { data: null as User | null, loading: false, error: null as string | null },
  reducers: {
    clearUser(state) {
      state.data = null; // Immer allows direct mutation syntax
    },
    updateName(state, action: PayloadAction<string>) {
      if (state.data) state.data.name = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUser.fulfilled, (state, { payload }) => { state.data = payload; state.loading = false; })
      .addCase(fetchUser.rejected, (state, { error }) => { state.error = error.message ?? "Error"; state.loading = false; });
  },
});

export const { clearUser, updateName } = userSlice.actions;

export const store = configureStore({ reducer: { user: userSlice.reducer } });

// Typed hooks
type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);`,
      },
    },
    {
      id: "sm-comparison",
      title: "Comparison: Jotai vs Redux vs Context",
      summary: "Bundle size, boilerplate, DX, and choosing the right solution.",
      tags: ["comparison", "bundle size", "boilerplate", "DX", "jotai", "redux", "context", "zustand"],
      body: "| Feature | React Context | Jotai | Redux Toolkit |\n|---|---|---|---|\n| Bundle size | 0kb (built-in) | ~3kb | ~11kb |\n| Boilerplate | Low | Very low | Medium (RTK reduces it) |\n| DevTools | None | Jotai DevTools | Powerful Redux DevTools |\n| Async support | Manual | Built-in (async atoms) | createAsyncThunk |\n| Performance | Re-renders all consumers | Atomic subscriptions | Selector-based |\n| Learning curve | Low | Low | Medium |\n| Team convention | Hard to enforce | Flexible | Clear conventions |\n\n**Practical Conclusion**:\n- Solo projects / small teams → Jotai\n- Enterprise scale / large teams → Redux Toolkit\n- Sharing state across a few visual levels → Context + useMemo\n- Managing API data → SWR or TanStack Query (no custom client state library needed)",
    },
  ],
};

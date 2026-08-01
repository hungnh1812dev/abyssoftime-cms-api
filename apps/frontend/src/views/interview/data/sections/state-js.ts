import type { InterviewSection } from "../types";

export const stateMgmtSection: InterviewSection = {
  id: "state-management",
  label: "II-B. State Management",
  category: "Technical",
  iconName: "Database",
  color: "text-orange-500",
  bgColor: "bg-orange-500/10",
  questions: [
    {
      id: "QB.1",
      question: "The JD emphasizes Redux — but your CV lists Jotai, Context API, SWR, React Query with no Redux. Why didn't you use Redux? Do you have any experience with it?",
      tags: ["Redux", "Jotai", "state management", "experience"],
      answer: `I have experience with Redux from personal projects and study (read the source code, built toy projects), but at Gameloft our projects didn't need it. Our apps were content-heavy campaign sites (DDV, Asphalt Legends) where the main state challenges were:

- **Server state** (game content, user data) → React Query/SWR handled this perfectly with caching, refetching, and optimistic updates.
- **UI state** (modals, tabs, form state) → Jotai or Context API was sufficient — atomic state, minimal boilerplate.

Redux shines when you have complex client-side state with many interdependent mutations — think shopping carts, multi-step workflows, collaborative editors. Our use cases didn't justify the boilerplate.

I understand Redux deeply: actions, reducers, store, middleware, unidirectional data flow. I could be productive with an existing Redux codebase within **1-2 weeks**.`,
    },
    {
      id: "QB.2",
      question: "Compare Redux vs Jotai vs Zustand vs Recoil. When would you choose each?",
      tags: ["Redux", "Jotai", "Zustand", "Recoil", "comparison"],
      answer: `| | Redux | Jotai | Zustand | Recoil |
|---|---|---|---|---|
| Architecture | Single store, reducers | Atomic (bottom-up) | Single store, no reducers | Atomic (graph-based) |
| Boilerplate | High (even with RTK) | Minimal | Low | Moderate |
| Bundle size | ~7kb (RTK) | ~3kb | ~1kb | ~20kb |
| Best for | Complex client state, team conventions | Simple shared state, React-centric | Small-medium apps, outside-React access | Derived state, async selectors |

**When to choose:**
- **Redux** — large teams needing strict conventions, complex state logic, time-travel debugging.
- **Jotai** — React-centric apps, minimal boilerplate, fine-grained re-renders.
- **Zustand** — when you need to access state outside React (vanilla JS), or want Redux-like simplicity without ceremony.
- **Recoil** — heavy derived/computed state, async selectors (though React Query often replaces this need).`,
    },
    {
      id: "QB.3",
      question: "Redux middleware — explain Redux Thunk vs Redux Saga. When would you use Saga?",
      tags: ["Redux Thunk", "Redux Saga", "middleware", "async"],
      answer: `**Redux Thunk:** Middleware that lets action creators return functions instead of plain objects. The function receives \`dispatch\` and \`getState\`, allowing async logic. Simple, small (~14 lines), good for straightforward async operations (API calls).

**Redux Saga:** Uses generator functions to handle side effects. Creates "sagas" that listen for actions and execute complex async flows. Built-in patterns: \`takeEvery\`, \`takeLatest\`, \`debounce\`, \`race\`, \`fork\`.

**When to use Saga:**
- Complex async workflows — e.g., "when user logs in, fetch profile, then preferences, then notifications, and if any fail, retry twice then show error."
- Coordinating multiple concurrent actions — \`race\`, \`all\`, \`fork\`.
- Need for cancellation — \`takeLatest\` automatically cancels the previous running saga.
- Event channel patterns — listening to WebSocket messages.

For most apps, Thunk (or RTK's \`createAsyncThunk\`) is sufficient. Saga adds learning curve that only pays off with genuinely complex orchestration.`,
    },
    {
      id: "QB.4",
      question: "How does Redux Toolkit (RTK) differ from traditional Redux? How does RTK Query compare to React Query?",
      tags: ["RTK", "Redux Toolkit", "RTK Query", "React Query"],
      answer: `**RTK vs traditional Redux:**
- \`createSlice\` combines action types + action creators + reducer in one declaration — eliminates ~60% of boilerplate.
- Uses **Immer** internally — you can write "mutating" logic in reducers safely.
- \`configureStore\` sets up middleware and DevTools automatically.
- \`createAsyncThunk\` standardizes async action pattern.

**RTK Query vs React Query:**
- **RTK Query** — built into Redux ecosystem, auto-generates hooks from endpoint definitions, best when you're already using Redux and want unified state management.
- **React Query** — framework-agnostic (works with any state manager), more mature caching/invalidation controls, better DevTools, larger community. Better for server-state-only management.

I'd choose **RTK Query** if the project already uses Redux for client state. I'd choose **React Query** if server state management is the primary need and client state is minimal.`,
    },
    {
      id: "QB.5",
      question: "What is Flux architecture? Why does Redux follow a single store pattern?",
      tags: ["Flux", "Redux", "single store", "unidirectional"],
      answer: `**Flux** (by Facebook): Unidirectional data flow pattern — Action → Dispatcher → Store → View. Views dispatch actions, never modify stores directly. Solves the "cascading updates" problem in MVC where models updating other models create unpredictable state.

**Why single store in Redux?**
1. **Single source of truth** — the entire app state is one object, making debugging predictable and serializable.
2. **Time-travel debugging** — you can replay the sequence of actions. Multiple stores make this harder.
3. **Serialization** — easy to save/restore entire app state (for undo/redo, offline persistence).
4. **SSR** — serialize the store on the server, send to client for hydration.

Multiple stores (like in original Flux) require coordinating between stores, which introduces complexity and makes the data flow less predictable.`,
    },
    {
      id: "QB.6",
      question: "Immutability in Redux — why is it important? How do you handle it without Immer?",
      tags: ["immutability", "Redux", "Immer", "shallow comparison"],
      answer: `**Why important:** Redux uses shallow equality checks (\`===\`) to determine if state changed. If you mutate the existing state object, the reference stays the same → Redux doesn't detect the change → components don't re-render.

**Without Immer — spread-based updates:**
\`\`\`js
// Nested update without Immer
return {
  ...state,
  user: {
    ...state.user,
    address: {
      ...state.user.address,
      city: 'Ho Chi Minh'
    }
  }
};
\`\`\`

This is verbose and error-prone for deeply nested state — which is exactly why **Immer** (built into RTK) is so valuable. With Immer you write:
\`\`\`js
state.user.address.city = 'Ho Chi Minh'; // safe "mutation"
\`\`\`
Immer uses Proxy under the hood to track mutations and produce a new immutable object.`,
    },
    {
      id: "QB.7",
      question: "You use Context API for state management — when is Context API not enough and you need an external state manager? How do you handle Context re-render issues?",
      tags: ["Context", "re-render", "limitations", "performance"],
      answer: `**When Context is not enough:**
- When many components across different subtrees need the same state — Context re-renders ALL consumers when the value changes, even if they only use a portion.
- When update frequency is high (typing in a search box) — every keystroke re-renders all consumers.
- When you need middleware (logging, async handling, undo/redo).

**Handling re-render issues:**
1. **Split contexts** — separate frequently-changing state from rarely-changing state.
2. **\`useMemo\` the context value** to prevent unnecessary re-renders from parent renders:
\`\`\`js
const value = useMemo(() => ({ theme, locale }), [theme, locale]);
\`\`\`
3. **\`use-context-selector\` library** — only re-renders when the selected slice changes.
4. At a certain complexity level, switch to **Jotai/Zustand** which have built-in subscription-based re-rendering (only re-render components that read the specific atom that changed).`,
    },
    {
      id: "QB.8",
      question: "For an app at scale (tens of millions of users), which state management would you choose and why?",
      tags: ["scale", "state management", "architecture", "Redux"],
      answer: `The user count doesn't directly dictate state management choice — **app complexity and team size** matter more.

My recommendation for A's app scale:
- **Server state** (90% of data in most apps) → **React Query / SWR**. At scale, proper cache invalidation, optimistic updates, and request deduplication matter more than the state library choice.
- **Client state** → **Redux (with RTK)** for large teams because it enforces conventions, has excellent DevTools for debugging, and new team members can onboard faster with well-structured Redux patterns.
- **UI micro-state** (modals, tooltips) → **Jotai or local state** — keep it simple, keep it close.

At 20+ engineers, team conventions matter as much as performance. Redux's strict patterns reduce the cognitive overhead of "where does this state live?"`,
    },
  ],
};

export const functionalProgSection: InterviewSection = {
  id: "functional-programming",
  label: "II-C. Functional Programming & Immutability",
  category: "Technical",
  iconName: "Braces",
  color: "text-yellow-500",
  bgColor: "bg-yellow-500/10",
  questions: [
    {
      id: "QC.1",
      question: "Explain: pure function, side effects, higher-order function, currying, composition.",
      tags: ["functional programming", "pure function", "currying", "composition"],
      answer: `- **Pure function:** Same inputs → same output, no side effects. \`const add = (a, b) => a + b\`. Predictable, testable, cacheable.

- **Side effects:** Anything that modifies external state — DOM manipulation, API calls, logging, modifying global variables. In React, side effects live in \`useEffect\`.

- **Higher-order function:** A function that takes a function as an argument OR returns a function. Examples: \`Array.map()\`, \`Array.filter()\`, React's \`memo()\`.

- **Currying:** Transforming a multi-argument function into a sequence of single-argument functions.
\`\`\`js
const add = a => b => a + b;
add(1)(2); // 3
// Useful for partial application: const addOne = add(1);
\`\`\`

- **Composition:** Combining simple functions to build complex ones.
\`\`\`js
const compose = (f, g) => x => f(g(x));
const transform = compose(sort, filter);
\`\`\`
In React, hooks compose: \`useAuth\` might internally use \`useQuery\` + \`useLocalStorage\`.`,
    },
    {
      id: "QC.2",
      question: "Immutability — besides spread operator and `Object.assign`, what other approaches do you know? Immer, Immutable.js?",
      tags: ["immutability", "Immer", "Immutable.js", "structuredClone"],
      answer: `- **Spread / \`Object.assign\`** — simple but verbose for deeply nested objects.

- **Immer** — write "mutating" code, Immer produces immutable updates via Proxy. Used by RTK internally. My preferred approach for complex nested state.
\`\`\`js
const nextState = produce(state, draft => {
  draft.user.address.city = 'Ho Chi Minh'; // safe mutation
});
\`\`\`

- **Immutable.js** — provides persistent immutable data structures (\`Map\`, \`List\`, \`Record\`). Efficient for large collections via structural sharing. Downside: lose plain JS interoperability (need \`.get()\`, \`.set()\` instead of property access), adds bundle size.

- **\`structuredClone\`** — deep clone (creates an immutable copy for modification).

- **\`Object.freeze\`** — shallow freeze only, dev-time safety net, not a real mutation prevention strategy.`,
    },
    {
      id: "QC.3",
      question: "Why is immutability important in React? How does it relate to shallow comparison?",
      tags: ["immutability", "shallow comparison", "re-render", "React"],
      answer: `React's re-render decision (in \`React.memo\`, \`useMemo\`, \`useCallback\`) relies on **shallow comparison** (\`Object.is\` / \`===\`). Shallow comparison checks reference equality, not deep equality.

If you **mutate** an object: \`state.user.name = 'New'\` → the reference \`state.user\` stays the same → \`===\` returns \`true\` → React thinks nothing changed → no re-render. **Bug!**

If you **create a new object**: \`{ ...state, user: { ...state.user, name: 'New' } }\` → new reference → \`===\` returns \`false\` → React detects change → re-render. ✓

This is also why passing inline objects/arrays as props defeats \`React.memo\`:
\`\`\`js
// Every render creates a new object — React.memo always re-renders
<Memo style={{ color: 'red' }} />
// FIX: define outside component or useMemo
const style = useMemo(() => ({ color: 'red' }), []);
\`\`\``,
    },
    {
      id: "QC.4",
      question: "Give a real-world example of applying functional programming in a React project.",
      tags: ["functional programming", "real-world", "pipe", "pure functions"],
      answer: `In the DDV wrap-up project, raw achievement data from the API needed multiple transformation steps before display. I built a pipeline of pure transformation functions:

\`\`\`js
const transformAchievements = pipe(
  filterCompletedQuests,      // achievements → filtered
  groupByCategory,             // filtered → grouped
  sortByCompletionDate,        // grouped → sorted
  enrichWithDisplayData,       // sorted → enriched with icons, labels
  limitPerCategory(5)          // enriched → top 5 per category
);

// In component:
const displayData = useMemo(
  () => transformAchievements(rawData),
  [rawData]
);
\`\`\`

Each function is **pure** (no side effects, same input → same output), testable in isolation, and the pipeline is easy to modify by adding/removing/reordering steps. This is functional composition in practice.

Benefits: easy to unit test each transform independently, easy to add a new step without touching others, and the pipeline's intent is readable.`,
    },
  ],
};

export const javascriptSection: InterviewSection = {
  id: "javascript",
  label: "II-D. JavaScript Deep Dive (ES6+)",
  category: "Technical",
  iconName: "FileCode",
  color: "text-yellow-400",
  bgColor: "bg-yellow-400/10",
  questions: [
    {
      id: "QD.1",
      question: "Event loop: explain microtask vs macrotask. `Promise.then` vs `setTimeout` — which runs first and why?",
      tags: ["event loop", "microtask", "macrotask", "Promise", "setTimeout"],
      answer: `The event loop processes tasks in this order per cycle:
1. Execute the current **macrotask** (script execution, setTimeout callback, I/O).
2. Process **all microtasks** in the queue (Promise.then, queueMicrotask, MutationObserver).
3. Render (if needed).
4. Pick the next macrotask.

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
\`\`\`

**Why Promise runs before setTimeout:** After synchronous code (1, 4) finishes, the microtask queue (Promise → 3) fully drains before the next macrotask (setTimeout → 2) is picked up. Microtasks always exhaust before yielding to the next macrotask.`,
    },
    {
      id: "QD.2",
      question: "Closures — give an example of a common bug caused by closures in React (stale closure). Have you encountered this?",
      tags: ["closures", "stale closure", "useEffect", "setInterval"],
      answer: `Classic stale closure bug:
\`\`\`js
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // Always logs 0!
      setCount(count + 1); // Always sets to 1!
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps — closure captures count=0 forever
}
\`\`\`

The effect closes over \`count\` at the time it was created (0). Because deps are \`[]\`, it never re-runs, so \`count\` is forever 0 inside the closure.

**Fixes:**
1. **Functional updater:** \`setCount(prev => prev + 1)\` — doesn't need the closed-over value.
2. **Add to deps:** \`useEffect(..., [count])\` — but then interval resets every render.
3. **Ref pattern:** \`countRef.current = count\` updated every render, read \`countRef.current\` in the interval.

Yes — I've hit this in production with the auto-advancing carousel timer in DDV.`,
    },
    {
      id: "QD.3",
      question: "Prototypal inheritance vs class inheritance — how does JavaScript actually work under the hood?",
      tags: ["prototype", "inheritance", "class", "JavaScript internals"],
      answer: `JavaScript has no classical inheritance. Every object has an internal \`[[Prototype]]\` link to another object. Property lookup walks this prototype chain.

\`\`\`js
const animal = { speak() { return 'sound'; } };
const dog = Object.create(animal); // dog.__proto__ === animal
dog.speak(); // found on prototype chain
\`\`\`

**Classes are syntactic sugar:**
\`\`\`js
class Dog extends Animal {}
// Under the hood: Dog.prototype.__proto__ === Animal.prototype
\`\`\`

**Key difference from class-based languages:** JS objects **delegate** to prototypes at runtime (dynamic lookup), not copy properties at construction time. This means you can modify prototypes after object creation and existing objects pick up the changes — which is both powerful and dangerous.

In React, the class component lifecycle is built on this — \`React.Component.prototype.setState\` is inherited by every class component.`,
    },
    {
      id: "QD.4",
      question: "`WeakMap`, `WeakRef` — real-world use cases?",
      tags: ["WeakMap", "WeakRef", "garbage collection", "memory"],
      answer: `**WeakMap:** Keys are held weakly — if no other reference to the key exists, the entry is GC'd.

Use cases:
- **Metadata for DOM elements without preventing GC:** React's internal fiber tree uses a similar concept.
- **Caching computed results per object:** \`const cache = new WeakMap(); cache.set(obj, expensiveResult)\` — cache is freed when \`obj\` is GC'd.
- **Private data pattern:** Store "private" properties keyed by \`this\` without exposing them on the object.

**WeakRef:** Holds a weak reference — \`deref()\` returns the object or \`undefined\` if GC'd.

Use cases:
- **Caches for large objects** where you want to allow GC under memory pressure (unlike \`Map\`, which keeps objects alive).
- **Observing objects without preventing cleanup** (e.g., tracking component instances for debugging without causing memory leaks).

Rule of thumb: if you're building caches that shouldn't prevent GC, reach for WeakMap/WeakRef.`,
    },
    {
      id: "QD.5",
      question: "Generator functions and `async/await` — how are they related? When would you use generators?",
      tags: ["generators", "async/await", "iterator", "lazy evaluation"],
      answer: `**Generators** are functions that can pause execution (\`yield\`) and resume later. They return an iterator.

**\`async/await\` is built on top of generators + Promises** internally. The engine transforms async functions into something conceptually like a generator that yields promises, with a runner that resumes on promise resolution.

**When to use generators directly:**
- **Lazy evaluation of infinite sequences:**
\`\`\`js
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) { yield a; [a, b] = [b, a + b]; }
}
const fib = fibonacci();
fib.next().value; // 0, 1, 1, 2, 3, 5...
\`\`\`
- **Custom iterables** — \`for...of\` compatibility.
- **Coordinating complex async flows** — Redux Saga uses generators for this: \`yield take('ACTION')\`, \`yield call(apiFunction)\`.
- **State machines** — each \`yield\` represents a state transition.

For most async code, \`async/await\` is simpler and preferred.`,
    },
    {
      id: "QD.6",
      question: "`Proxy` and `Reflect` — use cases?",
      tags: ["Proxy", "Reflect", "reactivity", "validation"],
      answer: `**Proxy:** Wraps an object and intercepts fundamental operations (get, set, has, deleteProperty, etc.).

**Use cases:**
- **Reactivity systems** — Vue 3's reactivity is built entirely on Proxy. When you access a reactive property, the Proxy's \`get\` trap tracks the dependency; \`set\` trap triggers re-renders.
- **Validation** — \`set\` trap can validate values before assignment.
- **Immer** uses Proxy to detect mutations in "draft" state.
- **Auto-logging / instrumentation** — intercept all property accesses for debugging.
- **Default values** — \`get\` trap returns a default if property doesn't exist.

\`\`\`js
const validator = new Proxy({}, {
  set(obj, prop, value) {
    if (prop === 'age' && typeof value !== 'number') throw new TypeError('age must be a number');
    obj[prop] = value;
    return true;
  }
});
\`\`\`

**Reflect:** Provides methods corresponding to Proxy traps, used to perform the default behavior inside trap handlers: \`Reflect.get(target, prop, receiver)\`. This ensures correct \`this\` binding and behavior when using inheritance.`,
    },
    {
      id: "QD.7",
      question: "Memory leaks in JavaScript — common causes? Have you debugged a memory leak? What tools did you use?",
      tags: ["memory leak", "garbage collection", "DevTools", "debugging"],
      answer: `**Common causes:**
- **Forgotten event listeners** — \`addEventListener\` without \`removeEventListener\` in cleanup.
- **Forgotten timers** — \`setInterval\` / \`setTimeout\` without \`clearInterval\` / \`clearTimeout\`.
- **Detached DOM nodes** — JS holds a reference to a DOM element removed from the tree.
- **Closures capturing large scopes** — a closure in a long-lived callback holds references to everything in scope.
- **Global variables** — accidentally assigning to \`window\`.
- **Uncleared caches** — maps/arrays that grow without bounds.

**Debugging tools:**
- Chrome DevTools → **Memory tab → Heap Snapshots** — compare two snapshots, look for growing object counts (objects that should have been GC'd but weren't).
- **Timeline/Performance recording** — look for increasing memory without GC recovery (sawtooth pattern that trends upward).
- \`performance.measureUserAgentSpecificMemory()\` for real-user measurements.

**Real example:** In Gameloft Club's in-app browser, a WebSocket reconnection handler was creating new listeners on each reconnect without removing old ones. Found it by comparing heap snapshots before and after several reconnections — the WebSocket listener count kept growing.`,
    },
    {
      id: "QD.8",
      question: "Module system: ESM vs CommonJS — differences? How does tree shaking work?",
      tags: ["ESM", "CommonJS", "tree shaking", "bundling"],
      answer: `**CommonJS (CJS):**
- \`require()\` / \`module.exports\`
- Synchronous loading, evaluated at runtime
- Dynamic — can \`require()\` inside an if-block
- Node.js default

**ESM (ES Modules):**
- \`import\` / \`export\`
- Asynchronous, **statically analyzable** (imports/exports determined at compile time)
- Top-level only — can't \`import\` inside if-blocks (dynamic \`import()\` is separate)
- Browser-native, Node.js supports it

**Tree shaking** relies on ESM's static analysis: bundlers (Webpack, Rollup, Vite) can determine at build time which exports are never imported and eliminate them from the bundle. CJS can't be tree-shaken because \`require()\` is dynamic.

**When tree shaking fails:**
- Library ships CJS only (Moment.js was the classic example before ESM was added).
- **Barrel files** re-export everything — \`import { Button } from '@ui'\` pulls the entire library.
- Side effects in module scope — marking \`"sideEffects": false\` in \`package.json\` helps bundlers skip these.`,
    },
    {
      id: "QD.9",
      question: "`structuredClone` vs `JSON.parse(JSON.stringify())` — what's different?",
      tags: ["structuredClone", "deep clone", "serialization"],
      answer: `| | \`structuredClone\` | \`JSON.parse(JSON.stringify())\` |
|---|---|---|
| \`Date\` | Preserves as Date ✓ | Converts to string ✗ |
| \`Map\`, \`Set\` | Preserved ✓ | Become \`{}\` ✗ |
| \`RegExp\` | Preserved ✓ | Becomes \`{}\` ✗ |
| \`undefined\` | Preserved ✓ | Stripped from objects ✗ |
| Circular refs | Handled ✓ | Throws error ✗ |
| \`ArrayBuffer\`, \`Blob\` | Handled ✓ | Not handled ✗ |
| Functions | Not handled | Not handled |
| DOM nodes | Not handled | Not handled |

**Use \`structuredClone\` as the default** for deep cloning. Fall back to JSON method only if you need to support very old browsers AND your data is pure JSON-compatible (no Dates, Maps, Sets, etc.).`,
    },
    {
      id: "QD.10",
      question: "Web Workers / SharedArrayBuffer — have you used them? When are they needed?",
      tags: ["Web Workers", "SharedArrayBuffer", "threading", "performance"],
      answer: `**Web Workers:** Run JavaScript in a background thread. Communication via \`postMessage\` (structured clone serialization). No access to DOM.

**Use cases I'd consider:**
- Heavy computation (image processing, data parsing, CSV export) that would block the main thread.
- Syntax highlighting or markdown parsing for large content.
- Running WebAssembly (complex data transformations).

**SharedArrayBuffer:** Allows shared memory between main thread and workers (zero-copy). Used with \`Atomics\` for synchronization. Performance-critical for game-like scenarios or heavy data processing.

I haven't used Web Workers in production React projects, but I used threading concepts heavily in game development (C++). For A's app Mini Apps, Web Workers could be valuable for:
- Parsing large message histories or contact lists without blocking UI.
- Running heavy validation or encryption logic.
- Prefetching and caching data in the background.

The main gotcha: \`postMessage\` serialization has overhead. For large data, use Transferable objects (\`ArrayBuffer\`) to avoid copying.`,
    },
  ],
};

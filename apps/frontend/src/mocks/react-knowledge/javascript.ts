import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const javascriptSection: KnowledgeSection = {
  id: "javascript",
  title: "JavaScript",
  icon: "FileCode",
  description: "JS foundations: memory model, execution model, core language features, and modern capabilities.",
  style: {
    iconColor: "text-yellow-500",
    headerBg: "bg-yellow-500/10 dark:bg-yellow-500/[0.08]",
    headerBorder: "border-yellow-500/20 dark:border-yellow-500/30",
    accentBorder: "border-yellow-500/50 dark:border-yellow-500/30",
    sidebarBg: "bg-yellow-500/10",
    sidebarText: "text-yellow-700 dark:text-yellow-300",
  },
  items: [
    {
      id: "js-call-stack",
      title: "Call Stack & Execution Context",
      summary: "The mechanism of JS executing code frame by frame on a single-threaded stack.",
      tags: ["engine", "runtime", "hoisting"],
      body: "JavaScript is single-threaded — all code executes on a single Call Stack. Each time a function is called, a new Execution Context is created and pushed onto the stack. When the function returns, its context is popped off.\n\nEach Execution Context consists of: a Variable Environment (var, function declarations), a Lexical Environment (let, const, inner functions), and a reference to the outer scope (scope chain). The Creation Phase occurs before code execution — this is when hoisting takes place: function declarations are hoisted to the top of their scope with their actual value, while var declarations are hoisted and initialized with undefined.",
      subtopics: [
        {
          title: "Hoisting",
          body: "var and function declarations are hoisted to the top of their scope. let/const declarations are also hoisted but placed in the Temporal Dead Zone (TDZ) — accessing them before definition throws a ReferenceError.",
          codeExample: {
            language: "javascript",
            code: `console.log(a); // undefined (var hoisted)
console.log(b); // ReferenceError (TDZ)
var a = 1;
let b = 2;

greet(); // "Hello" — function declaration hoisted fully
function greet() { console.log("Hello"); }`,
          },
        },
        {
          title: "Stack Overflow",
          body: "The stack has a size limit. Recursion without a base case triggers a 'Maximum call stack size exceeded' error. Solutions: use trampolining or convert to iteration.",
        },
        {
          title: "Concurrency & Call Stack Dependency",
          body: "Because JavaScript is single-threaded and has only one Call Stack, the Event Loop cannot execute callbacks from the task queues (microtasks/macrotasks) or run rendering updates until the Call Stack is completely empty. If a synchronous operation blocks the Call Stack, all asynchronous execution and UI interactivity are blocked, leading to a frozen interface.",
        },
      ],
      codeExample: {
        language: "javascript",
        code: `function outer() {
  let x = 10;
  function inner() {
    console.log(x); // accesses outer's Lexical Environment
  }
  inner();
}
outer();
// Call stack: [global] → [outer] → [inner] → [outer] → [global]`,
      },
    },
    {
      id: "js-event-loop",
      title: "Event Loop",
      summary: "The mechanism coordinating the Call Stack, Microtask Queue, and Macrotask Queue to handle asynchronous tasks.",
      tags: ["async", "concurrency", "microtask", "macrotask"],
      body: "The Event Loop continuously checks if the Call Stack is empty; if so, it takes tasks from the queues to execute.\n\n**Microtask Queue** (higher priority): Promise callbacks (.then/.catch/.finally), queueMicrotask(), and MutationObserver. The entire microtask queue is drained completely before the Event Loop moves to the next macrotask or rendering phase.\n\n**Macrotask Queue** (Task Queue): setTimeout, setInterval, setImmediate (Node.js), I/O callbacks, and MessageChannel. The Event Loop processes only one macrotask at a time, drains the microtask queue, performs rendering (in browsers) if needed, and then grabs the next macrotask.\n\n**requestAnimationFrame**: runs between the macrotask execution and the rendering phase, ensuring callbacks run immediately before each repaint (~60fps).",
      subtopics: [
        {
          title: "Execution Order",
          body: "Synchronous script → Microtasks → Render → Macrotask → Microtasks → Render → ...",
          codeExample: {
            language: "javascript",
            code: `console.log("1 sync");

setTimeout(() => console.log("4 macrotask"), 0);

Promise.resolve()
  .then(() => console.log("2 microtask"))
  .then(() => console.log("3 microtask"));

console.log("1 sync end");
// Output: 1 sync → 1 sync end → 2 microtask → 3 microtask → 4 macrotask`,
          },
        },
        {
          title: "queueMicrotask vs Promise.resolve()",
          body: "queueMicrotask() is the standard API to schedule a microtask without creating a Promise. Use it when you need to defer a callback to the end of the current task but before any macrotasks execute.",
        },
      ],
    },
    {
      id: "js-memory",
      title: "Memory & Garbage Collection",
      summary: "How JS allocates memory and reclaims unreferenced objects.",
      tags: ["memory", "GC", "leak", "heap"],
      body: "The JS engine allocates memory across two main areas:\n- **Stack**: Stores primitive values (number, boolean, small strings) and references. It automatically frees up memory when the execution context ends.\n- **Heap**: Stores objects, arrays, and functions. It is managed by the Garbage Collector.\n\nV8 uses the **Mark-and-Sweep** algorithm: it periodically traverses from GC Roots (global object, stack) to mark all reachable objects, then sweeps to release unmarked objects.\n\nV8 also employs **Generational GC**: dividing the heap into a Young Generation (Eden + Survivor spaces, with frequent minor GCs) and an Old Generation (with less frequent major GCs). Objects that survive multiple minor GCs are promoted to the Old Generation.",
      subtopics: [
        {
          title: "Common Memory Leaks",
          body: "1. **Closures retaining large references**: Closures capture large variables even when they are no longer needed.\n2. **Detached DOM nodes**: Removing elements from the DOM while keeping references in JavaScript.\n3. **Uncleared event listeners**: Calling addEventListener without a corresponding removeEventListener.\n4. **Accidental global variables**: Assigning values without var/let/const, turning them into globals.\n5. **Uncleared timers**: A setInterval callback holding a closure reference to outer variables.",
          codeExample: {
            language: "javascript",
            code: `// Leak: closure keeps reference to a large array
function leaky() {
  const bigArray = new Array(1_000_000).fill("x");
  return function() {
    // bigArray is captured even though it's not used
    console.log("done");
  };
}

// Fix: release after use
function fixed() {
  let bigArray = new Array(1_000_000).fill("x");
  const result = process(bigArray);
  bigArray = null; // allow GC
  return result;
}`,
          },
        },
        {
          title: "WeakMap & WeakRef",
          body: "WeakMap/WeakSet hold weak references, meaning they do not prevent GC from reclaiming keys. Used to store metadata associated with objects without causing memory leaks. WeakRef allows keeping a weak reference to an object to check if it still exists.",
        },
      ],
    },
    {
      id: "js-scope-closure",
      title: "Scope & Closure",
      summary: "Lexical scoping and how closures capture variables from their outer scope.",
      tags: ["scope", "closure", "lexical", "IIFE"],
      body: '"Lexical Scope": Variable scope is determined at write-time (static), not at runtime. Inner scopes can access outer scopes, but not vice-versa.\n\n"Closure" is a function combined with the lexical environment in which it was defined. The function "remembers" all variables in its scope chain, even after the outer function has returned.',
      subtopics: [
        {
          title: "Closure use-cases",
          body: "1. Data encapsulation / private variables\n2. Function factories (creating functions with pre-configured settings)\n3. Memoization\n4. Partial application / currying\n5. Module pattern (before native ES modules)",
          codeExample: {
            language: "javascript",
            code: `// Private counter via closure
function makeCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
const c = makeCounter(10);
c.increment(); // 11 — count is not accessible from the outside`,
          },
        },
        {
          title: "Closure pitfall: loop + var",
          body: "var lacks block scope — every loop iteration shares the same variable. Fix: use let (block-scoped) or an IIFE to create a new scope.",
          codeExample: {
            language: "javascript",
            code: `// Bug: prints 3, 3, 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Fix 1: let (block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}

// Fix 2: IIFE
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}`,
          },
        },
      ],
    },
    {
      id: "js-prototype",
      title: "Prototype & Inheritance",
      summary: "The prototype chain in JS and how class syntax acts as syntactic sugar over it.",
      tags: ["prototype", "OOP", "inheritance", "class"],
      body: "Every object in JS has an internal `[[Prototype]]` slot pointing to its parent object (or null). When accessing a property that does not exist on the object, JS traverses up the prototype chain until it finds the property or hits null.\n\n`Object.getPrototypeOf(obj)` retrieves the prototype. `Object.create(proto)` creates a new object with the specified prototype.\n\n**class syntax** (ES6) is syntactic sugar over prototypes — there are no actual class entities in JS. `extends` configures the prototype chain, and `super()` calls the parent constructor.",
      subtopics: [
        {
          title: "instanceof and prototype chain",
          body: "`instanceof` checks if `Constructor.prototype` exists anywhere in the object's prototype chain. Can be broken in cross-realm scenarios (iframes, VM environments).",
          codeExample: {
            language: "javascript",
            code: `class Animal {
  speak() { return "..."; }
}
class Dog extends Animal {
  speak() { return "Woof"; }
}

const d = new Dog();
console.log(d instanceof Dog);    // true
console.log(d instanceof Animal); // true

// Prototype chain: d → Dog.prototype → Animal.prototype → Object.prototype → null
console.log(Object.getPrototypeOf(d) === Dog.prototype); // true`,
          },
        },
        {
          title: "Object.create vs new",
          body: "`Object.create(proto)` creates an object with the specified prototype without executing the constructor. Useful for pure prototypal inheritance without classes.",
        },
      ],
    },
    {
      id: "js-es6",
      title: "ES6+ Modern Features",
      summary: "Key features introduced from ES2015 onwards.",
      tags: ["ES6", "async/await", "destructuring", "generators", "Proxy"],
      body: "ES6 and subsequent updates brought many features that improve both DX and language capabilities.",
      subtopics: [
        {
          title: "Destructuring, Spread, Rest",
          body: "Destructuring allows unpacking values from arrays/objects. Spread (...) copies elements. Rest (...) gathers remaining parameters/elements.",
          codeExample: {
            language: "javascript",
            code: `// Object destructuring with rename + default
const { name: userName = "Guest", age } = user;

// Array destructuring with skip
const [first, , third] = [1, 2, 3];

// Spread clone (shallow)
const newArr = [...arr, 4, 5];
const newObj = { ...obj, updated: true };

// Rest params
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }`,
          },
        },
        {
          title: "Optional Chaining & Nullish Coalescing",
          body: "`?.` short-circuits and returns undefined if the left-hand side is null/undefined. `??` returns the right-hand side only if the left-hand side is null/undefined (unlike `||` which evaluates all falsy values).",
          codeExample: {
            language: "javascript",
            code: `const street = user?.address?.street; // undefined if missing
const port = config.port ?? 3000;      // 3000 only when config.port is null/undefined
const count = data.count ?? 0;         // 0 if null/undefined, preserves if 0`,
          },
        },
        {
          title: "async/await & Promise",
          body: "async/await is syntactic sugar over Promises. An async function always returns a Promise. await pauses the execution of the async function (non-blocking) until the Promise resolves or rejects.",
          codeExample: {
            language: "javascript",
            code: `async function fetchUser(id: string) {
  try {
    const res = await fetch(\`/api/users/\${id}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } catch (err) {
    console.error("Failed:", err);
    throw err;
  }
}

// Parallel fetching
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);`,
          },
        },
        {
          title: "Generators & Iterators",
          body: "A generator function (function*) can pause and resume execution via yield. It returns an Iterator object. Used for lazy sequences, infinite data streams, and serves as the foundation for async generators.",
          codeExample: {
            language: "javascript",
            code: `function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}
console.log([...range(0, 10, 2)]); // [0, 2, 4, 6, 8]

// Async generator
async function* streamLines(url) {
  const reader = (await fetch(url)).body.getReader();
  for await (const chunk of readChunks(reader)) yield chunk;
}`,
          },
        },
        {
          title: "Proxy & Reflect",
          body: "Proxy wraps an object to intercept operations (get, set, has, deleteProperty...). Reflect provides methods corresponding to internal slots. Used for reactivity systems (e.g. Vue 3), validation, and logging.",
          codeExample: {
            language: "javascript",
            code: `const handler = {
  get(target, key) {
    console.log(\`Getting \${String(key)}\`);
    return Reflect.get(target, key);
  },
  set(target, key, value) {
    if (typeof value !== "number") throw new TypeError("Must be number");
    return Reflect.set(target, key, value);
  },
};
const proxy = new Proxy({}, handler);
proxy.age = 25;   // OK
proxy.age = "25"; // TypeError`,
          },
        },
      ],
    },
    {
      id: "js-this",
      title: "this & Binding",
      summary: "How 'this' is resolved at runtime according to 4 binding rules.",
      tags: ["this", "bind", "call", "apply", "arrow"],
      body: "The value of `this` is determined not by where a function is defined, but by **how it is called** (except for arrow functions). There are 4 binding rules in order of priority:\n\n1. **new binding**: `new Foo()` → this is the newly created object.\n2. **Explicit binding**: `fn.call(obj)`, `fn.apply(obj)`, `fn.bind(obj)` → this is obj.\n3. **Implicit binding**: `obj.fn()` → this is obj.\n4. **Default binding**: `fn()` → this is global (undefined in strict mode).\n\n**Arrow functions** do not have their own `this` — they lexically inherit `this` from their enclosing scope when defined.",
      codeExample: {
        language: "javascript",
        code: `class Timer {
  constructor() { this.ticks = 0; }

  // Bug: regular function — 'this' loses binding inside callback
  startBug() {
    setInterval(function() { this.ticks++; }, 1000); // this = undefined
  }

  // Fix: arrow function — lexically inherits 'this' from Timer instance
  startFix() {
    setInterval(() => { this.ticks++; }, 1000); // this = Timer instance
  }
}

// bind
const greet = function(greeting) { return \`\${greeting}, \${this.name}\`; };
const boundGreet = greet.bind({ name: "Alice" });
boundGreet("Hello"); // "Hello, Alice"`,
      },
    },
  ],
};

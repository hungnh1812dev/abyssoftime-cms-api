import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const typescriptSection: KnowledgeSection = {
  id: "typescript",
  title: "TypeScript",
  icon: "Braces",
  description: "TypeScript's static type system: from fundamentals to advanced concepts.",
  style: {
    iconColor: "text-blue-500",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/[0.08]",
    headerBorder: "border-blue-500/20 dark:border-blue-500/30",
    accentBorder: "border-blue-500/50 dark:border-blue-500/30",
    sidebarBg: "bg-blue-500/10",
    sidebarText: "text-blue-700 dark:text-blue-300",
  },
  items: [
    {
      id: "ts-fundamentals",
      title: "Type System Fundamentals",
      summary: "Structural typing, type vs interface, union/intersection, and literal types.",
      tags: ["type", "interface", "union", "intersection"],
      body: "TypeScript uses **structural typing** (duck typing) — if two types have the same shape, they are compatible, regardless of explicit inheritance. This contrasts with nominal typing (as in Java or C#).\n\n**type vs interface**:\n- `interface` only describes object shapes, and supports extension and declaration merging.\n- `type` is more flexible: it supports unions, intersections, mapped types, and conditional types.\n- Best practice: Use `interface` for object/class contracts, and `type` for unions and utility types.",
      subtopics: [
        {
          title: "Union & Intersection",
          body: "`A | B` — the value is of type A or B (or both). `A & B` — the value must satisfy both A and B. Intersections are commonly used to merge object types.",
          codeExample: {
            language: "typescript",
            code: `type Result<T> = { data: T; error: null } | { data: null; error: Error };

type WithId = { id: string };
type WithTimestamp = { createdAt: Date };
type Entity = WithId & WithTimestamp; // must have both id and createdAt`,
          },
        },
        {
          title: "Literal Types & Template Literals",
          body: "Literal types narrow a type down to a specific value. Template literal types combine and manipulate string literals.",
          codeExample: {
            language: "typescript",
            code: `type Direction = "north" | "south" | "east" | "west";
type EventName = \`on\${Capitalize<string>}\`;  // "onClick", "onChange", ...
type CSSUnit = \`\${number}px\` | \`\${number}rem\` | \`\${number}%\`;`,
          },
        },
      ],
    },
    {
      id: "ts-generics",
      title: "Generics",
      summary: "Writing reusable code with type parameters, constraints, and conditional types.",
      tags: ["generics", "constraints", "infer", "conditional"],
      body: "Generics allow you to write code that works with multiple data types while retaining type safety. The type parameter can be inferred automatically or specified explicitly.",
      subtopics: [
        {
          title: "Constraints with extends",
          body: "`T extends SomeType` restricts T to be a subtype of SomeType.",
          codeExample: {
            language: "typescript",
            code: `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function firstElement<T extends { length: number }>(arr: T): T[number] | undefined {
  return arr[0];
}`,
          },
        },
        {
          title: "Conditional Types & infer",
          body: "`T extends U ? X : Y` — a type-level equivalent of the ternary operator. `infer` is used within conditional types to extract nested types.",
          codeExample: {
            language: "typescript",
            code: `// Unwrap Promise
type Awaited<T> = T extends Promise<infer R> ? Awaited<R> : T;

// Extract return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Flatten array
type Flatten<T> = T extends Array<infer Item> ? Item : T;`,
          },
        },
        {
          title: "Mapped Types",
          body: "Creates a new type by transforming each key of an existing type.",
          codeExample: {
            language: "typescript",
            code: `type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Remap keys with as
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};`,
          },
        },
      ],
    },
    {
      id: "ts-utility-types",
      title: "Utility Types",
      summary: "Built-in generic types that help transform and compose types.",
      tags: ["Partial", "Pick", "Omit", "Record", "ReturnType"],
      body: "TypeScript provides various utility types to manipulate types without rewriting them from scratch.",
      codeExample: {
        language: "typescript",
        code: `interface User { id: string; name: string; email: string; role: "admin" | "user"; }

type CreateUser = Omit<User, "id">;                    // remove id
type UpdateUser = Partial<Pick<User, "name" | "email">>; // name/email optional
type UserRecord = Record<string, User>;                 // map id → User
type AdminUser = Extract<User["role"], "admin">;        // "admin"

// Function utilities
function fetchUser(id: string): Promise<User> { ... }
type FetchFn = typeof fetchUser;
type FetchReturn = ReturnType<FetchFn>;    // Promise<User>
type FetchParams = Parameters<FetchFn>;   // [string]`,
      },
    },
    {
      id: "ts-type-guards",
      title: "Type Guards & Narrowing",
      summary: "Narrowing types at runtime so TypeScript understands the type precisely.",
      tags: ["narrowing", "typeof", "instanceof", "discriminated union"],
      body: "TypeScript analyzes control flow to automatically narrow types within conditional branches. You can also define custom type guards to assist the compiler.",
      subtopics: [
        {
          title: "Discriminated Unions",
          body: "The most robust pattern for type narrowing: each variant shares a common literal field (discriminant) to distinguish them.",
          codeExample: {
            language: "typescript",
            code: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":   return Math.PI * s.radius ** 2;
    case "rect":     return s.width * s.height;
    case "triangle": return 0.5 * s.base * s.height;
  }
}`,
          },
        },
        {
          title: "Custom Type Guards & Assertion Functions",
          body: "`is` predicate: returns a boolean and narrows the type in the truthy branch. Assertion function: throws if the condition is false, allowing TS to narrow the type after the call.",
          codeExample: {
            language: "typescript",
            code: `function isError(val: unknown): val is Error {
  return val instanceof Error;
}

function assertNonNull<T>(val: T): asserts val is NonNullable<T> {
  if (val == null) throw new Error("Unexpected null");
}

// Usage
const maybeError: unknown = getError();
if (isError(maybeError)) {
  console.log(maybeError.message); // TS knows it's Error here
}`,
          },
        },
      ],
    },
    {
      id: "ts-advanced",
      title: "Advanced Types",
      summary: "Variance, recursive types, template literals, and other advanced patterns.",
      tags: ["variance", "recursive", "branded types", "satisfies"],
      body: "Advanced type-level programming techniques that help encode business logic directly into the type system.",
      subtopics: [
        {
          title: "Branded / Nominal Types",
          body: "Since TypeScript uses structural typing, `type UserId = string` and `string` are fully compatible. Branded types create a nominal identity to distinguish them.",
          codeExample: {
            language: "typescript",
            code: `type Brand<T, B> = T & { readonly _brand: B };
type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;

function getUser(id: UserId) { ... }

const uid = "abc" as UserId;
const pid = "abc" as PostId;
getUser(uid); // OK
getUser(pid); // Error: PostId is not assignable to UserId`,
          },
        },
        {
          title: "satisfies operator (TS 4.9+)",
          body: "`satisfies` validates that a value matches a type without widening the inferred type — giving you both type safety and precise type inference.",
          codeExample: {
            language: "typescript",
            code: `const config = {
  port: 3000,
  host: "localhost",
} satisfies Record<string, string | number>;

// config.port is still narrowed to 3000, not widened to number
config.port.toFixed(); // OK — TS knows it's number
config.host.toUpperCase(); // OK — TS knows it's string`,
          },
        },
        {
          title: "Recursive Types",
          body: "Types can reference themselves to describe recursive data structures such as trees, linked lists, or JSON.",
          codeExample: {
            language: "typescript",
            code: `type JSONValue =
  | string | number | boolean | null
  | JSONValue[]
  | { [key: string]: JSONValue };

type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};`,
          },
        },
      ],
    },
    {
      id: "ts-config",
      title: "TypeScript Configuration",
      summary: "Key configuration flags in tsconfig.json that affect type-checking behavior.",
      tags: ["tsconfig", "strict", "module", "declaration"],
      body: "tsconfig.json controls how TypeScript compiles and type-checks your code.",
      codeExample: {
        language: "json",
        code: `{
  "compilerOptions": {
    // Strict flags (enable all with "strict": true)
    "strict": true,              // enable all strict checks
    "noImplicitAny": true,       // error when type is implicitly any
    "strictNullChecks": true,    // null/undefined cannot be implicitly assigned
    "noUncheckedIndexedAccess": true, // arr[i] returns T | undefined

    // Module
    "module": "ESNext",
    "moduleResolution": "Bundler", // Next.js / Vite
    "paths": { "@/*": ["./src/*"] },

    // Output
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "declaration": true,         // generate .d.ts files

    // Quality
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}`,
      },
    },
  ],
};

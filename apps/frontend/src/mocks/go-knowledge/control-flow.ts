import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const controlFlowSection: KnowledgeSection = {
  id: "control-flow",
  title: "Control Flow",
  icon: "Workflow",
  description: "if/for/switch/select, labeled break/continue, and defer/panic/recover.",
  style: {
    iconColor: "text-orange-500",
    headerBg: "bg-orange-500/10 dark:bg-orange-500/[0.08]",
    headerBorder: "border-orange-500/20 dark:border-orange-500/30",
    accentBorder: "border-orange-500/50 dark:border-orange-500/30",
    sidebarBg: "bg-orange-500/10",
    sidebarText: "text-orange-700 dark:text-orange-300",
  },
  items: [
    {
      id: "go-if-statement",
      title: "if / else",
      summary: "`if` supports an optional init statement scoped to the branch; there's no ternary operator.",
      tags: ["if", "else", "init statement"],
      body: "Go's `if` doesn't require parentheses around the condition, but the opening `{` must be on the same line as the condition (gofmt enforces this). An `if` can carry an **init statement** before the condition, scoping a variable to the `if`/`else` chain only — the idiomatic pattern for the `value, err := doSomething(); err != nil` check.\n\nGo has **no ternary operator** (`cond ? a : b`) — an `if`/`else` assigning to a variable, or a small helper function, is the idiomatic replacement.",
      codeExample: {
        language: "go",
        code: `if x > 10 {
    fmt.Println("big")
} else if x > 0 {
    fmt.Println("small")
} else {
    fmt.Println("non-positive")
}

// init statement — err is scoped to this if/else only
if value, err := doSomething(); err != nil {
    return err
} else {
    fmt.Println(value)
}`,
      },
    },
    {
      id: "go-for-loop",
      title: "for (Go's Only Loop Keyword)",
      summary: "`for` covers while-loops, infinite loops, and C-style three-clause loops — Go has no other loop keyword.",
      tags: ["for", "while", "loop"],
      body: "Go has no `while`, `do-while`, or separate infinite-loop keyword — `for` covers all of them via its four forms: the three-clause `for init; cond; post {}`, a condition-only `for cond {}` (equivalent to `while`), a bare `for {}` (infinite loop, exit via `break`), and `for range` (see the next entry).",
      codeExample: {
        language: "go",
        code: `for i := 0; i < 10; i++ { /* three-clause */ }

i := 0
for i < 10 { i++ }           // condition-only == "while"

for { break }                  // infinite, exits via break/return`,
      },
      subtopics: [
        {
          title: "Labeled break/continue for nested loops",
          body: 'A label before a `for`/`switch`/`select` lets `break Label`/`continue Label` target an outer loop from inside a nested one — Go has no unlabeled "break 2 levels" syntax.',
          codeExample: {
            language: "go",
            code: `Outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if j == 1 {
            continue Outer // continues the i loop, not the j loop
        }
    }
}`,
          },
        },
      ],
    },
    {
      id: "go-range",
      title: "for range",
      summary: "`for range` iterates slices, arrays, maps, strings, channels, and (Go 1.22+) integers.",
      tags: ["range", "iteration"],
      body: "`range` yields different pairs depending on the type: `(index, value)` for slices/arrays, `(key, value)` for maps (iteration order is **randomized** by the runtime, intentionally, to prevent code from depending on it), `(byteIndex, rune)` for strings (UTF-8 decoded), and just a received value for channels.\n\nSince **Go 1.22**, `for i := range n` (with `n` an integer) iterates `0` to `n-1` — a built-in replacement for the old `for i := 0; i < n; i++` idiom.",
      codeExample: {
        language: "go",
        code: `nums := []int{10, 20, 30}
for i, v := range nums { fmt.Println(i, v) }

m := map[string]int{"a": 1, "b": 2}
for k, v := range m { fmt.Println(k, v) } // order is randomized

for i := range 5 { fmt.Println(i) } // Go 1.22+: 0,1,2,3,4`,
      },
      subtopics: [
        {
          title: "Loop variable capture — fixed in Go 1.22",
          body: "Before Go 1.22, `range` reused a single loop variable across iterations, so a closure or goroutine capturing it inside the loop body saw only its final value after the loop finished. Go 1.22+ creates a fresh variable per iteration, eliminating this classic footgun. Code targeting older Go versions still needs the `v := v` workaround.",
          codeExample: {
            language: "go",
            code: `// Pre-1.22 footgun (fixed in 1.22+):
for _, v := range []int{1, 2, 3} {
    go func() { fmt.Println(v) }() // pre-1.22: often prints 3,3,3
}`,
          },
        },
      ],
    },
    {
      id: "go-switch",
      title: "switch",
      summary: "Go's `switch` auto-breaks (no fallthrough by default), supports an expressionless form, and type switches.",
      tags: ["switch", "case", "fallthrough", "type switch"],
      body: "Unlike C/JS, a Go `case` does **not** fall through to the next one automatically — each case breaks implicitly. Use the explicit `fallthrough` keyword on the rare occasion you want C-style fall-through behavior.\n\nAn **expressionless switch** (`switch { case cond1: ...}`) is a cleaner alternative to a long `if`/`else if` chain. A **type switch** (`switch v := x.(type) {}`) branches on the dynamic type held by an `interface{}`/`any` value.",
      codeExample: {
        language: "go",
        code: `switch day {
case "Mon", "Tue", "Wed", "Thu", "Fri":
    fmt.Println("weekday")
case "Sat", "Sun":
    fmt.Println("weekend")
default:
    fmt.Println("unknown")
}

switch { // expressionless — reads like if/else if
case x > 100:
    fmt.Println("big")
case x > 0:
    fmt.Println("small")
}

switch v := x.(type) { // type switch
case int:
    fmt.Println("int:", v)
case string:
    fmt.Println("string:", v)
default:
    fmt.Println("other type")
}`,
      },
    },
    {
      id: "go-select",
      title: "select",
      summary: "`select` waits on multiple channel operations, running whichever is ready first — the concurrency counterpart to `switch`.",
      tags: ["select", "channel", "concurrency"],
      body: "`select` blocks until one of its `case`s (each a send or receive on a channel) is ready, then runs that case. If multiple are ready simultaneously, one is chosen at random (not first-listed) — this prevents starvation. A `default` case makes the `select` non-blocking, returning immediately if no channel is ready. See the Concurrency section for full goroutine/channel context.",
      codeExample: {
        language: "go",
        code: `select {
case msg := <-ch1:
    fmt.Println("from ch1:", msg)
case ch2 <- "ping":
    fmt.Println("sent to ch2")
case <-time.After(1 * time.Second):
    fmt.Println("timeout")
default:
    fmt.Println("nothing ready, non-blocking")
}`,
      },
    },
    {
      id: "go-defer",
      title: "defer",
      summary: "`defer` schedules a function call to run when the surrounding function returns — LIFO order, arguments evaluated immediately.",
      tags: ["defer", "cleanup", "LIFO"],
      body: "`defer` is Go's idiom for guaranteed cleanup (closing files, unlocking mutexes, closing HTTP response bodies) regardless of how the function returns — normally or via `panic`. Multiple `defer`s in one function run in **LIFO order** (last deferred, first executed).\n\nA subtlety: the deferred function's **arguments are evaluated immediately** when the `defer` statement runs, not when the deferred call actually executes — only the call itself is delayed.",
      codeExample: {
        language: "go",
        code: `func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // guaranteed to run on any return path

    // ... use f ...
    return nil
}

func example() {
    for i := 0; i < 3; i++ {
        defer fmt.Println(i) // arguments evaluated now: prints 2, 1, 0
    }
}`,
      },
    },
    {
      id: "go-panic-recover",
      title: "panic / recover",
      summary: "`panic` stops normal execution; `recover` (only inside a deferred function) regains control — Go's rarely-used exception mechanism.",
      tags: ["panic", "recover", "exception"],
      body: "Go's primary error-handling idiom is returning an `error` value, **not** exceptions (see the Error Handling section). `panic` is reserved for truly unrecoverable situations (programmer bugs like an out-of-bounds index, or startup-time failures where continuing is meaningless) — it unwinds the stack, running deferred calls along the way, and crashes the program unless something `recover()`s.\n\n`recover()` only has an effect when called **directly inside a deferred function** — calling it anywhere else always returns `nil`. A common pattern wraps a goroutine or an HTTP handler with a deferred recover to prevent one panic from crashing the whole process.",
      codeExample: {
        language: "go",
        code: `func safeCall(fn func()) {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("recovered from panic:", r)
        }
    }()
    fn()
}

safeCall(func() { panic("boom") }) // prints "recovered from panic: boom", program continues`,
      },
      subtopics: [
        {
          title: "An unrecovered panic in any goroutine crashes the entire process",
          body: "Unlike an unhandled exception in some languages that might only kill one thread, a `panic` that reaches the top of a goroutine's stack without being recovered terminates the whole program — every goroutine that spawns background work should consider its own recover.",
        },
      ],
    },
  ],
};

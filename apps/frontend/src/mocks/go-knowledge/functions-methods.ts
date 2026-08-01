import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const functionsMethodsSection: KnowledgeSection = {
  id: "functions-methods",
  title: "Functions & Methods",
  icon: "Braces",
  description: "Multiple returns, named returns, variadic args, closures, first-class functions, methods, and value vs. pointer receivers.",
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
      id: "go-multiple-returns",
      title: "Multiple Return Values",
      summary: "Go functions can return multiple values — the idiomatic basis for the `(value, error)` pattern.",
      tags: ["multiple returns", "error handling"],
      body: "Unlike most C-family languages, a Go function can return more than one value directly, without wrapping them in a tuple or struct. This underlies Go's most common idiom: a function that might fail returns `(T, error)`, and the caller checks `err != nil` immediately after the call.",
      codeExample: {
        language: "go",
        code: `func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 2)
if err != nil {
    log.Fatal(err)
}`,
      },
    },
    {
      id: "go-named-returns",
      title: "Named Returns & Naked Return",
      summary: "Return values can be named in the signature; a bare `return` returns their current values.",
      tags: ["named returns", "naked return"],
      body: "Naming return values (`func f() (result int, err error)`) declares them as local variables initialized to their zero values, usable inside the function body. A bare `return` (a **naked return**) returns their current values.\n\nNaked returns are convenient for short functions but hurt readability in longer ones — the reader has to scroll back to the signature to know what's being returned. Idiomatic Go uses them sparingly, mostly in short functions or when a `defer` needs to modify a named return value before the function actually returns.",
      codeExample: {
        language: "go",
        code: `func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // naked return: returns x, y
}

func doWork() (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r) // modifies the named return
        }
    }()
    return nil
}`,
      },
    },
    {
      id: "go-variadic",
      title: "Variadic Parameters",
      summary: "`...T` accepts a variable number of arguments as a `[]T`; `slice...` spreads a slice into one.",
      tags: ["variadic", "..."],
      body: "A variadic parameter (must be the last parameter) lets callers pass zero or more arguments of that type, which the function sees as a `[]T`. To pass an existing slice's elements as variadic arguments, spread it with `slice...` — you cannot pass a `[]T` directly to a `...T` parameter without spreading it.",
      codeExample: {
        language: "go",
        code: `func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

sum(1, 2, 3)           // nums == []int{1, 2, 3}
nums := []int{4, 5, 6}
sum(nums...)              // spread: nums... unpacks the slice`,
      },
    },
    {
      id: "go-closures",
      title: "Closures",
      summary: "Functions declared inside another function capture surrounding variables by reference, not by value.",
      tags: ["closure", "function literal"],
      body: "An anonymous function (function literal) defined inside another function forms a **closure** over the variables it references from the enclosing scope. Crucially, it captures those variables **by reference** — if the closure mutates a captured variable, or the enclosing function does after creating the closure, both see the same underlying variable (the same mechanism behind the pre-Go-1.22 loop-variable footgun in the Control Flow section).",
      codeExample: {
        language: "go",
        code: `func counter() func() int {
    count := 0
    return func() int { // closes over count
        count++
        return count
    }
}

next := counter()
fmt.Println(next()) // 1
fmt.Println(next()) // 2 — count persists between calls`,
      },
    },
    {
      id: "go-first-class-functions",
      title: "First-Class Functions",
      summary: "Functions are values — assignable to variables, passable as arguments, and returnable from other functions.",
      tags: ["first-class functions", "higher-order functions"],
      body: "A function's type is its signature (e.g. `func(int, int) int`). This makes functions **first-class values**: store one in a variable, pass one as a callback/comparator (`sort.Slice`'s `less` function, `http.HandlerFunc`), or return one from a factory function (as `counter()` does above) — Go's basis for higher-order functions without a dedicated functional-programming syntax.",
      codeExample: {
        language: "go",
        code: `type BinOp func(int, int) int

func apply(a, b int, op BinOp) int {
    return op(a, b)
}

add := func(a, b int) int { return a + b }
fmt.Println(apply(3, 4, add)) // 7`,
      },
    },
    {
      id: "go-methods",
      title: "Methods",
      summary: "A method is a function with a receiver argument, associating it with a named type.",
      tags: ["method", "receiver"],
      body: 'Go has no classes — instead, any named type (usually a `struct`, but any defined type works) can have **methods**: functions declared with a receiver `(t T)` before the function name. Methods are called with the familiar `value.Method()` syntax but are just sugar over a regular function taking the receiver as its first argument.\n\nA method can only be defined on a type declared in the **same package** — you can\'t add methods to types from another package (including built-ins like `int` or third-party types), a deliberate constraint that avoids the "monkey-patching" ambiguity seen in some other languages.',
      codeExample: {
        language: "go",
        code: `type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

rect := Rectangle{Width: 3, Height: 4}
fmt.Println(rect.Area()) // 12`,
      },
    },
    {
      id: "go-value-vs-pointer-receiver",
      title: "Value vs. Pointer Receivers",
      summary: "A value receiver operates on a copy; a pointer receiver operates on the original — use pointer receivers to mutate or avoid copying large structs.",
      tags: ["pointer receiver", "value receiver"],
      body: "`func (r Rectangle) Area() float64` (value receiver) receives a **copy** of the struct — mutations inside the method are invisible to the caller. `func (r *Rectangle) Scale(f float64)` (pointer receiver) receives a pointer to the original — mutations persist.\n\n**Convention**: if any method on a type needs a pointer receiver (to mutate, or because the struct is large enough that copying is wasteful), make **all** methods on that type use pointer receivers, for consistency.\n\nGo auto-converts between `t.Method()` and `(&t).Method()` for addressable values — except a **value stored in an interface** is not addressable, so a type with only pointer-receiver methods must be used as `*T` to satisfy an interface, not `T`.",
      codeExample: {
        language: "go",
        code: `func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

rect := Rectangle{Width: 3, Height: 4}
rect.Scale(2) // Go automatically takes &rect here
fmt.Println(rect) // {6 8}`,
      },
      subtopics: [
        {
          title: "A nil pointer receiver doesn't necessarily panic",
          body: 'Calling a pointer-receiver method on a `nil` pointer is legal as long as the method body doesn\'t dereference the receiver — a common pattern for methods like `(t *Tree) String()` that check `if t == nil { return "<empty>" }` first.',
        },
      ],
    },
  ],
};

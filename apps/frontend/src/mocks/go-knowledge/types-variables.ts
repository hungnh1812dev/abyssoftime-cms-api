import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const typesVariablesSection: KnowledgeSection = {
  id: "types-variables",
  title: "Types & Variables",
  icon: "Binary",
  description: "var/:=/const, zero values, basic types, type conversion, pointers, and iota.",
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
      id: "go-var-declarations",
      title: "var, := and const",
      summary: "Declare variables with `var`, short declaration `:=`, or `const` for compile-time constants.",
      tags: ["var", ":=", "const", "short declaration"],
      body: "`var name Type = value` is the general form; the type can be omitted when inferable (`var name = value`), and the value can be omitted for a zero-valued declaration (`var name Type`). Inside a function body, `name := value` is shorthand for `var name = value` with an inferred type — it can only be used inside functions, never at package level.\n\n`const name = value` declares a compile-time constant; unlike `var`, its value must be knowable at compile time (no function calls, no runtime values).",
      codeExample: {
        language: "go",
        code: `var x int = 10
var y = 10        // type inferred: int
var z int          // zero value: 0
name := "Gopher"    // := only valid inside a function

const Pi = 3.14159`,
      },
      subtopics: [
        {
          title: "`:=` re-declares only if at least one new variable is introduced",
          body: "In `a, b := 1, 2` then later `a, c := 3, 4` in the same scope, `a` is reassigned (not redeclared) while `c` is newly declared — legal as long as at least one variable on the left is new.",
        },
      ],
    },
    {
      id: "go-zero-values",
      title: "Zero Values",
      summary: "Every type has a zero value — Go has no `undefined`; uninitialized variables are usable immediately.",
      tags: ["zero value", "nil"],
      body: 'Unlike JavaScript\'s `undefined`, every Go type has a well-defined **zero value** it takes when declared without an initializer: `0` for numeric types, `""` for `string`, `false` for `bool`, and `nil` for pointers, slices, maps, channels, functions, and interfaces.\n\nA zero-valued slice is often immediately usable (a `nil` slice has `len() == 0` and is safe to range over or `append` to) — but a `nil` **map** panics on write, and is only safe to read from.',
      codeExample: {
        language: "go",
        code: `var i int              // 0
var s string             // ""
var b bool                // false
var p *int                 // nil
var sl []int                // nil, but len(sl) == 0 and append(sl, 1) works
var m map[string]int         // nil — safe to read (m["x"] == 0), PANICS on write`,
      },
      subtopics: [
        {
          title: "nil map write panics",
          body: "Reading from a nil map returns the zero value safely; writing to one panics at runtime. Always `make(map[K]V)` before writing.",
        },
      ],
    },
    {
      id: "go-basic-types",
      title: "Basic Types",
      summary: "bool, string, sized integers/floats, byte and rune aliases, and platform-dependent int.",
      tags: ["int", "string", "byte", "rune", "float64"],
      body: "Go's basic types: `bool`; `string` (immutable, UTF-8 byte sequence); signed integers `int8`/`int16`/`int32`/`int64` and their `uint` counterparts; `float32`/`float64`; `complex64`/`complex128`.\n\n`int` and `uint` are platform-dependent — 32 or 64 bits depending on the target architecture (64-bit on virtually all modern deployment targets). Use a sized type (`int64`, `uint32`, ...) when the exact width matters.\n\n`byte` is an alias for `uint8` (raw byte data); `rune` is an alias for `int32` (a single Unicode code point) — iterating a `string` with `range` yields `rune`s, decoding UTF-8 automatically.",
      codeExample: {
        language: "go",
        code: `var ok bool = true
var name string = "Gopher"
var count int = 42          // 32 or 64 bits depending on platform
var id int64 = 42            // always 64 bits
var pi float64 = 3.14159

for i, r := range "héllo" { // range over string yields (byteIndex, rune)
    fmt.Printf("%d: %c\\n", i, r)
}`,
      },
    },
    {
      id: "go-type-conversion",
      title: "Type Conversion",
      summary: "Go requires explicit conversion between numeric types — there's no implicit widening or narrowing.",
      tags: ["type conversion", "strconv"],
      body: "Unlike C or JavaScript, Go never implicitly converts between numeric types, even between `int` and `int64` — you must write an explicit conversion `T(v)`. This eliminates a whole class of silent bugs from unexpected numeric coercion.\n\nString ⇄ number conversion isn't a type conversion at all — it goes through the `strconv` package (`strconv.Itoa`, `strconv.Atoi`, `strconv.ParseFloat`, ...), which can fail and returns an `error`.",
      codeExample: {
        language: "go",
        code: `var i int = 42
var f float64 = float64(i) // explicit conversion required
var u uint = uint(f)

s := strconv.Itoa(42)            // "42"
n, err := strconv.Atoi("42")      // 42, nil
if err != nil {
    // "42abc" would fail to parse — always check err
}`,
      },
    },
    {
      id: "go-pointers",
      title: "Pointers",
      summary: "`&` takes an address, `*` dereferences; Go has pointers but no pointer arithmetic.",
      tags: ["pointer", "&", "*", "new"],
      body: "Go passes everything **by value** by default — assigning a struct or passing it to a function copies it. A **pointer** (`*T`) holds the memory address of a `T`, letting a function mutate the caller's value or avoid copying a large struct.\n\n`&x` takes the address of `x`; `*p` dereferences a pointer `p` to read/write the pointed-to value. `new(T)` allocates a zeroed `T` and returns `*T`.\n\nUnlike C, Go has **no pointer arithmetic** — you can't do `p + 1` to walk memory. Combined with the garbage collector, this is what keeps Go memory-safe despite having pointers.",
      codeExample: {
        language: "go",
        code: `func increment(n *int) {
    *n++ // dereference and mutate the caller's int
}

x := 10
increment(&x)
fmt.Println(x) // 11`,
      },
    },
    {
      id: "go-iota",
      title: "iota (Enum Idiom)",
      summary: "`iota` generates auto-incrementing values inside a `const` block — Go's idiom for enums.",
      tags: ["iota", "const", "enum"],
      body: "Go has no dedicated `enum` keyword. The idiom is a `const` block using `iota`, which starts at `0` and increments by one for each `ConstSpec` line in the block. Defining a named type over `int` gives compile-time type safety — a function expecting a `Weekday` can't accidentally be passed a raw `int` or a different enum type.",
      codeExample: {
        language: "go",
        code: `type Weekday int

const (
    Sunday Weekday = iota // 0
    Monday                  // 1 (implicitly repeats "= iota")
    Tuesday                  // 2
    Wednesday                 // 3
)

// Bitmask idiom
type Flag uint
const (
    FlagRead Flag = 1 << iota // 1
    FlagWrite                   // 2
    FlagExecute                  // 4
)`,
      },
    },
    {
      id: "go-const-vs-var",
      title: "const vs. var: Untyped Constants",
      summary: "`const` values must be compile-time constant expressions; untyped constants have flexible precision until used.",
      tags: ["const", "untyped constant"],
      body: "A `const` initializer must be computable at compile time — no function calls (beyond a small set of built-ins), no reads of variables. This is stricter than `var`, which can be initialized from any runtime expression.\n\nAn **untyped constant** (`const Pi = 3.14159`, no explicit type) has arbitrary precision and adapts to whatever context it's used in — assigning it to a `float32` or `float64` variable both work without conversion. Once a constant is given an explicit type, it behaves like a typed value and requires explicit conversion to use as another type.",
      codeExample: {
        language: "go",
        code: `const MaxRetries = 3         // untyped constant
const Pi float64 = 3.14159    // typed constant

var f32 float32 = 3.14159      // OK: untyped literal adapts to float32
// var bad float32 = Pi        // ERROR: Pi is float64, needs explicit conversion`,
      },
    },
  ],
};

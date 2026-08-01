import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const structsInterfacesGenericsSection: KnowledgeSection = {
  id: "structs-interfaces-generics",
  title: "Structs, Interfaces & Generics",
  icon: "Boxes",
  description: "Struct embedding/composition, implicit interface satisfaction, type assertions, and Go 1.18+ generics & constraints.",
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
      id: "go-struct-basics",
      title: "Struct Basics",
      summary: "A struct groups named fields into one type; struct literals can be keyed or positional.",
      tags: ["struct", "struct literal"],
      body: "`type Point struct { X, Y int }` declares a struct type with named fields. Struct literals can be **keyed** (`Point{X: 1, Y: 2}`, field order doesn't matter, unset fields get their zero value) or **positional** (`Point{1, 2}`, must supply all fields in declaration order — brittle if the struct changes, so keyed literals are strongly preferred outside very small, stable structs).\n\nAn **anonymous struct** (`struct{ X, Y int }{1, 2}`) is occasionally useful for one-off groupings — e.g. table-driven test cases — without declaring a named type.",
      codeExample: {
        language: "go",
        code: `type Point struct {
    X, Y int
}

p1 := Point{X: 1, Y: 2} // keyed — preferred
p2 := Point{1, 2}         // positional — brittle
p3 := Point{}               // zero value: {0 0}

tests := []struct { // anonymous struct — common in table-driven tests
    input, want int
}{
    {input: 1, want: 2},
    {input: 2, want: 4},
}`,
      },
    },
    {
      id: "go-struct-embedding",
      title: "Struct Embedding",
      summary: "Embedding a type inside a struct promotes its fields and methods — Go's composition-over-inheritance mechanism.",
      tags: ["embedding", "composition"],
      body: 'Declaring a field with only a type name (no field name) **embeds** that type, promoting its fields and methods to the outer struct — they can be accessed as if they belonged to the outer struct directly. This is Go\'s replacement for inheritance: composition ("has-a") that reads like "is-a" at the call site, but is not polymorphic — an embedded `Animal` doesn\'t make `Dog` substitutable wherever an `Animal` is expected (that requires an interface, see below).',
      codeExample: {
        language: "go",
        code: `type Animal struct {
    Name string
}

func (a Animal) Describe() string {
    return "I am " + a.Name
}

type Dog struct {
    Animal // embedded — no field name
    Breed string
}

d := Dog{Animal: Animal{Name: "Rex"}, Breed: "Labrador"}
fmt.Println(d.Name)         // promoted field: "Rex"
fmt.Println(d.Describe())    // promoted method: "I am Rex"`,
      },
      subtopics: [
        {
          title: "Embedding is not inheritance",
          body: "`Dog` doesn't satisfy an interface requiring `Animal` specifically. If two embedded types promote a field/method with the same name, the outer struct must disambiguate explicitly (`d.Animal.Name`) — there's no automatic override resolution like class inheritance.",
        },
      ],
    },
    {
      id: "go-interfaces-implicit",
      title: "Interfaces Are Satisfied Implicitly",
      summary: "A type satisfies an interface automatically just by implementing its methods — no `implements` keyword.",
      tags: ["interface", "structural typing", "implicit"],
      body: "Go interfaces use **structural typing** (informally \"duck typing\", but checked at compile time): a type satisfies an interface simply by having all the methods the interface declares — there's no `class Dog implements Speaker` syntax. This means you can define an interface *after* the fact, around types you don't own (including stdlib types), as long as they already have the right methods — a key reason Go interfaces tend to be small and defined at the point of use, not alongside the implementing type.",
      codeExample: {
        language: "go",
        code: `type Speaker interface {
    Speak() string
}

type Dog struct{}
func (d Dog) Speak() string { return "Woof" }

type Cat struct{}
func (c Cat) Speak() string { return "Meow" }

func announce(s Speaker) {
    fmt.Println(s.Speak())
}

announce(Dog{}) // Dog satisfies Speaker with no explicit declaration
announce(Cat{})`,
      },
    },
    {
      id: "go-interface-design",
      title: "Interface Design Idioms",
      summary: 'Idiomatic Go favors small, single-method interfaces defined at the point of use — "accept interfaces, return structs."',
      tags: ["interface", "io.Reader", "io.Writer", "any", "Stringer"],
      body: "The stdlib's most-reused interfaces are tiny: `io.Reader` and `io.Writer` each declare exactly one method. Small interfaces are trivially satisfied by many types and easy to mock in tests. The community idiom \"accept interfaces, return concrete types\" means: a function's *parameters* should be the narrowest interface that covers what it needs, while its *return type* should usually be a concrete struct.\n\n`any` (an alias for `interface{}`, added in Go 1.18) is the empty interface — satisfied by every type. Overusing `any` throws away compile-time type safety; prefer a specific interface or generics (below) where possible.",
      codeExample: {
        language: "go",
        code: `type Reader interface {
    Read(p []byte) (n int, err error)
}

// fmt.Stringer — implement to customize how %v / Println formats a type
type Stringer interface {
    String() string
}

func (p Point) String() string {
    return fmt.Sprintf("(%d, %d)", p.X, p.Y)
}`,
      },
    },
    {
      id: "go-type-assertion",
      title: "Type Assertions",
      summary: "`v, ok := x.(T)` safely checks and extracts the concrete type behind an interface value.",
      tags: ["type assertion", "comma-ok"],
      body: "A **type assertion** `x.(T)` extracts the underlying concrete value from an interface `x`, asserting it holds a `T`. The single-value form (`v := x.(T)`) **panics** if `x` doesn't actually hold a `T` — safe only when you're certain of the type. The two-value \"comma-ok\" form (`v, ok := x.(T)`) never panics — `ok` is `false` and `v` is `T`'s zero value on a mismatch, making it the safe default. For branching across several possible types, a type switch (see Control Flow) is the idiomatic alternative to a chain of assertions.",
      codeExample: {
        language: "go",
        code: `var x any = "hello"

s := x.(string)          // OK, panics if x isn't a string
s, ok := x.(string)       // safe: ok == true, s == "hello"
n, ok := x.(int)           // safe: ok == false, n == 0 (no panic)`,
      },
    },
    {
      id: "go-generics-basics",
      title: "Generics Basics",
      summary: "Go 1.18+ generics let a function or type be parameterized over a type, written in square brackets.",
      tags: ["generics", "type parameters", "Go 1.18"],
      body: "Before Go 1.18, writing a function that worked over multiple types meant using `any`/`interface{}` and losing type safety, or code-generating per-type variants. **Type parameters** (`[T any]`) let a single function or type work over any type satisfying a constraint, with full compile-time type checking and no runtime type assertions needed.",
      codeExample: {
        language: "go",
        code: `func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

doubled := Map([]int{1, 2, 3}, func(n int) int { return n * 2 })
labels := Map([]int{1, 2, 3}, func(n int) string { return fmt.Sprintf("#%d", n) })`,
      },
    },
    {
      id: "go-generics-constraints",
      title: "Generic Constraints",
      summary: "A constraint is an interface that restricts which types can satisfy a type parameter — from `comparable` to custom union constraints.",
      tags: ["generics", "constraints", "comparable", "cmp.Ordered"],
      body: "`any` is the loosest constraint (any type at all). `comparable` restricts to types supporting `==`/`!=` (needed for map keys or comparisons inside the generic function). Custom constraints are just interfaces — including **type-set interfaces** using `|` to union a specific list of allowed types, the mechanism behind the stdlib's `cmp.Ordered` (types supporting `<`, `>`, etc.) used throughout the `slices` and `maps` packages.",
      codeExample: {
        language: "go",
        code: `type Ordered interface {
    ~int | ~int64 | ~float64 | ~string // ~T includes types whose underlying type is T
}

func Max[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func Contains[T comparable](s []T, target T) bool {
    for _, v := range s {
        if v == target {
            return true
        }
    }
    return false
}

fmt.Println(Max(3, 7))                          // 7
fmt.Println(Contains([]string{"a", "b"}, "b")) // true`,
      },
      subtopics: [
        {
          title: "Generic struct types",
          body: "Type parameters aren't limited to functions: `type Stack[T any] struct { items []T }` defines a generic type, instantiated as `Stack[int]{}` or `Stack[string]{}`.",
        },
      ],
    },
  ],
};

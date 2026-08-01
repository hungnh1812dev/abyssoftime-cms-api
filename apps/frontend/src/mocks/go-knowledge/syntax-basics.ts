import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const syntaxBasicsSection: KnowledgeSection = {
  id: "syntax-basics",
  title: "Syntax & Basics",
  icon: "Package",
  description: "package main, imports, go.mod/go.sum, comments, the go build/run/fmt/vet toolchain, and project layout convention.",
  style: {
    iconColor: "text-cyan-500",
    headerBg: "bg-cyan-500/10 dark:bg-cyan-500/[0.08]",
    headerBorder: "border-cyan-500/20 dark:border-cyan-500/30",
    accentBorder: "border-cyan-500/50 dark:border-cyan-500/30",
    sidebarBg: "bg-cyan-500/10",
    sidebarText: "text-cyan-700 dark:text-cyan-300",
  },
  items: [
    {
      id: "go-package-main",
      title: "package main & Entry Point",
      summary: "Every executable Go program starts with `package main` and a `func main()` entry point.",
      tags: ["package", "main", "entry point"],
      body: "Every Go source file begins with a **package declaration**. A package named `main` is special: it tells the compiler this produces an **executable binary**, and it must contain a `func main()` with no parameters and no return value — that's where execution starts.\n\nAny other package name (e.g. `package store`) produces an importable **library package** instead — it has no `main()` and can't be run directly, only imported by other packages.\n\nAll files in the same directory must declare the same package name — a Go package maps 1:1 to a directory.",
      codeExample: {
        language: "go",
        code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
      },
      subtopics: [
        {
          title: "Library packages have no main()",
          body: "A directory of `.go` files declaring `package store` (for example) compiles to an importable library, not a binary. `go build` on a non-main package produces no output file — only `go build` on a `main` package (or `go install`) produces a binary.",
        },
      ],
    },
    {
      id: "go-imports",
      title: "Imports & Import Grouping",
      summary: "Import standard and external packages with `import`; unused imports are a compile error.",
      tags: ["import", "goimports", "blank import"],
      body: 'A single import uses `import "fmt"`; multiple imports are grouped in a parenthesized block. Convention (enforced by `goimports`, not the compiler) separates the standard library, then third-party modules, into blank-line-separated groups, alphabetized within each.\n\n**Aliasing**: `import f "fmt"` renames the package locally (rare, mostly for name collisions).\n\n**Blank import** `import _ "pkg"` runs a package\'s `init()` for its side effects (e.g. registering a database driver or an `net/http/pprof` handler) without using any of its exported names directly.\n\nDot imports (`import . "fmt"`) bring a package\'s exports into the current namespace unqualified — almost always discouraged outside of generated test helpers.',
      codeExample: {
        language: "go",
        code: `import (
    "fmt"
    "os"

    "github.com/gin-gonic/gin"
)

import _ "net/http/pprof" // blank import: side-effect only (registers pprof handlers)`,
      },
      subtopics: [
        {
          title: "Unused imports don't compile",
          body: "Go refuses to compile a file with an unused import (or an unused local variable) — it's a hard compile error, not a lint warning. Run `goimports -w .` to auto-add missing imports and strip unused ones.",
        },
      ],
    },
    {
      id: "go-modules",
      title: "Go Modules (go.mod / go.sum)",
      summary: "`go.mod` declares the module path, Go version, and dependencies; `go.sum` pins their checksums.",
      tags: ["go.mod", "go.sum", "modules", "go mod tidy"],
      body: "Go Modules (default since Go 1.16, no `GOPATH` setup needed) are the dependency management system. `go mod init <module-path>` creates `go.mod` at the project root, declaring the module's import path and minimum Go version.\n\n`go mod tidy` adds missing `require` entries for imports actually used in the code and removes unused ones — run it after adding or removing an import.\n\nDependencies follow **semantic versioning** (`vMAJOR.MINOR.PATCH`); a `replace` directive can locally override a dependency (e.g. pointing at a local fork during development).",
      codeExample: {
        language: "go",
        code: `// go.mod
module github.com/username/myapp

go 1.23

require (
    github.com/gin-gonic/gin v1.10.0
)`,
      },
      subtopics: [
        {
          title: "go.sum is not optional",
          body: "`go.sum` records cryptographic checksums for every dependency (and its transitive dependencies) ever used, protecting against a compromised or tampered module registry. Always commit `go.sum` alongside `go.mod` — never `.gitignore` it.",
        },
      ],
    },
    {
      id: "go-comments-doc",
      title: "Comments & Documentation (godoc)",
      summary: "A `//` comment directly above an exported declaration becomes its documentation, rendered by `go doc` and pkg.go.dev.",
      tags: ["comments", "godoc", "documentation"],
      body: "Go has no separate docstring syntax — a line comment (or comment block) placed **immediately above** a declaration, with no blank line in between, becomes that declaration's documentation. Convention: start the comment with the identifier's own name (e.g. `// Add returns...` for `func Add`).\n\nOnly **exported** identifiers (capitalized names) are meant to be documented this way for public API consumers, though documenting unexported ones helps future maintainers too. A package-level doc comment goes directly above the `package` clause, typically in a `doc.go` file for longer package overviews.",
      codeExample: {
        language: "go",
        code: `// Add returns the sum of a and b.
func Add(a, b int) int {
    return a + b
}`,
      },
    },
    {
      id: "go-toolchain",
      title: "go build / go run / go fmt / go vet",
      summary: "The go CLI covers compiling, running, formatting, and static analysis — no separate build tool needed.",
      tags: ["go build", "go run", "gofmt", "go vet", "toolchain"],
      body: "The `go` command bundles the entire toolchain:\n\n- `go run main.go` — compiles to a temporary binary and executes it immediately (nothing kept on disk)\n- `go build -o bin/app .` — compiles to a binary at the given output path\n- `go install` — builds and installs the binary into `$GOBIN` (or `$GOPATH/bin`)\n- `go fmt ./...` (or the lower-level `gofmt -w`) — canonically reformats every file in the module\n- `go vet ./...` — static analysis catching suspicious constructs (e.g. `Printf` format-string/argument mismatches, unreachable code, struct tags with typos)\n- `go test ./...` — runs tests (see the Testing section)",
      codeExample: {
        language: "bash",
        code: `go run main.go          # compile + execute, no binary kept
go build -o bin/app .    # compile to bin/app
go fmt ./...             # reformat all files in the module
go vet ./...             # static analysis
go test ./...            # run tests`,
      },
      subtopics: [
        {
          title: "gofmt has no configuration",
          body: "Unlike Prettier or ESLint, `gofmt` ships with zero configurable style options. This is a deliberate ecosystem-wide decision: there is exactly one canonical Go formatting, which eliminates style debates in every Go codebase.",
        },
      ],
    },
    {
      id: "go-project-layout",
      title: "Project Layout Convention",
      summary: "Go has no framework-enforced folder structure, but a community-standard layout uses cmd/, internal/, and pkg/.",
      tags: ["project layout", "cmd", "internal", "pkg"],
      body: "There's no single official Go project layout, but a widely adopted convention (see `golang-standards/project-layout`) uses:\n\n- `cmd/<appname>/main.go` — one entry-point package per binary the module produces\n- `internal/` — private packages, import-restricted at the compiler level (see below)\n- `pkg/` — library code intended to be imported by external projects (contested — many teams skip this and just make everything under `internal/` if it's not meant for reuse)\n\nFor small services, a flat layout (all `.go` files in the repo root, or one level of subpackages) is completely fine — don't over-structure a small project just to match a convention meant for large multi-binary repos.",
      codeExample: {
        language: "bash",
        code: `myapp/
├── go.mod
├── cmd/
│   └── myapp/
│       └── main.go
├── internal/
│   ├── handler/
│   └── store/
└── pkg/
    └── client/`,
      },
      subtopics: [
        {
          title: "internal/ is compiler-enforced, not just convention",
          body: "Any package whose import path contains an `internal/` segment can only be imported by code rooted at the parent of that `internal` directory. Unlike `pkg/` (a naming convention only), this restriction is enforced by the `go build` compiler itself — an external module attempting to import it fails to build.",
        },
      ],
    },
  ],
};

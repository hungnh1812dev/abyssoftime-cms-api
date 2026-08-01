import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const toolingEcosystemSection: KnowledgeSection = {
  id: "tooling-ecosystem",
  title: "Tooling & Ecosystem",
  icon: "Wrench",
  description: "Go modules workflow, vet/lint tooling, CLI frameworks (Cobra/Viper), database libraries, structured logging, and Docker deployment.",
  style: {
    iconColor: "text-indigo-500",
    headerBg: "bg-indigo-500/10 dark:bg-indigo-500/[0.08]",
    headerBorder: "border-indigo-500/20 dark:border-indigo-500/30",
    accentBorder: "border-indigo-500/50 dark:border-indigo-500/30",
    sidebarBg: "bg-indigo-500/10",
    sidebarText: "text-indigo-700 dark:text-indigo-300",
  },
  items: [
    {
      id: "go-modules-workflow",
      title: "Go Modules Workflow",
      summary: "Beyond go.mod basics: go mod tidy/why/graph for dependency hygiene, and go.work for multi-module local development.",
      tags: ["go mod tidy", "go mod why", "go.work"],
      body: "Building on `go.mod`/`go.sum` (Syntax & Basics): `go mod tidy` reconciles `go.mod` with what's actually imported, adding missing requirements and dropping unused ones — run it after any import change. `go mod why <package>` explains why a dependency is present (which import chain pulled it in) — useful for auditing an unexpectedly large dependency tree. `go mod graph` dumps the full dependency graph.\n\n**Workspaces** (`go.work`, Go 1.18+) let you develop against multiple local modules simultaneously (e.g. a library and the app consuming it) without publishing or using `replace` directives in each module's `go.mod` — `go.work` itself stays out of version control for the consuming module (it's a local development convenience).",
      codeExample: {
        language: "bash",
        code: `go mod tidy
go mod why github.com/some/package
go mod graph | head

go work init ./app ./mylib   # local multi-module development`,
      },
    },
    {
      id: "go-vet-lint-tooling",
      title: "go vet, golangci-lint, staticcheck",
      summary: "go vet ships with the toolchain; golangci-lint aggregates dozens of linters (including staticcheck) behind one fast, configurable command.",
      tags: ["go vet", "golangci-lint", "staticcheck"],
      body: "`go vet` (introduced in Syntax & Basics) catches a focused set of suspicious constructs the compiler allows but is almost certainly a bug. For broader static analysis, `golangci-lint` runs dozens of linters in parallel (including `staticcheck`, `errcheck` for unchecked errors, `gosimple`, and more) with a single `.golangci.yml` config, and is the de facto standard for CI lint gates in Go projects — much faster than running each linter separately.",
      codeExample: {
        language: "bash",
        code: `go vet ./...
golangci-lint run ./...`,
      },
    },
    {
      id: "go-cli-cobra-viper",
      title: "CLI Tools: Cobra & Viper",
      summary: "Cobra structures commands/subcommands/flags for CLI apps; Viper unifies config from flags, environment variables, and config files.",
      tags: ["Cobra", "Viper", "CLI"],
      body: "`github.com/spf13/cobra` is the standard framework for building CLIs with subcommands (`kubectl get pods`-style), automatic `--help` generation, and flag parsing — it's what `kubectl`, `hugo`, and the `gh` CLI are built on. `github.com/spf13/viper` (commonly paired with Cobra) unifies configuration from multiple sources — command-line flags, environment variables, and config files (YAML/JSON/TOML) — behind one consistent lookup API, with a defined precedence order between sources.",
      codeExample: {
        language: "go",
        code: `var rootCmd = &cobra.Command{
    Use:   "mytool",
    Short: "A CLI tool",
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Println("running mytool")
    },
}

func init() {
    rootCmd.PersistentFlags().String("config", "", "config file path")
}

func main() {
    if err := rootCmd.Execute(); err != nil {
        os.Exit(1)
    }
}`,
      },
    },
    {
      id: "go-database-tools",
      title: "Database Access: database/sql, sqlx, GORM",
      summary: "database/sql + a driver is the foundation; sqlx adds convenience without hiding SQL; GORM is a full ORM.",
      tags: ["database/sql", "sqlx", "GORM"],
      body: '`database/sql` defines the standard interface (`*sql.DB`, `*sql.Rows`, ...) that every database driver implements — you import a driver for its side effect (`_ "github.com/lib/pq"`) and then only interact with the driver-agnostic `database/sql` API. `github.com/jmoiron/sqlx` extends it with convenience methods (`StructScan` mapping a row directly into a struct) while keeping you writing real SQL. `gorm.io/gorm` is a full ORM — struct-based models, auto-migrations, associations — trading some of that SQL transparency for less boilerplate on standard CRUD. Choice is a tradeoff: `database/sql`/`sqlx` for teams that want SQL to stay explicit and inspectable, GORM for faster CRUD-heavy development.',
      codeExample: {
        language: "go",
        code: `// sqlx
type User struct {
    ID   int    \`db:"id"\`
    Name string \`db:"name"\`
}

var user User
err := db.Get(&user, "SELECT id, name FROM users WHERE id = $1", userID)

// GORM
var user User
result := gormDB.First(&user, userID)`,
      },
    },
    {
      id: "go-structured-logging",
      title: "Structured Logging: log/slog, Zap, zerolog",
      summary: "log/slog (Go 1.21+) brought structured, leveled logging into the standard library; Zap/zerolog remain faster for extreme-throughput services.",
      tags: ["log/slog", "Zap", "zerolog", "structured logging"],
      body: "The classic `log` package only produces unstructured text — hard to query in a log aggregation system. **`log/slog`** (Go 1.21+) added structured, leveled (Debug/Info/Warn/Error) logging with key-value attributes directly to the standard library, outputting JSON or human-readable text via pluggable handlers — for most services this is now sufficient and needs no third-party dependency. `go.uber.org/zap` and `github.com/rs/zerolog` remain popular for services where logging throughput is itself a bottleneck (very high request volume), thanks to more aggressive allocation-avoidance than `slog`'s more general design.",
      codeExample: {
        language: "go",
        code: `logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
logger.Info("user created", "user_id", userID, "email", email)
logger.Error("failed to save user", "error", err, "user_id", userID)
// {"time":"...","level":"INFO","msg":"user created","user_id":"42","email":"a@b.com"}`,
      },
    },
    {
      id: "go-docker-deployment",
      title: "Docker: Multi-Stage Builds",
      summary: "Go compiles to a single static binary — a multi-stage Dockerfile builds with the full toolchain, then ships only that binary in a tiny final image.",
      tags: ["Docker", "multi-stage build", "static binary"],
      body: "Because `go build` produces a single statically-linked binary with no runtime dependencies (by default, with `CGO_ENABLED=0`), Go is a natural fit for minimal container images. A **multi-stage Dockerfile** uses one stage with the full `golang` image to compile, then copies only the resulting binary into a tiny final stage (`scratch` or `alpine`) — the shipped image doesn't contain the Go toolchain, source code, or build cache, just the executable, often ending up a few MB instead of several hundred.",
      codeExample: {
        language: "bash",
        code: `# Dockerfile
FROM golang:1.23 AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:latest
COPY --from=build /app/server /server
ENTRYPOINT ["/server"]`,
      },
    },
    {
      id: "go-generate",
      title: "go generate",
      summary: "A `//go:generate` directive documents (and automates) a code-generation step — run explicitly via `go generate`, never automatically.",
      tags: ["go generate", "code generation"],
      body: "A `//go:generate <command>` comment above a declaration documents a code-generation step and lets `go generate ./...` run it — commonly used for `stringer` (generating `String()` methods for enum-like `iota` constants), mock generation (`mockgen`), or protobuf code generation. Unlike `go build`, generation never runs automatically — it's an explicit, deliberate step a developer runs after changing the source that generation depends on, then commits the generated output alongside the hand-written source.",
      codeExample: {
        language: "go",
        code: `//go:generate stringer -type=Weekday
type Weekday int

const (
    Sunday Weekday = iota
    Monday
)`,
      },
      subtopics: [
        {
          title: "Running it",
          body: "`go generate ./...` scans for `//go:generate` directives across the module and runs each one — typically wired into a Makefile target or CI step that's run before `go build`/`go test`, not automatically on every build.",
        },
      ],
    },
  ],
};

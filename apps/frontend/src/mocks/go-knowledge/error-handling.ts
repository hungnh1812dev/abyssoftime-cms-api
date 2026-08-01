import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const errorHandlingSection: KnowledgeSection = {
  id: "error-handling",
  title: "Error Handling",
  icon: "AlertTriangle",
  description: "The error interface, errors.New/fmt.Errorf, errors.Is/As/Unwrap, custom error types, and sentinel errors.",
  style: {
    iconColor: "text-amber-500",
    headerBg: "bg-amber-500/10 dark:bg-amber-500/[0.08]",
    headerBorder: "border-amber-500/20 dark:border-amber-500/30",
    accentBorder: "border-amber-500/50 dark:border-amber-500/30",
    sidebarBg: "bg-amber-500/10",
    sidebarText: "text-amber-700 dark:text-amber-300",
  },
  items: [
    {
      id: "go-error-interface",
      title: "The error Interface",
      summary: "`error` is a one-method built-in interface — Go treats failure as a normal return value, not an exception.",
      tags: ["error", "interface"],
      body: "`error` is a built-in interface: `type error interface { Error() string }`. Any type implementing `Error() string` is an error. This is the foundation of Go's error-handling philosophy: failures are ordinary values returned alongside (or instead of) a result, checked explicitly with `if err != nil`, not thrown/caught exceptions that can silently unwind the stack. It's more verbose at every call site, but every possible failure point is visible in the code.",
      codeExample: {
        language: "go",
        code: `type error interface {
    Error() string
}

func doWork() error {
    if somethingWrong {
        return errors.New("something went wrong")
    }
    return nil // nil error == success, by convention
}

if err := doWork(); err != nil {
    log.Println("failed:", err)
}`,
      },
    },
    {
      id: "go-error-creation",
      title: "errors.New vs. fmt.Errorf",
      summary: "`errors.New` creates a plain error from a string; `fmt.Errorf` formats one, and with `%w` also wraps an underlying error.",
      tags: ["errors.New", "fmt.Errorf"],
      body: '`errors.New("message")` creates a simple static error. `fmt.Errorf("context: %v", err)` formats a message, commonly used to add context while propagating a lower-level error up the call stack — but `%v` stringifies the original error, losing the ability for callers to programmatically inspect it. Use `%w` instead (see Error Wrapping) to keep the original error inspectable.',
      codeExample: {
        language: "go",
        code: `err := errors.New("file not found")

func readConfig(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("reading config %s: %v", path, err) // %v: context added, original error opaque
    }
    // ...
    return nil
}`,
      },
    },
    {
      id: "go-error-wrapping",
      title: "Error Wrapping (%w)",
      summary: "`fmt.Errorf` with the `%w` verb wraps an error, preserving it for later inspection via errors.Is/errors.As.",
      tags: ["%w", "error wrapping", "fmt.Errorf"],
      body: '`fmt.Errorf("context: %w", err)` wraps `err` inside a new error, adding context while keeping the original accessible. A wrapped error forms a chain — `errors.Unwrap(wrapped)` returns the next error in the chain, and `errors.Is`/`errors.As` (below) walk the whole chain automatically. This is the idiomatic replacement for `%v`-based context-adding whenever the caller might need to check *what kind* of error occurred, not just log its message.',
      codeExample: {
        language: "go",
        code: `var ErrNotFound = errors.New("not found")

func fetchUser(id string) error {
    return fmt.Errorf("fetchUser(%s): %w", id, ErrNotFound) // wraps ErrNotFound
}

err := fetchUser("42")
fmt.Println(err)                       // "fetchUser(42): not found"
fmt.Println(errors.Is(err, ErrNotFound)) // true — sees through the wrapping`,
      },
    },
    {
      id: "go-errors-is",
      title: "errors.Is",
      summary: "Checks whether an error chain contains a specific sentinel error — the wrapping-aware replacement for `err == target`.",
      tags: ["errors.Is", "sentinel error"],
      body: '`errors.Is(err, target)` reports whether `err`, or any error it wraps (walking the whole `Unwrap()` chain), equals `target`. This is the correct way to check for a specific known error when the error might have been wrapped one or more times on its way up the call stack — a plain `err == target` comparison would fail on a wrapped error even though it "is" that error semantically.',
      codeExample: {
        language: "go",
        code: `if err := fetchUser("42"); errors.Is(err, ErrNotFound) {
    // handle the not-found case specifically, regardless of how many
    // layers of fmt.Errorf("...: %w", ...) wrapped it on the way up
    return http.StatusNotFound, "user not found"
}`,
      },
    },
    {
      id: "go-errors-as",
      title: "errors.As",
      summary: "Extracts a specific error type from an error chain, so you can access its fields — the wrapping-aware replacement for a type assertion.",
      tags: ["errors.As", "custom error type"],
      body: "`errors.As(err, &target)` walks the error chain looking for an error whose concrete type matches `target`'s type; if found, it assigns that error into `target` and returns `true`. This is how you recover structured data (like a field name or HTTP status code) from a custom error type even after it's been wrapped by intermediate layers — a plain type assertion (`err.(*ValidationError)`) only works on the unwrapped, outermost error.",
      codeExample: {
        language: "go",
        code: `type ValidationError struct {
    Field string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("invalid field: %s", e.Field)
}

err := fmt.Errorf("processing request: %w", &ValidationError{Field: "email"})

var valErr *ValidationError
if errors.As(err, &valErr) {
    fmt.Println("bad field:", valErr.Field) // "email" — recovered despite wrapping
}`,
      },
    },
    {
      id: "go-custom-error-types",
      title: "Custom Error Types",
      summary: "A struct implementing `Error() string` can carry structured data alongside the error message — useful when callers need more than a string.",
      tags: ["custom error", "struct error"],
      body: "When callers need to react differently based on *why* something failed (not just log a message), a custom error type carrying structured fields is more useful than a plain string error. Combined with `errors.As` (above), callers can extract the concrete type and read its fields — e.g. an HTTP layer mapping a `*ValidationError`'s `Field` to a specific form-field error message.",
      codeExample: {
        language: "go",
        code: `type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func validateEmail(email string) error {
    if !strings.Contains(email, "@") {
        return &ValidationError{Field: "email", Message: "must contain @"}
    }
    return nil
}`,
      },
    },
    {
      id: "go-sentinel-errors",
      title: "Sentinel Errors",
      summary: "Package-level `var ErrX = errors.New(...)` values that callers compare against with `errors.Is` — Go's convention for well-known error conditions.",
      tags: ["sentinel error", "ErrNotFound", "io.EOF"],
      body: 'A **sentinel error** is a specific, exported `error` value a package declares so callers can check for that exact condition — the stdlib\'s `io.EOF` is the canonical example ("there is no more data to read", not a real failure). Convention: name them `ErrXxx`, declare them as package-level `var`s, and document that a function may return them.\n\nAlways compare sentinel errors with `errors.Is`, never `==` — `==` breaks the moment the error gets wrapped anywhere in the call chain, which is easy to introduce later without realizing it breaks existing comparisons.',
      codeExample: {
        language: "go",
        code: `var ErrNotFound = errors.New("resource not found")
var ErrUnauthorized = errors.New("unauthorized")

func fetchResource(id string) (*Resource, error) {
    if !exists(id) {
        return nil, ErrNotFound
    }
    // ...
}

switch {
case errors.Is(err, ErrNotFound):
    // 404
case errors.Is(err, ErrUnauthorized):
    // 401
}`,
      },
    },
  ],
};

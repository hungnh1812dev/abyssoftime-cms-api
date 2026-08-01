import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const testingSection: KnowledgeSection = {
  id: "testing",
  title: "Testing",
  icon: "TestTube2",
  description: "The testing package, table-driven tests, subtests, testify, httptest, benchmarks, and fuzzing.",
  style: {
    iconColor: "text-green-500",
    headerBg: "bg-green-500/10 dark:bg-green-500/[0.08]",
    headerBorder: "border-green-500/20 dark:border-green-500/30",
    accentBorder: "border-green-500/50 dark:border-green-500/30",
    sidebarBg: "bg-green-500/10",
    sidebarText: "text-green-700 dark:text-green-300",
  },
  items: [
    {
      id: "go-testing-package",
      title: "The testing Package",
      summary: "`go test` runs any function `func TestXxx(t *testing.T)` in a `_test.go` file — no separate test runner needed.",
      tags: ["testing", "go test", "TestXxx"],
      body: "Go's test framework is built into the standard library and toolchain. A test lives in a file named `*_test.go`, in a function named `TestXxx` (capital first letter after `Test`) taking a single `*testing.T` parameter. `go test ./...` discovers and runs every such function in the module.\n\n`t.Error`/`t.Errorf` record a failure and continue running the rest of the test function; `t.Fatal`/`t.Fatalf` record a failure and stop the test function immediately (use when continuing would just cause a confusing cascade of failures, e.g. after a required setup step fails).",
      codeExample: {
        language: "go",
        code: `// math_test.go
func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d, want %d", got, want)
    }
}`,
      },
    },
    {
      id: "go-table-driven-tests",
      title: "Table-Driven Tests",
      summary: "The idiomatic Go pattern: a slice of input/expected-output cases, looped over by a single test body.",
      tags: ["table-driven tests", "test cases"],
      body: "Rather than writing a separate `TestXxx` function per case, idiomatic Go collects cases into a slice of anonymous structs (`name`, inputs, expected output) and loops over it, calling `t.Run` per case (see Subtests). This keeps the assertion logic in one place and makes adding a new case a one-line change.",
      codeExample: {
        language: "go",
        code: `func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}`,
      },
    },
    {
      id: "go-subtests",
      title: "Subtests (t.Run)",
      summary: "`t.Run(name, func)` creates a named, independently-runnable, independently-failable subtest — the mechanism behind table-driven tests.",
      tags: ["t.Run", "subtests", "t.Parallel"],
      body: "`t.Run(\"case name\", func(t *testing.T) {...})` runs a nested test that reports its own pass/fail independently — one failing subtest doesn't stop the others from running. Subtests can be targeted individually: `go test -run TestAdd/negative_numbers`. Calling `t.Parallel()` inside a subtest lets it run concurrently with other parallel subtests in the same parent, speeding up large suites — but only safe when the subtests don't share mutable state.",
      codeExample: {
        language: "bash",
        code: `go test -run TestAdd              # run all tests matching TestAdd
go test -run TestAdd/negative       # run only that one subtest
go test -v ./...                     # verbose: show each subtest name`,
      },
    },
    {
      id: "go-testify",
      title: "testify: assert, require, mock",
      summary: "The most widely used third-party testing library — assert.* continues after a failure, require.* stops the test immediately.",
      tags: ["testify", "assert", "require", "mock"],
      body: "`github.com/stretchr/testify` layers friendlier assertions on top of the stdlib `testing` package. `testify/assert` failures call `t.Error` (continue running); `testify/require` failures call `t.Fatal` (stop immediately) — use `require` for setup preconditions that make the rest of the test meaningless if false, `assert` for independent checks you want to see all of, even if earlier ones failed. `testify/mock` provides a base type for building mock implementations of interfaces for unit tests that need to isolate a dependency.",
      codeExample: {
        language: "go",
        code: `func TestDivide(t *testing.T) {
    result, err := Divide(10, 2)
    require.NoError(t, err) // stop here if this fails — result is meaningless otherwise
    assert.Equal(t, 5, result)

    _, err = Divide(10, 0)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "division by zero")
}`,
      },
    },
    {
      id: "go-httptest",
      title: "net/http/httptest",
      summary: "Test HTTP handlers directly, or spin up a real (but local, ephemeral) server — no manual network setup required.",
      tags: ["httptest", "httptest.NewRecorder", "httptest.NewServer"],
      body: "`httptest.NewRecorder()` implements `http.ResponseWriter` in-memory, letting you call a handler function directly and inspect the resulting status code/body/headers without any real network I/O — the fastest way to unit test a handler. `httptest.NewServer(handler)` goes further, starting a real local HTTP server on a random port (torn down via `defer server.Close()`) — useful when testing code that specifically needs a real `*http.Client` round-trip, like verifying timeout or redirect behavior.",
      codeExample: {
        language: "go",
        code: `func TestHelloHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/hello?name=Gopher", nil)
    rec := httptest.NewRecorder()

    helloHandler(rec, req)

    resp := rec.Result()
    assert.Equal(t, http.StatusOK, resp.StatusCode)

    body, _ := io.ReadAll(resp.Body)
    assert.Equal(t, "Hello, Gopher!", string(body))
}`,
      },
    },
    {
      id: "go-benchmarks",
      title: "Benchmarks",
      summary: "`func BenchmarkXxx(b *testing.B)` measures performance; `go test -bench` runs the function's body `b.N` times and reports ns/op.",
      tags: ["benchmark", "testing.B", "go test -bench"],
      body: "A benchmark function has the signature `func BenchmarkXxx(b *testing.B)` and loops `for i := 0; i < b.N; i++ { ... }` — the testing framework automatically adjusts `b.N` until the measurement is statistically stable, then reports nanoseconds per operation. `go test -bench=. -benchmem` additionally reports memory allocations per operation, useful for spotting unexpected allocation hot paths.",
      codeExample: {
        language: "go",
        code: `func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}`,
      },
      subtopics: [
        {
          title: "go test -bench command",
          body: "Run with `go test -bench=. -benchmem ./...` — the `-bench` flag takes a regex matching benchmark names (`.` matches all), and by default benchmarks are skipped unless `-bench` is passed.",
        },
      ],
    },
    {
      id: "go-fuzzing",
      title: "Fuzzing (Go 1.18+)",
      summary: "`func FuzzXxx(f *testing.F)` feeds randomized inputs to find crashes/panics your table-driven tests didn't think to try.",
      tags: ["fuzzing", "go test -fuzz", "testing.F"],
      body: "Native fuzzing (added in Go 1.18) generates randomized inputs based on a seed corpus (`f.Add(...)`) to try to trigger a panic, crash, or a failed assertion inside the fuzz function — good for input-parsing code where you can't enumerate every edge case by hand. `go test -fuzz=FuzzXxx` runs the fuzzer (normally only for a bounded time, e.g. during CI or local exploration); any failing input it finds is automatically saved to `testdata/fuzz/` and replayed as a regular test case on every future `go test` run.",
      codeExample: {
        language: "go",
        code: `func FuzzParseCSV(f *testing.F) {
    f.Add("a,b,c") // seed corpus — known-good starting inputs
    f.Add("")

    f.Fuzz(func(t *testing.T, input string) {
        _, err := ParseCSV(input) // just checking it never panics, err is fine
        if err != nil {
            t.Skip()
        }
    })
}`,
      },
    },
  ],
};

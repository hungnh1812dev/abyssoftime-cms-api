import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const standardLibrarySection: KnowledgeSection = {
  id: "standard-library",
  title: "Standard Library",
  icon: "Library",
  description: "fmt, os, io/bufio, strings/strconv, time, encoding/json, and the Go 1.21+ slices/maps packages.",
  style: {
    iconColor: "text-emerald-500",
    headerBg: "bg-emerald-500/10 dark:bg-emerald-500/[0.08]",
    headerBorder: "border-emerald-500/20 dark:border-emerald-500/30",
    accentBorder: "border-emerald-500/50 dark:border-emerald-500/30",
    sidebarBg: "bg-emerald-500/10",
    sidebarText: "text-emerald-700 dark:text-emerald-300",
  },
  items: [
    {
      id: "go-fmt-package",
      title: "fmt: Printing & Formatting",
      summary: "Print/Printf/Sprintf/Println and verbs like %v, %+v, %T, %d, %s, %q cover almost all text output needs.",
      tags: ["fmt", "Printf", "verbs"],
      body: "`fmt.Println`/`fmt.Print` write with default formatting; `fmt.Printf` takes a format string with verbs; `fmt.Sprintf` returns the formatted string instead of writing it. Common verbs: `%v` (default representation), `%+v` (adds struct field names), `%#v` (Go-syntax representation), `%T` (the value's type), `%d`/`%s`/`%f`/`%q` (int/string/float/quoted-string). `fmt.Errorf` (see Error Handling) builds formatted errors the same way.",
      codeExample: {
        language: "go",
        code: `p := Point{X: 1, Y: 2}
fmt.Println(p)          // {1 2}
fmt.Printf("%v\\n", p)   // {1 2}
fmt.Printf("%+v\\n", p)  // {X:1 Y:2}
fmt.Printf("%T\\n", p)   // main.Point
fmt.Printf("%q\\n", "hi") // "hi"`,
      },
    },
    {
      id: "go-strings-builder",
      title: "strings: Manipulation & strings.Builder",
      summary: "The strings package covers search/split/join/replace; strings.Builder avoids the quadratic cost of repeated += concatenation.",
      tags: ["strings", "strings.Builder", "Split", "Join"],
      body: "`strings` covers the everyday operations: `Contains`, `HasPrefix`/`HasSuffix`, `Split`/`Join`, `Replace`/`ReplaceAll`, `TrimSpace`, `ToUpper`/`ToLower`. Because Go `string`s are immutable, repeated `s += x` in a loop reallocates and copies on every iteration — `strings.Builder` (or `bytes.Buffer`) accumulates into a growable internal buffer and is the idiomatic fix once you're building a string incrementally in a loop.",
      codeExample: {
        language: "go",
        code: `parts := strings.Split("a,b,c", ",")     // ["a" "b" "c"]
joined := strings.Join(parts, "-")        // "a-b-c"

var sb strings.Builder
for i := 0; i < 3; i++ {
    fmt.Fprintf(&sb, "item-%d ", i) // no reallocation per iteration
}
result := sb.String() // "item-0 item-1 item-2 "`,
      },
    },
    {
      id: "go-time-package",
      title: "time: Durations, Timestamps, Formatting",
      summary: "time.Time for instants, time.Duration for elapsed time, and a reference-date-based layout string for Format/Parse.",
      tags: ["time.Time", "time.Duration", "Format", "Parse"],
      body: "`time.Now()` returns the current `time.Time`; `time.Since(t)` returns the elapsed `time.Duration`. Durations are typed (`time.Second`, `3*time.Hour`), preventing the classic \"is this milliseconds or seconds\" bug from a bare `int`.\n\n`Format`/`Parse` use Go's distinctive **reference-date layout** instead of strftime-style codes: the layout string *is* an example of the reference moment `Mon Jan 2 15:04:05 MST 2006` (mnemonic: `01/02 03:04:05PM '06 -0700`, i.e. 1-2-3-4-5-6-7) formatted the way you want your output to look.",
      codeExample: {
        language: "go",
        code: `start := time.Now()
time.Sleep(10 * time.Millisecond)
elapsed := time.Since(start) // time.Duration

layout := "2006-01-02 15:04:05" // reference date, not strftime codes
formatted := time.Now().Format(layout)
parsed, err := time.Parse(layout, "2024-03-15 09:30:00")`,
      },
    },
    {
      id: "go-io-bufio",
      title: "io & bufio: Reading and Writing Streams",
      summary: "io.Reader/Writer are the universal stream interfaces; bufio adds buffering and line-by-line scanning on top.",
      tags: ["io.Reader", "io.Writer", "bufio.Scanner", "io.Copy"],
      body: "`io.Reader`/`io.Writer` (introduced in the Interfaces section) are satisfied by files, network connections, in-memory buffers, and HTTP bodies alike — code written against these interfaces works with any of them. `io.Copy(dst, src)` streams from any `Reader` to any `Writer` without loading everything into memory at once.\n\n`bufio.NewScanner(r)` wraps a `Reader` for convenient line-by-line (or word-by-word) iteration — the standard way to process a file or stdin one line at a time.",
      codeExample: {
        language: "go",
        code: `scanner := bufio.NewScanner(os.Stdin)
for scanner.Scan() {
    line := scanner.Text()
    fmt.Println("read:", line)
}
if err := scanner.Err(); err != nil {
    log.Fatal(err)
}

n, err := io.Copy(dstFile, srcFile) // streams without buffering the whole file in memory`,
      },
    },
    {
      id: "go-os-package",
      title: "os: Files, Args, Environment",
      summary: "os.Args for CLI arguments, os.ReadFile/WriteFile for simple file I/O, os.Getenv for environment variables.",
      tags: ["os.Args", "os.ReadFile", "os.Getenv"],
      body: '`os.Args` is the raw slice of command-line arguments (`os.Args[0]` is the program name). `os.ReadFile`/`os.WriteFile` are convenience wrappers for whole-file reads/writes when you don\'t need streaming (`os.Open` + `bufio`/`io` for larger files). `os.Getenv`/`os.LookupEnv` read environment variables — `LookupEnv` distinguishes "unset" from "set to empty string", which `Getenv` alone can\'t.',
      codeExample: {
        language: "go",
        code: `data, err := os.ReadFile("config.json")
if err != nil {
    log.Fatal(err)
}

port := os.Getenv("PORT") // "" if unset
if port == "" {
    port = "8080"
}

if v, ok := os.LookupEnv("DEBUG"); ok {
    fmt.Println("DEBUG explicitly set to:", v)
}`,
      },
    },
    {
      id: "go-encoding-json",
      title: "encoding/json: Marshal & Unmarshal",
      summary: "Struct tags control JSON field names and omission; Marshal serializes, Unmarshal deserializes into a pointer.",
      tags: ["encoding/json", "Marshal", "Unmarshal", "struct tags"],
      body: '`json.Marshal(v)` serializes a Go value to JSON bytes; `json.Unmarshal(data, &v)` deserializes into `v` (always passed as a pointer, so the function can populate it). Struct tags control the JSON field name and behavior: `json:"name"` renames the field, `json:"name,omitempty"` omits the field from output when it holds its zero value, and `json:"-"` excludes a field entirely. Only **exported** (capitalized) fields are marshaled — unexported fields are silently skipped.',
      codeExample: {
        language: "go",
        code: `type User struct {
    Name  string \`json:"name"\`
    Email string \`json:"email,omitempty"\`
    id    int     // unexported — never marshaled
}

data, _ := json.Marshal(User{Name: "Gopher"}) // {"name":"Gopher"} — Email omitted (empty)

var u User
err := json.Unmarshal(data, &u) // note: &u, Unmarshal writes into the pointer`,
      },
    },
    {
      id: "go-slices-maps-packages",
      title: "slices & maps Packages (Go 1.21+)",
      summary: "Generic helper packages replacing hand-rolled loops for common slice/map operations: sorting, searching, comparing.",
      tags: ["slices", "maps", "Go 1.21"],
      body: "Go 1.21 added `slices` and `maps` to the standard library — generic functions that replace boilerplate loops with a single call, and replace the older third-party `golang.org/x/exp/slices` package. `slices.Sort`, `slices.Contains`, `slices.Index`, `slices.Equal`, `slices.Reverse` cover the common slice operations; `maps.Keys`/`maps.Values` (returning iterators) and `maps.Equal` cover maps. Both use the generic constraints introduced in the Generics section.",
      codeExample: {
        language: "go",
        code: `nums := []int{3, 1, 2}
slices.Sort(nums)                    // [1 2 3], in place
fmt.Println(slices.Contains(nums, 2)) // true
fmt.Println(slices.Index(nums, 3))    // 2

m := map[string]int{"a": 1, "b": 2}
for k := range maps.Keys(m) {
    fmt.Println(k)
}`,
      },
    },
  ],
};

import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const concurrencySection: KnowledgeSection = {
  id: "concurrency",
  title: "Concurrency",
  icon: "Zap",
  description: "Goroutines, channels, select, sync.WaitGroup/Mutex/RWMutex, context.Context, and the race detector.",
  style: {
    iconColor: "text-purple-500",
    headerBg: "bg-purple-500/10 dark:bg-purple-500/[0.08]",
    headerBorder: "border-purple-500/20 dark:border-purple-500/30",
    accentBorder: "border-purple-500/50 dark:border-purple-500/30",
    sidebarBg: "bg-purple-500/10",
    sidebarText: "text-purple-700 dark:text-purple-300",
  },
  items: [
    {
      id: "go-goroutines",
      title: "Goroutines",
      summary: "The `go` keyword launches a lightweight, runtime-scheduled thread — cheap enough to create thousands of them.",
      tags: ["goroutine", "go keyword", "concurrency"],
      body: "A **goroutine** is a function running concurrently, managed by the Go runtime's own M:N scheduler (many goroutines multiplexed onto few OS threads) — not a 1:1 OS thread, so goroutines are cheap to create (~2KB starting stack, grown as needed) compared to OS threads (typically 1-8MB).\n\n`go f()` starts `f` running as a goroutine and returns immediately, without waiting for it to finish — the caller must explicitly synchronize (via a channel or `sync.WaitGroup`, below) if it needs to know when the goroutine completes.",
      codeExample: {
        language: "go",
        code: `func sayHello() {
    fmt.Println("Hello from a goroutine")
}

func main() {
    go sayHello()             // starts concurrently, doesn't block
    time.Sleep(time.Millisecond) // naive: only for this toy example — see WaitGroup below
}`,
      },
      subtopics: [
        {
          title: "main() exiting doesn't wait for goroutines",
          body: "When `func main()` returns, the program exits immediately — any still-running goroutines are simply abandoned, not finished. Real code synchronizes with `sync.WaitGroup` or a channel instead of `time.Sleep`.",
        },
      ],
    },
    {
      id: "go-channels",
      title: "Channels",
      summary: "Typed, safe queues for communication between goroutines — `make(chan T)` unbuffered, `make(chan T, n)` buffered.",
      tags: ["channel", "make", "buffered", "close"],
      body: "A **channel** is a typed conduit: `ch := make(chan int)` (unbuffered — a send blocks until a receiver is ready, and vice versa, giving synchronous hand-off) or `make(chan int, 10)` (buffered — a send only blocks once the buffer is full).\n\n`close(ch)` signals no more values will be sent. Receiving from a closed channel returns the zero value immediately with `ok == false` (`v, ok := <-ch`) instead of blocking. **Sending on a closed channel panics.** Only the sender should close a channel, never the receiver.",
      codeExample: {
        language: "go",
        code: `ch := make(chan int, 2) // buffered, capacity 2
ch <- 1
ch <- 2
close(ch)

for v := range ch { // range over a channel reads until it's closed
    fmt.Println(v)   // 1, 2
}

v, ok := <-ch // channel is closed and drained
fmt.Println(v, ok) // 0 false`,
      },
      subtopics: [
        {
          title: "Nil channel deadlock",
          body: "Sending or receiving on a nil (never-`make`'d) channel blocks forever — the goroutine never proceeds and never panics, it just deadlocks. Common when a struct field channel is never initialized.",
          codeExample: {
            language: "go",
            code: `var ch chan int // nil channel
ch <- 1 // fatal error: all goroutines are asleep - deadlock!`,
          },
        },
      ],
    },
    {
      id: "go-select-patterns",
      title: "select Patterns: Timeout, Fan-in, Non-blocking",
      summary: "Beyond basic multiplexing, `select` powers common concurrency patterns: timeouts, fan-in, and non-blocking checks.",
      tags: ["select", "timeout", "fan-in", "time.After"],
      body: "Building on the `select` statement introduced in Control Flow, three patterns come up constantly in real Go code:\n\n**Timeout**: race a channel receive against `time.After(d)`, which returns a channel that fires once after duration `d`.\n\n**Fan-in**: merge multiple input channels into one by `select`ing across all of them in a loop.\n\n**Non-blocking check**: a `select` with only a `default` case (no other case ready) never blocks — useful for polling without stalling.",
      codeExample: {
        language: "go",
        code: `func fetchWithTimeout(ch <-chan string, timeout time.Duration) (string, error) {
    select {
    case result := <-ch:
        return result, nil
    case <-time.After(timeout):
        return "", errors.New("timed out")
    }
}

func fanIn(a, b <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for a != nil || b != nil {
            select {
            case v, ok := <-a:
                if !ok { a = nil; continue }
                out <- v
            case v, ok := <-b:
                if !ok { b = nil; continue }
                out <- v
            }
        }
    }()
    return out
}`,
      },
    },
    {
      id: "go-sync-waitgroup",
      title: "sync.WaitGroup",
      summary: "Waits for a collection of goroutines to finish — `Add` before launching, `Done` when finished, `Wait` to block until all are done.",
      tags: ["sync.WaitGroup", "Add", "Done", "Wait"],
      body: "`sync.WaitGroup` is a counter: `Add(n)` increases it, `Done()` (typically `defer`red inside the goroutine) decrements it by one, and `Wait()` blocks until the counter reaches zero. It's the standard way to wait for a known, fixed set of goroutines to complete — as opposed to a channel, which is better for streaming an unknown number of results.",
      codeExample: {
        language: "go",
        code: `var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Println("worker", id)
    }(id) // id passed as an argument, not captured — safe even pre-Go 1.22
}

wg.Wait() // blocks until all 5 workers call Done()`,
      },
      subtopics: [
        {
          title: "A WaitGroup must never be copied",
          body: "`sync.WaitGroup` contains internal state that breaks if copied after first use — always pass it by pointer (`*sync.WaitGroup`) if it needs to cross a function boundary, or hold it as a value in the enclosing scope like the example above.",
        },
      ],
    },
    {
      id: "go-sync-mutex",
      title: "sync.Mutex & sync.RWMutex",
      summary: "Protects shared state accessed by multiple goroutines — `Lock`/`Unlock` for exclusive access, `RWMutex` allows concurrent reads.",
      tags: ["sync.Mutex", "sync.RWMutex", "Lock", "critical section"],
      body: 'Go\'s proverb is "share memory by communicating" (prefer channels) rather than "communicate by sharing memory" (prefer locks) — but for simple shared state like a counter or cache, a `sync.Mutex` is often simpler and faster than a channel-based equivalent. `mu.Lock()` / `defer mu.Unlock()` guards a critical section so only one goroutine executes it at a time.\n\n`sync.RWMutex` distinguishes readers from writers: any number of `RLock()` readers can hold the lock simultaneously, but `Lock()` (write) is fully exclusive — useful when reads vastly outnumber writes.',
      codeExample: {
        language: "go",
        code: `type Counter struct {
    mu    sync.Mutex
    count int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *Counter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}`,
      },
    },
    {
      id: "go-context",
      title: "context.Context",
      summary: "Propagates cancellation, deadlines, and request-scoped values through a call chain — conventionally the first parameter, named `ctx`.",
      tags: ["context.Context", "cancellation", "deadline", "WithTimeout"],
      body: "`context.Context` is the standard way to carry cancellation signals and deadlines across API boundaries and goroutines — e.g. canceling an HTTP handler's downstream database call when the client disconnects. `context.Background()` is the root context (top of `main`, tests, or top-level requests); `context.WithCancel`/`WithTimeout`/`WithDeadline` derive a child context that can be canceled independently.\n\nConvention: `ctx` is always the **first parameter**, never stored in a struct. A function that respects cancellation checks `ctx.Err()` or selects on `ctx.Done()` in any loop or blocking operation.",
      codeExample: {
        language: "go",
        code: `func fetchUser(ctx context.Context, id string) (*User, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel() // always call cancel to release resources, even on success

    select {
    case user := <-doFetch(id):
        return user, nil
    case <-ctx.Done():
        return nil, ctx.Err() // context.DeadlineExceeded or context.Canceled
    }
}`,
      },
      subtopics: [
        {
          title: "context.WithValue is for request-scoped data, not optional parameters",
          body: "`context.WithValue` should carry request-scoped metadata (trace IDs, auth tokens) that cuts across API layers — not be used as a way to pass regular function parameters, which should stay explicit in the signature.",
        },
      ],
    },
    {
      id: "go-race-detector",
      title: "Data Races & the Race Detector",
      summary: "The `-race` flag instruments builds to catch unsynchronized concurrent access at runtime; `sync/atomic` handles simple counters without a mutex.",
      tags: ["-race", "data race", "sync/atomic"],
      body: "A **data race** occurs when two goroutines access the same variable concurrently and at least one is a write, with no synchronization between them — this is undefined behavior in Go, not just a logic bug. `go test -race ./...` / `go run -race main.go` / `go build -race` instrument the binary to detect races at runtime (with a performance and memory cost, so it's a dev/CI tool, not for production builds).\n\nFor simple numeric counters, `sync/atomic` (`atomic.Int64`, `atomic.AddInt64`, ...) provides lock-free atomic operations — often faster than a `sync.Mutex` for that narrow use case, but it doesn't generalize to protecting multiple related fields the way a mutex does.",
      codeExample: {
        language: "bash",
        code: `go test -race ./...
go run -race main.go`,
      },
      subtopics: [
        {
          title: "sync/atomic for lock-free counters",
          body: "`var counter atomic.Int64; counter.Add(1)` is a lock-free alternative to `sync.Mutex` for a single counter — reach for a mutex once you need to keep more than one related value consistent together.",
        },
      ],
    },
  ],
};

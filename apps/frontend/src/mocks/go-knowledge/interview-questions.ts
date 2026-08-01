import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const interviewQuestionsSection: KnowledgeSection = {
  id: "interview-questions",
  title: "Interview Questions",
  icon: "Library",
  description: "Common Go Backend interview questions and answers categorized by Junior, Middle, and Senior levels.",
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
      id: "junior-interview-questions",
      title: "Junior Level Questions",
      summary: "Basic syntax, common concepts, and fundamentals of Go.",
      tags: ["junior", "interview", "basics"],
      body: `**1. What is a goroutine?**
A goroutine is a lightweight thread managed by the Go runtime. It is cheaper than an OS thread and allows for concurrent execution. You start one using the \`go\` keyword.

**2. Explain the difference between an Array and a Slice.**
Arrays have a fixed size determined at compile time, e.g., \`[3]int\`. Slices are dynamic, flexible views into the elements of an array, e.g., \`[]int\`. Slices are much more common in Go.

**3. What is the zero value in Go?**
Variables declared without an explicit initial value are given their type's zero value. For example, \`0\` for numeric types, \`false\` for booleans, \`""\` for strings, and \`nil\` for pointers, slices, maps, channels, and interfaces.

**4. How do you handle errors in Go?**
Go does not have exceptions. Instead, functions return an \`error\` type as their last return value. You check if the error is \`nil\` to determine if an operation was successful.

**5. What is the \`defer\` keyword used for?**
\`defer\` pushes a function call onto a list. The list of saved calls is executed after the surrounding function returns. It is commonly used for resource cleanup, like closing files or releasing locks.`,
    },
    {
      id: "middle-interview-questions",
      title: "Middle Level Questions",
      summary: "Concurrency patterns, memory management, and interfaces.",
      tags: ["middle", "interview", "concurrency", "interfaces"],
      body: `**1. How do Channels work and what are unbuffered vs buffered channels?**
Channels are pipes that connect concurrent goroutines. Unbuffered channels (\`make(chan int)\`) block the sender until the receiver is ready, providing synchronization. Buffered channels (\`make(chan int, 10)\`) have a queue and only block the sender when the queue is full.

**2. Explain Go's interface duck typing.**
In Go, interfaces are implemented implicitly. A type implements an interface by implementing its methods. There is no explicit declaration of intent, no "implements" keyword.

**3. What is a memory leak in Go and how can it happen?**
Although Go has a garbage collector, memory leaks can occur when memory is no longer needed but still referenced. Common causes include: not closing channels, un-stopped \`time.Ticker\`, or keeping references to large objects in global maps or long-lived slices (like slicing a small part of a huge array).

**4. Explain the \`context\` package.**
The \`context\` package carries deadlines, cancellation signals, and other request-scoped values across API boundaries and between processes. It is vital for canceling long-running operations and preventing resource leaks when a client disconnects.

**5. How does Go Garbage Collector work?**
Go uses a concurrent, tri-color mark-and-sweep garbage collector. It runs concurrently with the application (with very short stop-the-world pauses) to identify and free objects that are no longer reachable.`,
    },
    {
      id: "senior-interview-questions",
      title: "Senior Level Questions",
      summary: "System design, runtime internals, profiling, and advanced patterns.",
      tags: ["senior", "interview", "runtime", "profiling"],
      body: `**1. Explain the GMP model in Go's scheduler.**
The Go scheduler uses a GMP model:
- **G (Goroutine)**: represents a goroutine, including its stack and state.
- **M (Machine)**: represents an OS thread.
- **P (Processor)**: represents a logical processor (context). M must have a P to execute G code. 
This allows the runtime to manage thousands of goroutines on a small number of OS threads, efficiently handling syscall blocking and work stealing.

**2. How do you profile and optimize a Go application?**
I would use the \`net/http/pprof\` package or \`runtime/pprof\` to collect CPU, heap, block, and mutex profiles. Then, use \`go tool pprof\` to analyze the data. For benchmarking, I use \`go test -bench\` along with memory allocation tracking (\`-benchmem\`).

**3. What is escape analysis?**
Escape analysis is a compiler phase that determines whether a variable's memory can be allocated on the stack (which is cheap and fast) or if it must "escape" to the heap (requiring garbage collection). Understanding this is key to writing allocation-efficient code.

**4. How do you design a scalable Go microservice?**
Considerations include defining clear gRPC or REST boundaries, using \`context\` throughout the call chain, implementing retries with exponential backoff, circuit breaking, distributed tracing (OpenTelemetry), structural logging, and stateless horizontal scaling.

**5. What are the common concurrency bugs in Go?**
Common bugs include:
- **Data Races**: Two goroutines accessing the same variable concurrently, with at least one writer. (Detect with \`go run -race\`).
- **Deadlocks**: Goroutines waiting on each other forever, usually due to incorrect mutex locking or channel operations.
- **Goroutine Leaks**: Spawning goroutines that never exit, consuming memory and resources.`,
    },
  ],
};

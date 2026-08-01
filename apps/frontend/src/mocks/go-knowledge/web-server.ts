import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const webServerSection: KnowledgeSection = {
  id: "web-server",
  title: "Web & Server",
  icon: "Server",
  description: "net/http basics and routing, the middleware pattern, JSON REST handlers, Gin/Echo/Fiber, gRPC basics, and the HTTP client.",
  style: {
    iconColor: "text-blue-500",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/[0.08]",
    headerBorder: "border-blue-500/20 dark:border-blue-500/30",
    accentBorder: "border-blue-500/50 dark:border-blue-500/30",
    sidebarBg: "bg-blue-500/10",
    sidebarText: "text-blue-700 dark:text-blue-300",
  },
  items: [
    {
      id: "go-net-http-basics",
      title: "net/http Basics",
      summary: "`http.HandleFunc` + `http.ListenAndServe` stand up a working HTTP server in a few lines — no framework required.",
      tags: ["net/http", "HandleFunc", "ListenAndServe"],
      body: "The standard library's `net/http` is a complete, production-capable HTTP server and client — many small-to-medium Go services use it directly with no framework. A handler is any function matching `func(w http.ResponseWriter, r *http.Request)`; `http.HandleFunc(pattern, handler)` registers it on the default mux, and `http.ListenAndServe(addr, nil)` starts serving.",
      codeExample: {
        language: "go",
        code: `func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Query().Get("name"))
}

func main() {
    http.HandleFunc("/hello", helloHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}`,
      },
    },
    {
      id: "go-http-servemux-routing",
      title: "http.ServeMux & Go 1.22+ Routing",
      summary: "A ServeMux dispatches requests to handlers by path; Go 1.22 added method matching and {wildcard} path segments built in.",
      tags: ["http.ServeMux", "routing", "Go 1.22"],
      body: '`http.NewServeMux()` creates an explicit router instead of relying on the global default mux — better for testability and avoiding global state. Before Go 1.22, the stdlib mux only matched by path prefix, pushing teams toward third-party routers for method-based or parameterized routes. **Go 1.22** added both directly: `mux.HandleFunc("GET /users/{id}", handler)` matches only GET requests and extracts `{id}` via `r.PathValue("id")`.',
      codeExample: {
        language: "go",
        code: `mux := http.NewServeMux()

mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // Go 1.22+
    fmt.Fprintf(w, "user %s", id)
})

mux.HandleFunc("POST /users", createUserHandler)

log.Fatal(http.ListenAndServe(":8080", mux))`,
      },
    },
    {
      id: "go-middleware-pattern",
      title: "The Middleware Pattern",
      summary: "A middleware wraps an http.Handler with another http.Handler — the stdlib's composable way to add cross-cutting behavior.",
      tags: ["middleware", "http.Handler", "wrapping"],
      body: "Since `http.Handler` is just an interface (`ServeHTTP(w, r)`), a **middleware** is a function `func(http.Handler) http.Handler` that returns a new handler wrapping the original — running code before/after calling the wrapped handler's `ServeHTTP`. This composes naturally: `logMiddleware(authMiddleware(mux))` chains multiple behaviors (logging, auth, recovery, CORS) around the same core handler without the core handler knowing about any of them.",
      codeExample: {
        language: "go",
        code: `func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r) // call the wrapped handler
        log.Printf("%s %s took %v", r.Method, r.URL.Path, time.Since(start))
    })
}

handler := loggingMiddleware(mux)
log.Fatal(http.ListenAndServe(":8080", handler))`,
      },
    },
    {
      id: "go-json-rest-handler",
      title: "A JSON REST Handler",
      summary: "Combining encoding/json with net/http: decode the request body into a struct, encode the response back to JSON.",
      tags: ["REST", "JSON", "encoding/json", "net/http"],
      body: "A typical JSON API handler decodes the incoming request body with `json.NewDecoder(r.Body).Decode(&input)`, does its work, then writes the response with `json.NewEncoder(w).Encode(output)` after setting the `Content-Type` header and status code. `http.Error` is the idiomatic shortcut for a plain-text error response with a status code.",
      codeExample: {
        language: "go",
        code: `type CreateUserRequest struct {
    Name string \`json:"name"\`
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid JSON body", http.StatusBadRequest)
        return
    }

    user := User{ID: newID(), Name: req.Name}

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}`,
      },
    },
    {
      id: "go-gin-echo-fiber",
      title: "Web Frameworks: Gin, Echo, Fiber",
      summary: "Third-party frameworks trade a little stdlib simplicity for routing ergonomics, built-in middleware, and (for Fiber) a non-net/http core.",
      tags: ["Gin", "Echo", "Fiber", "framework"],
      body: "**Gin** (`github.com/gin-gonic/gin`) is the most widely adopted — a thin, fast layer over `net/http` adding route groups, JSON binding/validation helpers, and a large middleware ecosystem. **Echo** (`github.com/labstack/echo`) is a close sibling with a similar feature set and a slightly different API style. **Fiber** (`github.com/gofiber/fiber`) is Express.js-inspired and built on `fasthttp` instead of `net/http` — often faster in benchmarks, but that also means it's **not** a drop-in `http.Handler`, so it can't reuse net/http-based middleware or libraries that expect the standard interfaces. For most services, the stdlib (`net/http` + Go 1.22 routing) is enough; reach for a framework when its ecosystem (validation, OpenAPI generation, existing middleware) saves real time.",
      codeExample: {
        language: "go",
        code: `// Gin
r := gin.Default()
r.GET("/users/:id", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"id": c.Param("id")})
})
r.Run(":8080")`,
      },
    },
    {
      id: "go-grpc-basics",
      title: "gRPC Basics",
      summary: "gRPC generates Go client/server code from a .proto schema — a strongly-typed, binary-protocol alternative to JSON REST for service-to-service calls.",
      tags: ["gRPC", "protobuf", "google.golang.org/grpc"],
      body: "gRPC (`google.golang.org/grpc` + `google.golang.org/protobuf`) defines a service's methods and message types in a `.proto` file; `protoc` (with the Go plugins) generates strongly-typed Go structs and client/server interfaces from it — no manual JSON marshaling or hand-written API contracts to keep in sync. It uses HTTP/2 and Protocol Buffers' compact binary encoding, making it common for internal service-to-service communication where performance matters, while JSON REST remains more common for public-facing/browser-consumed APIs due to its human-readable, universally-supported format.",
      codeExample: {
        language: "bash",
        code: `# user.proto defines the service; protoc generates user.pb.go + user_grpc.pb.go
protoc --go_out=. --go-grpc_out=. user.proto`,
      },
      subtopics: [
        {
          title: "Generated code, not hand-written structs",
          body: "Unlike the JSON REST handler above (where you write the request/response structs by hand), gRPC's Go types are generated from the `.proto` schema — the schema is the source of truth, and regenerating after a schema change keeps client and server in sync automatically.",
        },
      ],
    },
    {
      id: "go-http-client",
      title: "The net/http Client",
      summary: "http.Get is a convenient shortcut, but the default client has no timeout — production code should configure an http.Client explicitly.",
      tags: ["http.Client", "http.Get", "timeout"],
      body: "`http.Get(url)` is a shortcut using `http.DefaultClient` — convenient for quick scripts, but **`http.DefaultClient` has no timeout**, so a hung remote server can block a request forever. Production code should construct an explicit `http.Client{Timeout: ...}`, or better, use `http.NewRequestWithContext` with a context carrying a deadline (see the Concurrency section) so a single slow request can be canceled without blocking the whole client's other in-flight requests.",
      codeExample: {
        language: "go",
        code: `client := &http.Client{Timeout: 5 * time.Second}

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.example.com/data", nil)
if err != nil {
    log.Fatal(err)
}

resp, err := client.Do(req)
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()`,
      },
    },
  ],
};

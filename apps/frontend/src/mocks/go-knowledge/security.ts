import type { KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

export const securitySection: KnowledgeSection = {
  id: "security",
  title: "Security",
  icon: "ShieldCheck",
  description: "crypto/tls, password hashing with bcrypt, JWTs, SQL injection prevention, input validation, and secure defaults.",
  style: {
    iconColor: "text-red-500",
    headerBg: "bg-red-500/10 dark:bg-red-500/[0.08]",
    headerBorder: "border-red-500/20 dark:border-red-500/30",
    accentBorder: "border-red-500/50 dark:border-red-500/30",
    sidebarBg: "bg-red-500/10",
    sidebarText: "text-red-700 dark:text-red-300",
  },
  items: [
    {
      id: "go-crypto-tls",
      title: "crypto/tls & HTTPS Servers",
      summary: "`http.ListenAndServeTLS` serves HTTPS directly; a custom `tls.Config` enforces a minimum TLS version and cipher suite policy.",
      tags: ["crypto/tls", "TLS", "ListenAndServeTLS"],
      body: "`http.ListenAndServeTLS(addr, certFile, keyFile, handler)` is the HTTPS equivalent of `ListenAndServe`, requiring a certificate and private key. For finer control (minimum TLS version, cipher suites, client cert requirements), build an `*http.Server` with an explicit `TLSConfig`. Pinning `MinVersion: tls.VersionTLS12` (or 1.3) rejects legacy, vulnerable protocol versions — never leave it at the zero value in a security-sensitive service, since older Go defaults are more permissive than current best practice.",
      codeExample: {
        language: "go",
        code: `server := &http.Server{
    Addr:    ":443",
    Handler: mux,
    TLSConfig: &tls.Config{
        MinVersion: tls.VersionTLS12,
    },
}
log.Fatal(server.ListenAndServeTLS("cert.pem", "key.pem"))`,
      },
    },
    {
      id: "go-password-hashing",
      title: "Password Hashing (bcrypt)",
      summary: "Never hash passwords with crypto/sha256 or crypto/md5 — use bcrypt (or argon2/scrypt), which is deliberately slow and automatically salted.",
      tags: ["bcrypt", "password hashing", "golang.org/x/crypto"],
      body: '`crypto/sha256` and similar are **general-purpose, fast** hash functions — exactly the wrong property for password storage, since "fast" is what makes brute-force/rainbow-table attacks cheap. `golang.org/x/crypto/bcrypt` is purpose-built for passwords: it\'s deliberately slow (tunable via a cost factor) and automatically generates and embeds a random salt per password, so identical passwords produce different hashes and comparison must go through `bcrypt.CompareHashAndPassword` rather than a direct equality check.',
      codeExample: {
        language: "go",
        code: `hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
if err != nil {
    return err
}
// store hash (a []byte, typically saved as a string) in the database

err = bcrypt.CompareHashAndPassword(hash, []byte(attemptedPassword))
if err != nil {
    // mismatch — err is bcrypt.ErrMismatchedHashAndPassword
    return errors.New("invalid credentials")
}`,
      },
    },
    {
      id: "go-jwt",
      title: "JWTs (github.com/golang-jwt/jwt)",
      summary: "Sign and verify JSON Web Tokens for stateless auth — always validate the signing algorithm explicitly to avoid algorithm-confusion attacks.",
      tags: ["JWT", "golang-jwt", "signing", "claims"],
      body: "`github.com/golang-jwt/jwt/v5` is the de facto standard JWT library for Go. `jwt.NewWithClaims` + `token.SignedString(secret)` issues a token; `jwt.ParseWithClaims` verifies and decodes one. A well-known JWT pitfall (not specific to this library, but a real historical vulnerability class): if your parser doesn't pin the expected signing algorithm, an attacker can craft a token using a different algorithm than intended (e.g. switching `RS256` to `HS256` and signing with the public key as if it were an HMAC secret) — always check `token.Method` inside the key-lookup callback.",
      codeExample: {
        language: "go",
        code: `claims := jwt.MapClaims{
    "sub": userID,
    "exp": time.Now().Add(1 * time.Hour).Unix(),
}
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
signed, err := token.SignedString([]byte(secretKey))

parsed, err := jwt.Parse(signed, func(t *jwt.Token) (any, error) {
    if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
        return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
    }
    return []byte(secretKey), nil
})`,
      },
    },
    {
      id: "go-sql-injection-prevention",
      title: "SQL Injection Prevention",
      summary: "`database/sql` placeholder parameters (`?` or `$1`) send values separately from the query — never build SQL with string concatenation.",
      tags: ["SQL injection", "database/sql", "parameterized query"],
      body: "`database/sql`'s `Query`/`Exec`/`QueryRow` accept a query string with driver-specific placeholders (`?` for MySQL/SQLite, `$1`, `$2`, ... for PostgreSQL) plus the values as separate arguments — the driver sends the query and values separately to the database, so user input is never interpreted as SQL syntax, eliminating SQL injection by construction. String-concatenating user input directly into a query is the classic vulnerability this prevents. Higher-level libraries (`sqlx`, `GORM`) parameterize under the hood too, as long as you use their query-building APIs rather than manually formatting raw SQL strings.",
      codeExample: {
        language: "go",
        code: `// SAFE — value passed separately, never interpreted as SQL
row := db.QueryRow("SELECT id, name FROM users WHERE email = $1", userInput)

// VULNERABLE — never do this
query := "SELECT id, name FROM users WHERE email = '" + userInput + "'"
row := db.QueryRow(query) // userInput could contain: ' OR '1'='1`,
      },
    },
    {
      id: "go-input-validation",
      title: "Input Validation",
      summary: "Validate and sanitize all external input at the boundary — struct-tag validators like go-playground/validator keep rules declarative and close to the data.",
      tags: ["input validation", "go-playground/validator"],
      body: 'Never trust data crossing a trust boundary — request bodies, query params, headers, file uploads. `github.com/go-playground/validator` lets you declare validation rules as struct tags (`validate:"required,email"`) and run them with a single `validate.Struct(v)` call, keeping constraints next to the field they apply to instead of scattered through handler code. Validation should happen as early as possible — reject malformed input at the API boundary before it reaches business logic or a database query.',
      codeExample: {
        language: "go",
        code: `type CreateUserRequest struct {
    Email string \`validate:"required,email"\`
    Age   int    \`validate:"gte=0,lte=130"\`
}

validate := validator.New()
if err := validate.Struct(req); err != nil {
    http.Error(w, "invalid request: "+err.Error(), http.StatusBadRequest)
    return
}`,
      },
    },
    {
      id: "go-secure-defaults",
      title: "Secure Defaults for http.Server",
      summary: "The zero-value http.Server has no timeouts — a classic slowloris DoS vector; production servers should set them explicitly.",
      tags: ["secure defaults", "ReadTimeout", "slowloris"],
      body: "`http.ListenAndServe` (using the default, zero-valued `http.Server`) has **no read, write, or idle timeouts** — a client that opens a connection and sends data agonizingly slowly (or never finishes) can hold a server goroutine open indefinitely, a class of attack known as slowloris. Production code should construct an explicit `*http.Server` with `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, and `IdleTimeout` set to sane bounds. Similarly, avoid leaking internal details (stack traces, raw error messages) to clients in production — log them server-side, return a generic message to the caller.",
      codeExample: {
        language: "go",
        code: `server := &http.Server{
    Addr:              ":8080",
    Handler:           mux,
    ReadHeaderTimeout: 5 * time.Second,
    ReadTimeout:       10 * time.Second,
    WriteTimeout:      10 * time.Second,
    IdleTimeout:       120 * time.Second,
}
log.Fatal(server.ListenAndServe())`,
      },
    },
    {
      id: "go-secrets-management",
      title: "Secrets Management",
      summary: "Never hardcode credentials in source — read them from environment variables or a secret manager, and never commit them to version control.",
      tags: ["secrets", "os.Getenv", "environment variables"],
      body: "API keys, database passwords, and signing secrets should never appear as string literals in committed code — a single leaked commit (even later removed) can persist in git history forever. The common baseline is reading secrets from environment variables (`os.Getenv`/`os.LookupEnv`) injected by the deployment environment, with a `.env` file for **local development only** and explicitly excluded via `.gitignore`. For production, a dedicated secret manager (cloud-provider secret stores, HashiCorp Vault, etc.) is preferable to plain environment variables when secrets need rotation, auditing, or fine-grained access control.",
      codeExample: {
        language: "go",
        code: `dbPassword := os.Getenv("DB_PASSWORD")
if dbPassword == "" {
    log.Fatal("DB_PASSWORD environment variable is required")
}`,
      },
    },
  ],
};

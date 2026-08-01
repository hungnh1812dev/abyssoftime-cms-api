import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const securitySection: KnowledgeSection = {
  id: "security",
  title: "Security",
  icon: "ShieldCheck",
  description: "Web application security: bot protection, DDoS mitigation, CORS setup, authentication flows, XSS/CSRF prevention, and HTTP security headers.",
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
      id: "sec-bot-ddos",
      title: "Bot & DDoS Protection",
      summary: "Rate limiting, CAPTCHAs, WAF firewalls, and Cloudflare setups to protect against automated bots and DDoS attacks.",
      tags: ["rate limiting", "CAPTCHA", "WAF", "Cloudflare", "DDoS", "bot"],
      body: "**Bot Protection** prevents automated scripts from scraping sensitive data, spamming registration forms, or executing credential brute-force attacks.\n\n**Rate Limiting**: Restricts the maximum number of requests originating from a single IP within a set time window. Layer 1: CDN / Cloudflare (implemented before traffic hits the server). Layer 2: Application middleware (e.g. Express `express-rate-limit` or Next.js Edge Middleware).\n\n**CAPTCHA**: Validates human identity. **hCaptcha** and **Cloudflare Turnstile** represent privacy-friendly alternatives to Google's reCAPTCHA. Use them on login, registration, and payment submission forms.\n\n**WAF (Web Application Firewall)**: Filters incoming web traffic based on rule definitions — blocking SQL injections, known malicious IP subnets, or rogue agent signatures. Implemented via Cloudflare WAF, AWS WAF, or Vercel's built-in WAF layers.\n\n**DDoS Mitigation**: Cloudflare absorbs large-scale network volumetric attacks (Layers 3 and 4) at the Edge before queries reach your origin servers. Enable **Under Attack Mode** during severe incidents to enforce JS challenges globally.",
      subtopics: [
        {
          title: "Rate Limiting in Next.js Edge",
          body: "Leverage Edge Middleware integrated with Redis (e.g. Upstash) to validate rate limit caps prior to executing backend API routes.",
          codeExample: {
            language: "typescript",
            code: `// middleware.ts (Next.js Edge Middleware rate limiting setup)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // Max 10 requests per 10s per IP
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "Retry-After": "10",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};`,
          },
        },
        {
          title: "Cloudflare Turnstile",
          body: "A lightweight, user-privacy-respecting CAPTCHA alternative widget featuring simple integration hooks for React.",
          codeExample: {
            language: "tsx",
            code: `// npm install @marsidev/react-turnstile
import { Turnstile } from "@marsidev/react-turnstile";

function ContactForm() {
  const [token, setToken] = useState<string | null>(null);

  async function handleSubmit(data: FormData) {
    if (!token) return;
    // Post token to server-side resolver for validation
    await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify({ ...data, cfToken: token }),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form inputs */}
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={setToken}
      />
      <button type="submit" disabled={!token}>Submit</button>
    </form>
  );
}`,
          },
        },
      ],
    },
    {
      id: "sec-cors",
      title: "CORS",
      summary: "Cross-Origin Resource Sharing — browser security mechanisms, preflight requests, and correct server configurations.",
      tags: ["CORS", "preflight", "Access-Control", "credentials", "same-origin"],
      body: "**CORS** is a browser-enforced security model — it restricts JS running on origin A from reading response details served from origin B unless B explicitly configures permissions.\n\n**Same-Origin Policy**: Two URLs share an origin if they share matching protocol, hostname, and port details. Hence, `https://app.com` differs from `https://api.app.com`.\n\n**Simple Requests**: Common GET/POST operations with basic headers that bypass preflight checks. Browsers issue these immediately; the server must include `Access-Control-Allow-Origin` headers in responses.\n\n**Preflight Requests**: Automated OPTIONS requests sent by the browser before executing non-simple operations (such as PUT/DELETE methods, JSON bodies, or custom headers). Servers must resolve OPTIONS queries with status `204` along with suitable CORS parameters.\n\n**`credentials: 'include'`**: Sends cookies with cross-origin requests. Requires the server to set `Access-Control-Allow-Credentials: true` and forbids using wildcards (`*`) inside origin declarations.\n\n**Note**: CORS is strictly a browser runtime protection. Server-to-server calls bypass CORS verification entirely.",
      subtopics: [
        {
          title: "CORS in Next.js API Routes",
          body: "Configuring CORS support across Next.js API paths to permit requests from multiple designated subdomains.",
          codeExample: {
            language: "typescript",
            code: `// src/lib/cors.ts
const ALLOWED_ORIGINS = [
  "https://app.example.com",
  "https://admin.example.com",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
];

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // cache preflight options for 24h
  };
}

// app/api/data/route.ts
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const data = await fetchData();
  return Response.json(data, { headers: corsHeaders(origin) });
}`,
          },
        },
      ],
    },
    {
      id: "sec-auth-flow",
      title: "Authentication Flow",
      summary: "JWT, OAuth 2.0, session-based authentication, and NextAuth.js — comparisons and deployment scenarios.",
      tags: ["JWT", "OAuth 2.0", "session", "NextAuth", "httpOnly cookie", "refresh token"],
      body: "**Session-Based Authentication**: The server stores session mappings in databases or Redis instances and passes a `session_id` back via secure cookies. This stateful architecture makes revoking access easy but demands backend storage scaling.\n\n**JWT (JSON Web Token)**: The server signs payload metadata with cryptographic keys. The client caches and attaches the JWT to requests. This stateless model bypasses database lookups, but tokens cannot be easily revoked before expiration and carry higher byte overhead.\n\n**Access & Refresh Token Pattern**: Pairs short-lived `accessToken` parameters (e.g. 15 mins) with long-lived `refreshToken` parameters (e.g. 30 days) stored in secure cookies. Expired access parameters are refreshed silently on the fly, balancing security and UX.\n\n**OAuth 2.0**: Permits users to authorize client apps using existing accounts from identity providers (such as Google or GitHub) without sharing passwords. Standard: Authorization Code Flow + PKCE for web applications.\n\n**NextAuth.js (Auth.js)**: High-level authentication abstraction layer for Next.js supporting 50+ providers, session tracking, and JWT lifecycle handling.",
      subtopics: [
        {
          title: "NextAuth.js v5 Setup",
          body: "Configuring Auth.js with Google provider credentials and database session storage integration.",
          codeExample: {
            language: "typescript",
            code: `// auth.ts (Auth.js v5 config)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

// middleware.ts
export { auth as middleware } from "@/auth";
export const config = { matcher: ["/dashboard/:path*"] };`,
          },
        },
        {
          title: "Where should JWTs be stored?",
          body: "Avoid storing JWTs in `localStorage` due to vulnerability to XSS exploits. Persist them inside `httpOnly` secure cookies to hide them from client JS loops.",
          codeExample: {
            language: "typescript",
            code: `// Server-side: setting JWT inside a secure httpOnly cookie
response.cookies.set("token", jwt, {
  httpOnly: true,      // prevents JavaScript access
  secure: true,        // forces HTTPS connections
  sameSite: "lax",     // mitigates basic CSRF attempts
  maxAge: 60 * 15,     // 15-minute access token limit
  path: "/",
});

// Refresh token set in a isolated endpoint cookie
response.cookies.set("refresh", refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",  // restrict cross-site sharing
  maxAge: 60 * 60 * 24 * 7, // 7 days expiration
  path: "/api/auth/refresh", // send cookie strictly to the refresh path
});`,
          },
        },
      ],
    },
    {
      id: "sec-xss-csrf",
      title: "XSS & CSRF Prevention",
      summary: "Cross-Site Scripting and Cross-Site Request Forgery — vulnerabilities, attack mechanisms, and prevention strategies.",
      tags: ["XSS", "CSRF", "CSP", "DOMPurify", "CSRF token", "SameSite"],
      body: "**XSS (Cross-Site Scripting)**: Occurs when attackers inject malicious scripts that execute in the context of the user's browser, potentially stealing cookies or hijacking DOM nodes.\n- **Stored XSS**: The rogue script is saved in the database and served to visitors.\n- **Reflected XSS**: The script is passed through URL parameters and reflected in response templates.\n- **DOM-Based XSS**: The script executes strictly client-side via insecure DOM manipulations.\n\n**XSS Mitigation**: React automatically escapes outputs in JSX strings (`{userInput}`). For rendering user-provided markup, clean values using **DOMPurify** before injecting via `dangerouslySetInnerHTML`. Avoid using `eval()`, `innerHTML`, or `document.write()`.\n\n**CSRF (Cross-Site Request Forgery)**: Tricks authenticated users into executing state-changing requests on a target site from a malicious third-party origin.\n\n**CSRF Mitigation**: Enforce strict cookie security with `SameSite=Strict/Lax` attributes. For sensitive state mutations, validate CSRF tokens supplied within form submissions against session values.\n\n**CSP (Content Security Policy)**: HTTP headers instructing browsers which origins are allowed to execute scripts, styles, or load assets, neutralizing inline scripts.",
      subtopics: [
        {
          title: "Content Security Policy",
          body: "Enforcing strict CSP rules inside Edge middleware to restrict script sources using random nonces.",
          codeExample: {
            language: "typescript",
            code: `// middleware.ts — nonce-based CSP configuration
import { NextResponse } from "next/server";
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    \`default-src 'self'\`,
    \`script-src 'self' 'nonce-\${nonce}' 'strict-dynamic'\`,
    \`style-src 'self' 'unsafe-inline'\`, // required for Tailwind runtime rules
    \`img-src 'self' data: https:\`,
    \`font-src 'self'\`,
    \`connect-src 'self' https://api.example.com\`,
    \`frame-ancestors 'none'\`, // prevents clickjacking exploits
  ].join("; ");

  const response = NextResponse.next({
    request: { headers: new Headers({ ...request.headers, "x-nonce": nonce }) },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}`,
          },
        },
        {
          title: "HTML Sanitization via DOMPurify",
          body: "Always clean rich text editor outputs using DOMPurify before feeding them to React's dangerouslySetInnerHTML wrapper.",
          codeExample: {
            language: "tsx",
            code: `import DOMPurify from "dompurify";

function RichTextContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORCE_BODY: true,
  });

  return (
    <div
      className="prose dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}`,
          },
        },
      ],
    },
    {
      id: "sec-headers",
      title: "Security Headers",
      summary: "Crucial HTTP security headers: HSTS, X-Frame-Options, Referrer-Policy, and Next.js configuration.",
      tags: ["HSTS", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "security headers"],
      body: "Security headers layer protective rules at the browser level to enforce transport security and sandbox permissions:\n\n**HSTS** (`Strict-Transport-Security`): Forces the browser to load the site strictly over HTTPS, protecting against SSL stripping attacks: `max-age=31536000; includeSubDomains; preload`.\n\n**X-Frame-Options**: Restricts the page from being embedded inside `<iframe>` tags, mitigating clickjacking. Prefer using `DENY` or `SAMEORIGIN` values, or override with CSP `frame-ancestors` directives.\n\n**X-Content-Type-Options: nosniff**: Restricts browsers from attempting to infer response MIME-types, blocking executable styling exploits.\n\n**Referrer-Policy**: Controls how much referrer metadata is sent on outgoing navigations. `strict-origin-when-cross-origin` is a secure default.\n\n**Permissions-Policy**: Restricts the browser hardware features (e.g. camera, microphone, or geolocation APIs) the application can consume.\n\n**Remove X-Powered-By**: Strips infrastructure identifiers from headers to make it harder for attackers to target known framework bugs.",
      codeExample: {
        language: "javascript",
        code: `// next.config.mjs — custom security headers definition
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Powered-By", value: "" }, // strips framework indicator
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  poweredByHeader: false, // removes default X-Powered-By headers
};`,
      },
    },
    {
      id: "sec-api",
      title: "API Security",
      summary: "Securing API endpoints: input validation, authentication, authorization policies, and API key management.",
      tags: ["API security", "input validation", "Zod", "authorization", "API key"],
      body: "**Input Validation**: Never trust client inputs. Always enforce validation on the server. Utilize validation libraries like **Zod** to validate schema payloads inside Server Actions and API routes.\n\n**Authentication vs Authorization**:\n- Authentication: Resolves **who** is requesting resource access (e.g. valid session credentials).\n- Authorization: Verifies if the authenticated entity holds the **permission** level required to invoke the command (RBAC/ABAC models).\n\n**API Keys**: Required for server-to-server communication. Cache secrets in environment configurations rather than committing them to version control. Set up key rotation policies and monitor logs to spot anomalies.\n\n**Principle of Least Privilege**: Ensure endpoints yield only the exact database rows required by the UI view. Filter data models before serializing responses.\n\n**Parameterized Queries**: Protect against SQL injection vectors by querying databases through secure ORMs (e.g. Prisma or Drizzle) or parameterized query bindings, never string concatenation.",
      subtopics: [
        {
          title: "Input Validation via Zod",
          body: "Parse incoming payloads through schema filters to block SQL injection and junk data prior to processing database commands.",
          codeExample: {
            language: "typescript",
            code: `// app/api/users/route.ts
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.string().email().toLowerCase(),
  role: z.enum(["user", "moderator"]), // forbids passing "admin" values
  age: z.number().int().min(13).max(120).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: "Invalid payload input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, role } = result.data;
  const user = await prisma.user.create({ data: { name, email, role } });
  return Response.json(user, { status: 201 });
}`,
          },
        },
        {
          title: "Row-Level Authorization",
          body: "Ensure requests query resources owned strictly by the authenticated session owner, rather than verifying authentication states in isolation.",
          codeExample: {
            language: "typescript",
            code: `// app/api/posts/[id]/route.ts
import { auth } from "@/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { authorId: true },
  });

  if (!post) return new Response("Not Found", { status: 404 });

  // Ownership verification check
  if (post.authorId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}`,
          },
        },
      ],
    },
  ],
};

import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const optimizeSection: KnowledgeSection = {
  id: "optimize",
  title: "Web Optimization",
  icon: "Gauge",
  description: "Performance optimization strategies for React and Next.js — Vite configurations, Core Web Vitals, CDNs, and bundle sizing.",
  style: {
    iconColor: "text-orange-500",
    headerBg: "bg-orange-500/10 dark:bg-orange-500/[0.08]",
    headerBorder: "border-orange-500/20 dark:border-orange-500/30",
    accentBorder: "border-orange-500/50 dark:border-orange-500/30",
    sidebarBg: "bg-orange-500/10",
    sidebarText: "text-orange-700 dark:text-orange-300",
  },
  items: [
    {
      id: "opt-vite-react",
      title: "Vite for React.js",
      summary: "Optimizing Vite configuration: code-splitting, lazy loading, tree shaking, and build performance.",
      tags: ["Vite", "code splitting", "lazy loading", "tree shaking", "rollup"],
      body: '**Vite** leverages native ES modules during development (bypassing bundling) and Rollup for production builds — yielding significantly faster build times than Webpack.\n\n**Automatic Code-Splitting**: Vite splits chunks automatically based on route boundaries and dynamic imports. Every `import()` declaration spawns a distinct code chunk.\n\n**Manual Chunks**: Configure `build.rollupOptions.output.manualChunks` to group stable third-party packages into separate vendor chunks, preventing users from re-downloading unchanged libraries.\n\n**Tree Shaking**: Rollup strips dead code branches automatically from ES modules. Ensure your dependency tree declares \\"sideEffects\\": false in package.json to optimize this output.\n\n**Asset Inlining**: Resource assets smaller than `assetsInlineLimit` (defaulting to 4KB) are inline-encoded as base64 strings to reduce HTTP request roundtrips.',
      subtopics: [
        {
          title: "Optimized vite.config.ts",
          body: "Recommended configuration for production builds: separating vendor packages, compressing assets, and managing chunk limits.",
          codeExample: {
            language: "typescript",
            code: `// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 500, // KB limit
  },
  optimizeDeps: {
    include: ["react", "react-dom"], // pre-bundle heavy deps
  },
});`,
          },
        },
        {
          title: "Lazy Loading Routes",
          body: "Use `React.lazy()` paired with `<Suspense>` to implement route-level code splitting, loading Javascript assets only when the user requests the path.",
          codeExample: {
            language: "tsx",
            code: `import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}`,
          },
        },
      ],
    },
    {
      id: "opt-nextjs-perf",
      title: "Next.js Performance",
      summary: "next/image, next/font, Turbopack, bundle analyzers, and Next.js built-in optimizations.",
      tags: ["next/image", "next/font", "Turbopack", "bundle analyzer", "ISR"],
      body: "Next.js offers a range of default optimizations out-of-the-box when consuming its standard APIs:\n\n**next/image**: Performs dynamic resizing, formats images to WebP/AVIF, lazy loads, and serves assets via CDNs. Declaring strict `width` and `height` properties prevents Cumulative Layout Shift.\n\n**next/font**: Downloads Google Fonts at build time to host them locally. This guarantees zero layout shift and respects user privacy.\n\n**Turbopack** (Next.js 15+): A Webpack replacement for local dev execution, yielding up to 700x faster incremental compilation steps. Enabled via `next dev --turbopack`.\n\n**ISR (Incremental Static Regeneration)**: Regenerates static assets in the background based on a designated `revalidate` interval to serve fresh database updates instantly.\n\n**Partial Pre-rendering (PPR)**: Pre-renders static frames while streaming dynamic contents over a single request connection.",
      subtopics: [
        {
          title: "Bundle Analyzer",
          body: "Configure `@next/bundle-analyzer` to analyze compilation chunk weights visually and discover optimization candidates.",
          codeExample: {
            language: "javascript",
            code: `// next.config.mjs
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({
  // standard next config
});

// Command: ANALYZE=true bun run build`,
          },
        },
        {
          title: "next/image best practices",
          body: "Assign the `priority` property to LCP-critical images (above-the-fold candidates). Supply the `sizes` attribute to ensure browsers select the correct image breakpoint size.",
          codeExample: {
            language: "tsx",
            code: `import Image from "next/image";

// Hero image — above the fold, mark as priority
<Image
  src="/hero.jpg"
  alt="Hero banner"
  width={1200}
  height={600}
  priority  // preload immediately
  sizes="(max-width: 768px) 100vw, 1200px"
/>

// Content image — lazy load by default
<Image
  src="/article.jpg"
  alt="Article screenshot"
  width={800}
  height={400}
  sizes="(max-width: 768px) 100vw, 800px"
/>`,
          },
        },
      ],
    },
    {
      id: "opt-loading-strategies",
      title: "Loading Strategies",
      summary: "Lazy loading, Suspense boundaries, skeleton screens, and priority-based loading.",
      tags: ["Suspense", "skeleton", "lazy", "Intersection Observer", "priority"],
      body: "An optimal loading strategy ensures the user interface feels instantaneous even while network requests are active.\n\n**Suspense + Error Boundary**: Wrap async component layers in `<Suspense>` (with loading skeleton fallbacks) and `<ErrorBoundary>` (with error messaging placeholders).\n\n**Skeleton Screens**: Layout outlines mimicking the final shape of content components are preferred over spinners, providing users with a visual sense of progress.\n\n**Intersection Observer**: Defers mounting or loading off-screen components and assets until they enter the viewport. Simplify implementation using libraries like `react-intersection-observer`.\n\n**Priority-Based Loading**: Leverage browser resource directives (`preload`, `prefetch`, `preconnect`) to fetch critical layout assets early.",
      subtopics: [
        {
          title: "Skeleton Pattern",
          body: "Align skeleton placeholder components to match final layout dimensions to prevent visual jumps (Layout Shift).",
          codeExample: {
            language: "tsx",
            code: `// Skeleton component
function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-lg border p-4">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-20 rounded bg-muted" />
    </div>
  );
}

// Usage inside a Suspense boundary
<Suspense fallback={<CardSkeleton />}>
  <ArticleCard id={id} />
</Suspense>`,
          },
        },
        {
          title: "Prefetch on Hover",
          body: "Prefetch destination route assets when a user hovers over a link element, reducing routing delays to zero.",
          codeExample: {
            language: "tsx",
            code: `// Next.js: Link components prefetch visible routes automatically
import Link from "next/link";

// Disable prefetch for low-traffic admin sections
<Link href="/admin" prefetch={false}>Admin panel</Link>

// React Router: manual prefetch execution
import { useNavigate } from "react-router-dom";

function NavItem({ to, children }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onMouseEnter={() => import(\`../pages/\${to}\`)} // prefetch page chunk
      onClick={(e) => { e.preventDefault(); navigate(to); }}
    >
      {children}
    </a>
  );
}`,
          },
        },
      ],
    },
    {
      id: "opt-cdn-assets",
      title: "CDN & Assets",
      summary: "CDN integration, cache control headers, static asset optimization, and edge deployments.",
      tags: ["CDN", "cache-control", "edge", "Cloudflare", "asset hashing"],
      body: "CDNs (Content Delivery Networks) cache and serve static resources from Points of Presence (PoPs) closest to users, minimizing latency.\n\n**Asset Hashing**: Compilers inject unique hashes into asset filenames (e.g. `main.a1b2c3.js`), permitting the server to assign immutable caching rules (`Cache-Control: max-age=31536000, immutable`).\n\n**HTML Cache Settings**: The raw HTML documents should bypass caching or require revalidation (`max-age=0, must-revalidate`) because they point to newly hashed compiler outputs.\n\n**Edge Functions**: Execute serverless operations at Edge PoPs closer to users (e.g., Cloudflare Workers, Vercel Edge Middleware), bypassing central origin server latency.",
      subtopics: [
        {
          title: "Vercel/Next.js Cache Headers",
          body: "Next.js configures standard cache headers dynamically depending on the route and build assets.",
          codeExample: {
            language: "typescript",
            code: `// next.config.mjs — custom cache headers
export default {
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store", // disable caching for dynamic REST endpoints
          },
        ],
      },
    ];
  },
};`,
          },
        },
        {
          title: "Image CDN",
          body: "Serve image assets through CDN loaders configured for on-the-fly resizing and compression, such as Cloudinary, imgix, or Cloudflare Images.",
          codeExample: {
            language: "typescript",
            code: `// next.config.mjs — remote pattern configuration
export default {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.example.com",
        pathname: "/uploads/**",
      },
    ],
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

// src/lib/image-loader.ts
export default function cloudflareLoader({ src, width, quality }) {
  return \`https://imagecdn.example.com/\${src}?w=\${width}&q=\${quality ?? 75}\`;
}`,
          },
        },
      ],
    },
    {
      id: "opt-core-web-vitals",
      title: "Core Web Vitals",
      summary: "LCP, INP, CLS — measurement metrics, thresholds, and performance improvements.",
      tags: ["LCP", "INP", "CLS", "TTFB", "Web Vitals", "PageSpeed"],
      body: "**Core Web Vitals** are key web usability metrics tracked by Google that directly impact search engine ranking algorithms:\n\n**LCP (Largest Contentful Paint)**: Measures the time it takes to render the largest visible element within the viewport (typically hero elements or large headings). Thresholds: Good (≤2.5s), Poor (>4.0s). Fix: Preload hero resources and optimize TTFB.\n\n**INP (Interaction to Next Paint)**: Tracks latency for all user interactions (clicks, keyboard entry, touch screen taps). Thresholds: Good (≤200ms), Poor (>500ms). Fix: Break up long JS executions and use transitions.\n\n**CLS (Cumulative Layout Shift)**: Tallies unexpected layout shifts occurring throughout the page session. Thresholds: Good (≤0.1), Poor (>0.25). Fix: Maintain strict component aspect ratios.\n\n**TTFB (Time to First Byte)**: The delay between a user requesting a URL and receiving the initial byte from the server. Fix: Caching layers and database indexing.",
      subtopics: [
        {
          title: "Measuring via web-vitals",
          body: "Leverage the `web-vitals` library to measure and stream performance analytics from active user sessions (RUM).",
          codeExample: {
            language: "typescript",
            code: `// src/lib/vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: any) {
  navigator.sendBeacon("/api/vitals", JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    id: metric.id,
  }));
}

export function initVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}`,
          },
        },
        {
          title: "INP Optimization via startTransition",
          body: "Wrap non-urgent state updates in a transition. This allows React to prioritize keyboard/click feedback cycles.",
          codeExample: {
            language: "tsx",
            code: `import { useState, useTransition } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // Urgent: render the input character immediately

    startTransition(() => {
      // Non-urgent: filter operations on 10k items, interruptible by typing
      setResults(filterData(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultsList results={results} />}
    </>
  );
}`,
          },
        },
      ],
    },
    {
      id: "opt-bundle",
      title: "Bundle Optimization",
      summary: "Tree shaking, dynamic imports, preload/prefetch directives, and bundle sizing.",
      tags: ["tree shaking", "dynamic import", "preload", "prefetch", "bundle size"],
      body: 'Smaller build bundles guarantee faster downloads, parsing times, and execution cycles.\n\n**Tree Shaking**: Strips unused export exports from compilation outputs. Requires ES Modules syntax (`import`/`export`) and side-effect-free code. Import specific functions rather than full objects (e.g. `import { debounce } from \'lodash-es\'`).\n\n**Dynamic Imports**: Declaring async imports (`import()`) splits compiled outputs into lazy chunks, perfect for splitting route files or heavier widgets.\n\n**`<link rel="preload">`**: Instructs the browser to prioritize fetching critical resources (like above-the-fold fonts or hero images) early during document parsing.\n\n**`<link rel="prefetch">`**: Recommends fetching assets in the background during browser idle times to speed up future route transitions.\n\n**Compression**: Brotli delivers higher compression ratios than Gzip. Vite builds, Cloudflare, and Vercel support Brotli out of the box.',
      subtopics: [
        {
          title: "Analyzing bundles with source-map-explorer",
          body: "Use visual tools like `source-map-explorer` to inspect bundle weights and catch rogue dependencies.",
          codeExample: {
            language: "bash",
            code: `# Installation
npm install --save-dev source-map-explorer

# Vite: enable sourcemaps in build settings
# vite.config.ts: build.sourcemap = true

# Run analysis
npx source-map-explorer dist/assets/*.js`,
          },
        },
        {
          title: "Importing heavy libraries correctly",
          body: "Avoid importing massive packages when only small utility segments are utilized.",
          codeExample: {
            language: "typescript",
            code: `// BAD: imports the entire lodash module (70KB+)
import _ from "lodash";
const result = _.debounce(fn, 300);

// GOOD: imports only the required method (few KB)
import debounce from "lodash-es/debounce";
const result = debounce(fn, 300);

// date-fns support tree-shaking out of the box when using named imports:
import { format, parseISO } from "date-fns";

// BAD: imports all lucide icons
import * as Icons from "lucide-react";

// GOOD: imports specific lucide icons
import { Search, X, ChevronDown } from "lucide-react";`,
          },
        },
      ],
    },
  ],
};

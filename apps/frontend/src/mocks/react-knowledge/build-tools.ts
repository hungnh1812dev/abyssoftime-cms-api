import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const buildToolsSection: KnowledgeSection = {
  id: "build-tools",
  title: "Web Build Tools",
  icon: "Wrench",
  description: "Deep comparison of webpack, Vite, Rollup, esbuild, Turbopack, and Rspack — covering architecture, performance, configuration, and when to use each.",
  style: {
    iconColor: "text-stone-500",
    headerBg: "bg-stone-500/10 dark:bg-stone-500/[0.08]",
    headerBorder: "border-stone-500/20 dark:border-stone-500/30",
    accentBorder: "border-stone-500/50 dark:border-stone-500/30",
    sidebarBg: "bg-stone-500/10",
    sidebarText: "text-stone-700 dark:text-stone-300",
  },
  items: [
    {
      id: "conceptual-model",
      title: "Conceptual Model & Architecture",
      summary: "How each tool approaches the problem of bundling and serving JavaScript.",
      tags: ["webpack", "vite", "rollup", "esbuild", "turbopack", "rspack"],
      body: "Each build tool solves the same problem differently:\n\n**Webpack** — Module graph based. Resolves every `require`/`import` statically, builds a complete dependency graph, then emits optimized chunks. Highly configurable through loaders (transform files) and plugins (tap into the compilation lifecycle). Powers most CRA and older Next.js setups.\n\n**Vite** — Two-phase design. In dev, it serves files as native ES Modules directly to the browser with on-demand transforms via esbuild — no bundling step, so cold start is nearly instant. In production, it uses Rollup to produce optimized bundles (tree-shaken, code-split).\n\n**Rollup** — ESM-first bundler designed for libraries. Outputs clean, spec-compliant ES Modules or CJS. Its tree-shaking is the most aggressive because it was built around static ESM analysis from day one. Vite delegates its production builds to Rollup.\n\n**esbuild** — Written in Go, parallelized across CPU cores. Primarily a transformer and bundler — not a dev server. 10–100× faster than webpack/Rollup for raw transforms. Used as the transformer inside Vite's dev server and as a minifier in many pipelines.\n\n**Turbopack** — Rust-based incremental bundler built by Vercel as webpack's successor. Computes a task graph and caches at the function level, so only affected modules are recomputed. Integrated into Next.js 13+ (`next dev --turbo`).\n\n**Rspack** — Rust port of webpack's architecture. Drop-in compatible with most webpack configs and plugins. Built by ByteDance. Offers 5–10× faster builds than webpack while preserving the loader/plugin API.",
      subtopics: [
        {
          title: "Why native ESM in dev matters",
          body: "Traditional bundlers (webpack, Parcel v1) must process the entire module graph on cold start. In a large project with 2,000 modules, this means 2,000+ transforms before the browser sees anything. Vite's approach: the browser requests a module, Vite transforms only that one file on demand, and the browser follows `import` statements itself. Cold start drops from seconds to milliseconds.",
        },
        {
          title: "Rollup vs webpack output quality",
          body: "Rollup's output is smaller and more readable — it 'rolls up' modules into a flat bundle with minimal boilerplate. webpack wraps each module in a function for its own module system (`__webpack_require__`), adding runtime overhead. For libraries, Rollup output is preferred. For apps with complex code splitting and dynamic imports, webpack's runtime handles those cases more robustly.",
        },
      ],
    },
    {
      id: "dev-server-hmr",
      title: "Dev Server & HMR Performance",
      summary: "Cold start times and Hot Module Replacement latency across tools.",
      tags: ["HMR", "dev-server", "performance", "DX"],
      body: "**Cold start** (time until the browser shows the app after `npm run dev`):\n\n- **Vite**: 200–500ms regardless of project size — only the entry and directly-requested modules are processed\n- **Rspack**: 1–3s (vs webpack's 10–30s on the same project)\n- **Turbopack**: 1–2s in Next.js dev mode\n- **webpack (CRA)**: 10–60s on large projects\n- **Parcel**: 3–8s (zero-config, still full graph scan)\n\n**HMR latency** (time from saving a file to seeing the update):\n\n- **Vite**: <50ms — only the changed module is invalidated and re-fetched\n- **Turbopack**: <100ms with function-level caching\n- **Rspack**: ~100–300ms\n- **webpack**: 500ms–3s depending on bundle size and HMR configuration\n\n**Why Vite HMR is fast**: Because modules are already ES Modules in the browser, Vite only needs to invalidate the changed file's URL. The browser re-imports it. webpack HMR must re-run the entire affected chunk's hot update logic.",
      subtopics: [
        {
          title: "Vite HMR boundary",
          body: "Vite propagates HMR up the import chain until it hits a module that has registered an `import.meta.hot.accept()` handler. Framework plugins (e.g. `@vitejs/plugin-react`) register these handlers on components. If no handler is found, Vite falls back to a full page reload.",
        },
        {
          title: "webpack HMR configuration pitfalls",
          body: "webpack HMR requires `webpack-dev-server` and `HotModuleReplacementPlugin`. The HMR runtime patches modules in place. Common issues: stale closures in module state, missing `module.hot.accept()` calls, and slow updates when a single change invalidates a large shared chunk.",
        },
      ],
    },
    {
      id: "build-performance",
      title: "Build Performance",
      summary: "Production build benchmarks and caching strategies.",
      tags: ["performance", "build-speed", "caching"],
      body: "**Relative build speed** (same 50,000-line React app, approximate):\n\n| Tool | Build time | vs webpack |\n|---|---|---|\n| webpack 5 | 60s | baseline |\n| Vite (Rollup) | 15s | 4× faster |\n| Rspack | 8s | 7.5× faster |\n| Turbopack | 5s | 12× faster |\n| esbuild alone | 0.5s | 120× faster |\n\n**Why esbuild is so fast**: Go routines allow true parallelism across CPU cores. The entire parse → transform → bundle pipeline runs in one pass with no unnecessary intermediate representations. However, esbuild's bundling mode lacks some advanced Rollup features like the most aggressive tree-shaking and complex chunk splitting.\n\n**Persistent caching**: webpack 5 introduced filesystem caching — subsequent builds are 5–10× faster if the cache is warm. Turbopack uses a function-level cache backed by content hashes. Rspack inherits webpack 5's cache model.\n\n**Minification**: Most tools delegate to esbuild or Terser for minification. Vite uses esbuild for minification by default (faster than Terser, slightly larger output). webpack uses Terser by default.",
      subtopics: [
        {
          title: "When esbuild alone isn't enough",
          body: "esbuild is excellent as a transformer but lacks: CSS Modules with type generation, complex PostCSS pipelines, Rollup-style chunk splitting, and some output format features. Production Vite builds use Rollup instead of esbuild for its richer plugin API and output control.",
        },
      ],
    },
    {
      id: "configuration-complexity",
      title: "Configuration Complexity",
      summary: "Zero-config vs explicit configuration — the tradeoff between convenience and control.",
      tags: ["config", "DX", "zero-config"],
      body: "**Zero-config tools** (sensible defaults, minimal setup):\n- **Parcel**: truly zero-config, auto-detects entry points and transformers from `package.json`\n- **Vite**: zero-config for plain JS/TS projects; framework presets (React, Vue, Svelte) add one plugin import\n\n**Moderate config** (structured, documented):\n- **Rollup**: `rollup.config.js` with explicit `input`, `output`, and `plugins` array — clean and readable\n- **esbuild**: programmatic API or CLI flags — terse but not composable for complex pipelines\n\n**High config** (powerful but verbose):\n- **webpack**: `webpack.config.js` with loaders, plugins, resolve aliases, optimization splits, and devServer — hundreds of options, easy to misconfigure\n- **Rspack**: Same API as webpack, so same complexity, but with much faster feedback\n\n**Vite config example** (React app with path aliases):\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport path from 'path';\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },\n  server: { port: 3000 },\n});\n```\n\n**webpack equivalent** requires: `babel-loader`, `ts-loader` or `esbuild-loader`, `HtmlWebpackPlugin`, `MiniCssExtractPlugin`, `TerserPlugin`, and manual `resolve.alias` — 50–100 lines minimum.",
      codeExample: {
        language: "typescript",
        code: `// vite.config.ts — complete React + TS + path aliases setup
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    target: "es2020",
    sourcemap: true,
  },
});

// rspack.config.js — webpack-compatible, same shape as webpack.config.js
const { defineConfig } = require("@rspack/cli");
module.exports = defineConfig({
  entry: "./src/index.tsx",
  module: {
    rules: [{ test: /\\.tsx?$/, use: "builtin:swc-loader" }],
  },
  resolve: { extensions: [".tsx", ".ts", ".js"] },
});`,
      },
    },
    {
      id: "plugin-ecosystem",
      title: "Plugin & Loader Ecosystem",
      summary: "Compatibility, breadth, and quality of the plugin ecosystems.",
      tags: ["plugins", "loaders", "ecosystem"],
      body: "**webpack** has the largest ecosystem: thousands of loaders (transform any file type) and plugins. Most established tools (Storybook, Module Federation, CSS Modules, SVG as components) have native webpack support.\n\n**Vite** uses the Rollup plugin API plus Vite-specific hooks. The ecosystem grew rapidly — most webpack use cases now have Vite equivalents. Key plugins: `@vitejs/plugin-react`, `vite-plugin-svgr`, `vite-tsconfig-paths`, `vite-plugin-pwa`.\n\n**Rollup** plugins are the foundation for Vite. Rollup-compatible plugins work in Vite via `rollup:` prefix or automatic compatibility. Coverage: excellent for library builds, moderate for app features.\n\n**esbuild** plugins are Go-based (for the Go API) or JS-based (for the JS API). Limited ecosystem — not meant for full app build orchestration.\n\n**Rspack** aims for webpack plugin/loader compatibility. Many webpack plugins work unchanged; some require `@rspack/*` variants (e.g., `@rspack/plugin-react-refresh` instead of `react-refresh/webpack`).\n\n**Turbopack** (inside Next.js) uses a different plugin model — not directly extensible yet outside of Next.js's config API.",
      subtopics: [
        {
          title: "webpack Module Federation",
          body: "Module Federation (webpack 5) is webpack's flagship feature for micro-frontends — it allows multiple independent builds to share modules at runtime. No equivalent exists in Vite/Rollup out of the box. `@originjs/vite-plugin-federation` approximates it but with limitations. This is a primary reason some large orgs stay on webpack.",
        },
      ],
    },
    {
      id: "tree-shaking",
      title: "Tree Shaking & Code Splitting",
      summary: "How each tool eliminates dead code and splits output into optimal chunks.",
      tags: ["tree-shaking", "code-splitting", "optimization", "dead-code"],
      body: "**Tree shaking** removes exported-but-unused code from the final bundle. It requires static ESM (`import`/`export`) — CommonJS (`require`) cannot be statically analyzed.\n\n**Rollup**: Most aggressive tree-shaking. Analyzes the entire module graph at once and includes only what is reachable from entry points. Pure function annotations (`/*#__PURE__*/`) allow removing side-effect-free calls.\n\n**Vite (production)**: Rollup-quality tree-shaking, since it delegates to Rollup for builds.\n\n**webpack**: Tree shaking via `usedExports` + Terser DCE. Slightly less aggressive than Rollup because webpack wraps each module in a function, limiting static analysis across module boundaries. `sideEffects: false` in `package.json` helps significantly.\n\n**esbuild**: Good tree-shaking for ESM. Does not support `sideEffects` field in `package.json`.\n\n**Code splitting** (loading only what is needed for the current page):\n\n- **Dynamic `import()`** is the universal primitive — all tools support it\n- **Vite/Rollup**: `manualChunks` in config for explicit splitting strategy\n- **webpack**: `optimization.splitChunks` with complex rules for vendor/common chunks; `webpackChunkName` magic comments\n- **Rspack**: same API as webpack `splitChunks`",
      codeExample: {
        language: "typescript",
        code: `// Dynamic import — works in all tools
const { heavyChart } = await import("./HeavyChart");

// Vite: explicit chunk naming via rollup option
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          charts: ["recharts", "d3"],
        },
      },
    },
  },
});

// webpack: magic comment chunk naming
const LazyPage = React.lazy(() =>
  import(/* webpackChunkName: "lazy-page" */ "./LazyPage")
);`,
      },
    },
    {
      id: "app-vs-library",
      title: "App vs Library Use Cases",
      summary: "Choosing the right tool based on what you are building.",
      tags: ["library", "app", "use-cases", "output-format"],
      body: "**Building an application** (SPA, SSR, MPA — end users consume it via a browser):\n\n- **Vite** — best default choice for new apps (fast DX, framework support, Rollup quality output)\n- **Next.js / webpack** — if you need Module Federation, or are migrating an existing CRA project\n- **Rspack** — if you need webpack ecosystem compatibility but want faster builds\n- **Turbopack** — if you're on Next.js 13+\n\n**Building a library** (other developers install it via npm):\n\n- **Rollup** — gold standard for libraries; clean ESM + CJS dual output, no runtime overhead\n- **Vite library mode** — wraps Rollup with sensible library defaults; good for UI component libraries\n- **esbuild** — fastest transform, good for simple utilities with no complex code splitting needs\n- **tsup** — zero-config wrapper around esbuild, the modern default for TypeScript libraries\n\n**Key library build requirements**:\n- Dual CJS + ESM output (for older Node.js and modern bundlers)\n- Externalize peer dependencies (don't bundle React into a React component library)\n- Type declarations (`.d.ts` files)\n- Sourcemaps",
      codeExample: {
        language: "typescript",
        code: `// Vite library mode (vite.config.ts)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [react(), dts()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => \`my-lib.\${format}.js\`,
    },
    rollupOptions: {
      external: ["react", "react-dom"], // don't bundle peer deps
    },
  },
});

// tsup (zero-config library bundler)
// tsup.config.ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react"],
});`,
      },
    },
    {
      id: "framework-integrations",
      title: "Framework Integrations",
      summary: "Which frameworks use which bundler and what that means for your project.",
      tags: ["next.js", "remix", "astro", "svelte", "framework"],
      body: "**Next.js**:\n- Default bundler: webpack (pages router and app router)\n- Turbopack: opt-in with `next dev --turbo` (stable in Next.js 14+, production builds still in progress)\n- You do not configure webpack directly for most use cases — Next.js wraps it\n\n**Create React App (CRA)** — deprecated:\n- webpack under the hood, hidden behind `react-scripts`\n- Migration path: Vite (most common), Rspack with Rsbuild\n\n**Vite-based frameworks**:\n- **SvelteKit**: Vite is the build system\n- **Remix** (Vite adapter, v2+): migrated from their custom compiler to Vite\n- **Astro**: uses Vite for dev and build\n- **Nuxt 3**: uses Vite\n- **Solid Start**: uses Vite\n\n**Rsbuild** (by ByteDance):\n- App-level build tool built on Rspack (like CRA/Vite but webpack-compatible)\n- Drop-in CRA replacement with much faster builds\n\n**Analog** (Angular + Vite): brings Vite to Angular apps.",
      subtopics: [
        {
          title: "Migrating from CRA to Vite",
          body: '1. Remove `react-scripts`, add `vite` and `@vitejs/plugin-react`\n2. Add `vite.config.ts`\n3. Move `public/index.html` to project root and replace `%PUBLIC_URL%` with Vite\'s base URL syntax\n4. Replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*`\n5. Remove `src/react-app-env.d.ts`, add `/// <reference types="vite/client" />`\n6. Update `package.json` scripts: `vite` / `vite build` / `vite preview`',
        },
      ],
    },
    {
      id: "migration-webpack-to-vite",
      title: "Migration Guide: webpack → Vite",
      summary: "Practical steps and common pitfalls when moving a webpack project to Vite.",
      tags: ["migration", "webpack", "vite", "CJS", "ESM"],
      body: "**Step-by-step migration**:\n\n1. **Install Vite** — `npm install -D vite @vitejs/plugin-react`\n2. **Create `vite.config.ts`** at the project root\n3. **Move `index.html`** from `public/` to the project root — Vite uses it as the entry point\n4. **Replace `%PUBLIC_URL%`** references with `/` (or remove — Vite serves from root by default)\n5. **Rename env vars** — `REACT_APP_*` → `VITE_*`, access via `import.meta.env.VITE_*` instead of `process.env.*`\n6. **Remove webpack-specific imports** — inline `url?`, `raw-loader!`, `worker-loader!` syntax → Vite equivalents (`?url`, `?raw`, `?worker`)\n7. **Convert `require()` to ESM imports** — Vite's dev server does not support CJS by default\n8. **Replace CRA globals** — `process.env.NODE_ENV` → `import.meta.env.MODE`\n9. **Update path aliases** — configure in `vite.config.ts` `resolve.alias` instead of `tsconfig.json` paths (also add to tsconfig for TS resolution)\n10. **Test** — run `vite` and fix remaining issues iteratively",
      subtopics: [
        {
          title: "CommonJS compatibility pitfalls",
          body: "The most common migration pain point: packages that only ship CJS (no ESM build). Vite's `optimizeDeps` pre-bundles these with esbuild automatically, but you may need to add them to `optimizeDeps.include` manually. For packages that cannot be auto-converted, use the `vite-plugin-commonjs` plugin.",
        },
        {
          title: "Dynamic require() in source code",
          body: "If your source code uses `require()` for dynamic imports (e.g., `require(\`./locales/\${lang}.json\``)), you must convert these to `import()` or `import.meta.glob`. `import.meta.glob` is Vite's equivalent of webpack's `require.context`:\n```typescript\nconst modules = import.meta.glob('./locales/*.json');\nconst locale = await modules[`./locales/${lang}.json`]();\n```",
        },
      ],
    },
    {
      id: "decision-guide",
      title: "Decision Guide",
      summary: "Which tool to choose based on your specific situation.",
      tags: ["decision", "comparison", "when-to-use"],
      body: "**Starting a new React/Vue/Svelte SPA or SSR app?**\n→ **Vite** — fastest DX, framework plugins available, Rollup-quality prod builds\n\n**Starting a new Next.js app?**\n→ **Next.js defaults** (webpack now, Turbopack when you opt in) — let Next.js manage the bundler\n\n**Building a npm library or design system?**\n→ **Rollup** (full control) or **tsup** (zero-config, wraps esbuild) or **Vite library mode** (if you want a single config for both dev and build)\n\n**Migrating a large CRA / webpack app where webpack compatibility matters?**\n→ **Rspack** (via Rsbuild) — drop-in webpack API, 5–10× faster, minimal migration cost\n\n**Working in a monorepo with complex code sharing and micro-frontends?**\n→ **webpack + Module Federation** (no comparable alternative yet) or wait for Rspack's Module Federation support (available in Rspack 1.x)\n\n**Need raw transform speed for a CLI tool or build script?**\n→ **esbuild** directly — simplest API, fastest output, no dev server needed\n\n**On Next.js and hitting slow dev startup?**\n→ Enable **Turbopack**: `next dev --turbopack` (Next.js 14+)\n\n**Summary table**:\n\n| Scenario | Recommended |\n|---|---|\n| New app | Vite |\n| New Next.js app | Next.js (built-in) |\n| npm library | tsup or Rollup |\n| Legacy webpack migration | Rspack / Rsbuild |\n| Micro-frontends | webpack Module Federation |\n| Raw speed | esbuild |\n| Large Next.js app (slow dev) | Turbopack (`--turbopack`) |",
    },
  ],
};

import type { InterviewSection } from "../types";

export const htmlCssSection: InterviewSection = {
  id: "html-css",
  label: "II-E. HTML & CSS",
  category: "Technical",
  iconName: "Palette",
  color: "text-pink-500",
  bgColor: "bg-pink-500/10",
  questions: [
    {
      id: "QE.1",
      question: "CSS specificity — how is it calculated? Explain cascade, specificity, and inheritance.",
      tags: ["CSS", "specificity", "cascade", "inheritance"],
      answer: `**Specificity** is a weight assigned to a CSS selector, calculated as a 4-part tuple **(inline, ID, class/attr/pseudo-class, element/pseudo-element)**:

| Selector              | Specificity |
|-----------------------|-------------|
| \`*\`                 | 0,0,0,0     |
| \`div\`               | 0,0,0,1     |
| \`.class\`            | 0,0,1,0     |
| \`#id\`               | 0,1,0,0     |
| \`style=""\`          | 1,0,0,0     |
| \`!important\`        | Overrides all (avoid) |

**Cascade:** When multiple rules target the same element, specificity determines which wins. Tie? Last rule in source order wins.

**Inheritance:** Some properties (color, font-size, line-height) are inherited by children. Others (margin, padding, border) are not. You can force inheritance with \`inherit\` keyword.

In Tailwind projects, specificity is less of an issue because utility classes have low specificity and you compose rather than override.`,
    },
    {
      id: "QE.2",
      question: "CSS Box Model — `box-sizing: content-box` vs `border-box`. `margin: auto` centering.",
      tags: ["box model", "box-sizing", "margin auto", "CSS layout"],
      answer: `**content-box (default):** \`width\` sets the content area only. Total rendered width = width + padding + border.

**border-box:** \`width\` includes padding and border. \`width: 200px\` with \`padding: 20px\` → content is 160px. Predictable — all modern projects set \`* { box-sizing: border-box }\`.

**\`margin: auto\` centering:**
- Works for **block elements with a defined width**: \`margin: 0 auto\` → distributes remaining space equally left/right.
- **Does NOT work for vertical centering** in block flow (auto vertical margin = 0).
- **Works for vertical centering in flex/grid** containers: \`margin: auto\` in a flex item consumes all available space in both axes.

\`\`\`css
/* Old-school horizontal center */
.container { max-width: 1200px; margin: 0 auto; }

/* Flex full center */
.parent { display: flex; }
.child { margin: auto; } /* centers both axes */
\`\`\``,
    },
    {
      id: "QE.3",
      question: "Flexbox vs Grid — when to use each? Explain `flex-grow`, `flex-shrink`, `flex-basis`.",
      tags: ["Flexbox", "Grid", "flex-grow", "CSS layout"],
      answer: `**Flexbox:** One-dimensional layout (row OR column). Best for: navigation bars, card rows, aligning items in a line, distributing space along one axis.

**Grid:** Two-dimensional layout (rows AND columns). Best for: page layouts, data tables, image galleries, anything needing both row and column control.

Rule of thumb: **Flex for components, Grid for layouts.**

**Flex item sizing (the flex shorthand \`flex: grow shrink basis\`):**
- \`flex-basis\`: the initial size before growing/shrinking. \`auto\` = use the item's natural size; \`0\` = start from zero (useful with \`flex-grow\`).
- \`flex-grow\`: how much the item grows relative to siblings when there's free space. \`flex-grow: 1\` = take equal share.
- \`flex-shrink\`: how much the item shrinks when there's overflow. Default is 1 (can shrink); set to 0 to prevent shrinking.

\`flex: 1\` is shorthand for \`flex: 1 1 0%\` — take equal space, can grow and shrink.`,
    },
    {
      id: "QE.4",
      question: "CSS `position`: static, relative, absolute, fixed, sticky — explain each. When does `z-index` take effect?",
      tags: ["position", "z-index", "stacking context", "CSS"],
      answer: `- **static:** Default. Element in normal flow, ignores top/left/right/bottom.
- **relative:** In normal flow, but top/left/etc. offset it from its normal position. Creates a positioning context for absolute children.
- **absolute:** Removed from flow. Positions relative to the nearest ancestor with \`position ≠ static\`.
- **fixed:** Removed from flow. Positions relative to the viewport. Doesn't scroll with the page.
- **sticky:** Hybrid — behaves like \`relative\` until it hits the scroll threshold, then behaves like \`fixed\` within its scroll container.

**\`z-index\`** only works on elements with \`position ≠ static\` (or \`flex\`/\`grid\` items). It only controls stacking **within the same stacking context**.

**Stacking context** is created by: \`position\` + z-index, \`opacity < 1\`, \`transform\`, \`filter\`, \`will-change\`, etc. A child can never escape its parent's stacking context — so \`z-index: 9999\` inside an \`opacity: 0.99\` parent won't appear above elements outside that parent.`,
    },
    {
      id: "QE.5",
      question: "CSS animations — `transition` vs `animation` vs `requestAnimationFrame`. Which CSS properties are GPU-accelerated?",
      tags: ["CSS animation", "transition", "requestAnimationFrame", "GPU", "performance"],
      answer: `**\`transition\`:** Animate between two states on property change. Simple, declarative — attach to a CSS property, trigger via class toggle.

**\`animation\`:** Keyframe-based, can loop, play automatically, supports complex multi-step sequences.

**\`requestAnimationFrame\` (rAF):** JavaScript-based, called before each browser repaint (~16ms at 60fps). Full control over animation logic — for physics simulations, canvas animations, or things CSS can't express.

**GPU-accelerated (compositor-layer) properties — use these for smooth animations:**
- \`transform\` (translate, scale, rotate) ✓
- \`opacity\` ✓
- \`filter\` ✓ (some browsers)
- \`will-change: transform\` — promotes element to compositor layer proactively

**Avoid animating layout-triggering properties:**
- \`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\` → triggers layout + paint (expensive)
- Use \`transform: translate()\` instead of animating \`left\`/\`top\`

Rule: Animate only transform + opacity for jank-free 60fps animations.`,
    },
    {
      id: "QE.6",
      question: "CSS Custom Properties (variables) — how do they differ from preprocessor variables (SASS)? Real-world use case.",
      tags: ["CSS variables", "custom properties", "SASS", "theming"],
      answer: `**SASS variables** (\`$color: blue\`) are compiled away — they exist only at build time. You can't read or change them with JavaScript, and they don't respond to media queries or DOM changes.

**CSS custom properties** (\`--color: blue\`) are **live in the browser**:
- Cascade and inherit like any CSS property.
- Can be read and written with JavaScript: \`getComputedStyle(el).getPropertyValue('--color')\` / \`el.style.setProperty('--color', value)\`.
- Can be changed inside media queries, \`:root\`, component scopes.
- Enable runtime theming without rebuilding.

**Real-world use (this project):** TailwindCSS v3 + shadcn/ui uses CSS custom properties for the entire theme system:
\`\`\`css
:root {
  --background: 0 0% 100%;
  --foreground: 20 14.3% 4.1%;
}
.dark {
  --background: 20 14.3% 4.1%;
  --foreground: 0 0% 95.1%;
}
\`\`\`
Class dark mode toggle flips all variables at once — zero JavaScript theme logic needed.`,
    },
    {
      id: "QE.7",
      question: "BEM methodology — why use it? Are there drawbacks? How does CSS Modules / Tailwind solve the same problems?",
      tags: ["BEM", "CSS Modules", "Tailwind", "naming", "scoping"],
      answer: `**BEM (Block Element Modifier)** solves CSS naming collisions and scoping in global CSS files. \`.card__title--highlighted\` makes the hierarchy explicit and avoids specificity wars.

**Drawbacks:**
- Verbose class names.
- Hard to refactor — rename a component, rename all BEM classes.
- Discipline-dependent — team inconsistency defeats the purpose.

**CSS Modules:** Scopes class names to the file at build time. \`.title\` in \`Card.module.css\` becomes \`.Card_title__abc123\` in the output. Zero naming collisions, normal class names, works well with component-based architecture.

**Tailwind:** Eliminates the naming problem entirely — utility classes have predefined names. Colocation of styles with markup. Downside: verbose JSX, harder to extract recurring patterns (use \`@apply\` or components instead).

In React projects, CSS Modules or Tailwind is almost always preferable to BEM for exactly these reasons. I use Tailwind with shadcn/ui on this project.`,
    },
    {
      id: "QE.8",
      question: "`display: none` vs `visibility: hidden` vs `opacity: 0` — what are the rendering differences?",
      tags: ["display none", "visibility hidden", "opacity", "rendering", "accessibility"],
      answer: `| | \`display: none\` | \`visibility: hidden\` | \`opacity: 0\` |
|---|---|---|---|
| Takes up space | No — removed from flow | Yes | Yes |
| Interactable | No | No | Yes — still clickable! |
| Transition/animation | Can't animate display | Can animate visibility | Smooth fade |
| Screen reader | Hidden | Hidden | Still read (may confuse users) |
| Triggers layout | Yes (reflow on show) | No | No |

**Practical implications:**
- **\`display: none\`** — fully removes from layout. Use for truly hidden content. Show/hide triggers reflow.
- **\`visibility: hidden\`** — invisible but holds space. Good for layout stability (prevent jumps).
- **\`opacity: 0\`** — visually transparent but still occupies space AND is interactive. Often combined with \`pointer-events: none\` to disable clicks. GPU-composited — cheap to animate.

For accessible show/hide, also consider \`aria-hidden="true"\` for screen reader control independently of visual display.`,
    },
    {
      id: "QE.9",
      question: "Responsive design — `rem` vs `em` vs `px` vs `vw`. When would you use each?",
      tags: ["rem", "em", "px", "vw", "responsive", "accessibility"],
      answer: `- **px:** Absolute. Precise, not affected by user font size settings. Use for: borders (1px), shadows, precise pixel values that should never scale.
- **rem** (\`root em\`): Relative to the root \`<html>\` font size (typically 16px). Scales with user font size preferences. Use for: font sizes, spacing, layout dimensions that should respect user accessibility settings.
- **em:** Relative to the current element's font size. Compounds with nesting — risky for font-size (nested ems multiply). Safe for: padding/margin relative to the element's own text size (button padding that scales with its label).
- **vw/vh:** Percentage of viewport width/height. Use for: full-screen sections, fluid typography (\`clamp()\`), viewport-relative positioning.

**Best practice:**
\`\`\`css
/* Fluid typography that respects user zoom */
font-size: clamp(1rem, 1rem + 1vw, 1.5rem);
/* Spacing in rem for accessibility */
padding: 1rem 1.5rem;
/* Borders in px for sharpness */
border: 1px solid;
\`\`\``,
    },
    {
      id: "QE.10",
      question: "How do you implement a dark mode toggle? What are the trade-offs between class-based and `prefers-color-scheme` approaches?",
      tags: ["dark mode", "prefers-color-scheme", "CSS variables", "Tailwind"],
      answer: `**Two approaches:**

**1. \`prefers-color-scheme\` media query (OS-driven):**
\`\`\`css
@media (prefers-color-scheme: dark) { :root { --bg: #000; } }
\`\`\`
Pro: Zero JS, no flash of wrong theme on load.
Con: User can't override within your app — stuck with OS setting.

**2. Class-based (user-controllable):**
\`\`\`css
:root { --bg: #fff; }
.dark { --bg: #000; }
\`\`\`
Toggle: \`document.documentElement.classList.toggle('dark')\`. Save preference to localStorage.
Pro: User controls it independently of OS.
Con: Potential flash of wrong theme on first load (before JS reads localStorage).

**Fix the flash:** Use a blocking script in \`<head>\` (before React hydrates) that reads localStorage and sets the class synchronously.

**This project** uses Tailwind's class-based dark mode (\`darkMode: 'class'\` in tailwind.config). shadcn/ui provides the same CSS variable structure as shown above — toggling the \`.dark\` class on \`<html>\` flips the entire theme.`,
    },
  ],
};

export const webPerfSection: InterviewSection = {
  id: "web-performance",
  label: "II-F. Web Performance",
  category: "Technical",
  iconName: "Zap",
  color: "text-amber-500",
  bgColor: "bg-amber-500/10",
  questions: [
    {
      id: "QF.1",
      question: "Core Web Vitals — explain LCP, FID/INP, CLS. What causes poor scores and how do you fix them?",
      tags: ["Core Web Vitals", "LCP", "INP", "CLS", "performance"],
      answer: `**LCP (Largest Contentful Paint):** Time until the largest content element renders. Target: ≤2.5s.
- Causes: slow server, render-blocking resources, large images without optimisation.
- Fixes: preload LCP image (\`<link rel="preload">\`), use \`next/image\` with priority, eliminate render-blocking CSS/JS, CDN.

**INP (Interaction to Next Paint — replaced FID):** Responsiveness of all interactions. Target: ≤200ms.
- Causes: long tasks blocking the main thread, heavy event handlers, synchronous DOM updates.
- Fixes: break long tasks (\`setTimeout\`, \`scheduler.yield\`), virtualise long lists, move heavy work to Web Workers.

**CLS (Cumulative Layout Shift):** Unexpected layout movement during loading. Target: ≤0.1.
- Causes: images/iframes without dimensions, late-loading fonts (FOUT), dynamically injected content above fold.
- Fixes: always set \`width\` and \`height\` on images (\`next/image\` does this), \`font-display: optional\` or \`swap\`, reserve space for ads/banners with \`min-height\`.`,
    },
    {
      id: "QF.2",
      question: "Critical Rendering Path — explain the steps from HTML bytes to pixels on screen.",
      tags: ["critical rendering path", "DOM", "CSSOM", "paint", "layout"],
      answer: `1. **Parse HTML** → build DOM tree.
2. **Parse CSS** → build CSSOM tree. CSS is **render-blocking** — browser won't paint until CSSOM is complete.
3. **JavaScript** (if not \`async\`/\`defer\`) — **blocks both HTML parsing and rendering**. Scripts must execute before the parser can continue.
4. **Render tree** — combines DOM + CSSOM, excluding invisible nodes (\`display: none\`, \`<head>\`).
5. **Layout (Reflow)** — calculates exact position and size of each element.
6. **Paint** — fills in pixels (text, colors, borders, shadows).
7. **Compositing** — combines painted layers, GPU-accelerated layers (transform, opacity) are composited separately.

**Critical Path optimisation targets:**
- Minimize render-blocking CSS (\`<link>\` in head, but keep it small; extract critical CSS inline).
- Defer non-critical JS (\`async\` / \`defer\` / dynamic \`import()\`).
- Minimize layout thrashing (batch DOM reads before writes).`,
    },
    {
      id: "QF.3",
      question: "Code splitting and lazy loading in React — `React.lazy`, dynamic `import()`. How does it work?",
      tags: ["code splitting", "lazy loading", "React.lazy", "Suspense", "dynamic import"],
      answer: `**Dynamic \`import()\`** tells bundlers (Webpack/Vite) to split that module into a separate chunk that's only downloaded when needed:
\`\`\`js
const HeavyChart = lazy(() => import('./HeavyChart'));
\`\`\`

**\`React.lazy\`** wraps a dynamic import and returns a lazy component. Must be wrapped in \`<Suspense fallback={...}>\`.

**How bundlers handle it:**
- Build time: the imported module + its dependencies are emitted as a separate \`.js\` chunk.
- Runtime: the chunk is fetched over the network only when the component is first rendered.

**When to use:**
- Route-level splitting (most impactful): each route loads only its own JS.
- Heavy UI: modals, charts, code editors (CodeMirror), map libraries.
- Above/below-fold: don't lazy load LCP content.

**In Next.js:** \`next/dynamic\` wraps \`React.lazy\` + Suspense with SSR control:
\`\`\`js
const Editor = dynamic(() => import('./Editor'), { ssr: false, loading: () => <Skeleton /> });
\`\`\``,
    },
    {
      id: "QF.4",
      question: "Image optimisation — what techniques do you use? `next/image` — how does it work?",
      tags: ["image optimization", "next/image", "WebP", "lazy loading", "LCP"],
      answer: `**Techniques:**
- **Format:** WebP/AVIF instead of JPEG/PNG — 25-50% smaller for same quality.
- **Responsive images:** \`srcset\` + \`sizes\` — browser downloads the appropriately sized image for the viewport.
- **Lazy loading:** \`loading="lazy"\` for below-fold images.
- **Priority/preload:** \`<link rel="preload">\` or \`priority\` prop for LCP images.
- **CDN:** Serve from a CDN with edge caching.
- **Compression:** Serve at appropriate quality (80-85% for JPEG usually sufficient).

**\`next/image\` does all of this automatically:**
- Serves WebP/AVIF if browser supports it (via Accept header).
- Generates multiple sizes and serves via \`srcset\`.
- Lazy loads by default; \`priority\` prop adds preload link.
- Sets explicit \`width\`/\`height\` to prevent CLS.
- Resizes and caches on the server (\`/_next/image\` route with query params).
- Blur placeholder (\`placeholder="blur"\`) for perceived performance.`,
    },
    {
      id: "QF.5",
      question: "Bundle size optimisation — how do you analyse and reduce JavaScript bundle size?",
      tags: ["bundle size", "tree shaking", "code splitting", "analysis"],
      answer: `**Analysis tools:**
- \`next build\` output shows route sizes.
- **\`@next/bundle-analyzer\`** — visual treemap of all modules.
- **webpack-bundle-analyzer** — same for Webpack.
- Chrome DevTools Coverage tab — shows unused JS.

**Common fixes:**
1. **Tree shaking:** Ensure libraries have \`"sideEffects": false\` and ship ESM. Named imports from ESM packages.
2. **Replace heavy libraries:** Moment.js (70kb) → date-fns (tree-shakeable). Lodash → native array methods or lodash-es.
3. **Dynamic import:** Heavy components (charts, editors, maps) loaded only when needed.
4. **Deduplicate:** \`npm dedupe\` / check for multiple versions of the same package in the bundle.
5. **Minification + compression:** Next.js handles minification. Gzip/Brotli on the server (Brotli is ~15% smaller than Gzip).
6. **Self-host fonts:** Avoid loading full Google Fonts CSS; use \`next/font\` which subsets and serves locally.`,
    },
    {
      id: "QF.6",
      question: "Virtual scrolling — how does it work? When is it necessary?",
      tags: ["virtual scrolling", "windowing", "tanstack-virtual", "performance"],
      answer: `**How it works:** Instead of rendering all N items, render only the items currently visible in the viewport plus a small overscan buffer. As the user scrolls, items entering the viewport are rendered; items leaving are unmounted (or recycled).

The container has a fixed height; a spacer element (or transform) gives the scroll container its full scrollable height without rendering everything.

\`\`\`
Total height = N × item height
Rendered items ≈ viewport height / item height + overscan
\`\`\`

**Libraries:** \`@tanstack/react-virtual\` (used in this project's Vocabulary page), \`react-window\`, \`react-virtuoso\`.

**When necessary:**
- Lists with 500+ items where all items are the same height (easy to virtualize).
- 100-500 items with slow/heavy item components.
- Tables with many rows.

**When NOT to use:**
- Lists under ~50 items — overhead of virtualization outweighs benefit.
- Variable-height items (hard to calculate total height) — use a library that measures dynamically.
- SEO-critical content — virtualized items aren't in DOM for crawlers.`,
    },
    {
      id: "QF.7",
      question: "Browser caching — HTTP cache headers: `Cache-Control`, `ETag`, `Last-Modified`. How does Next.js handle static asset caching?",
      tags: ["caching", "Cache-Control", "ETag", "CDN", "Next.js"],
      answer: `**\`Cache-Control\`:** Instructs browsers and CDNs how long to cache.
- \`max-age=31536000, immutable\` — cache for 1 year, won't even revalidate. Safe for content-hashed assets.
- \`no-cache\` — revalidate with server before using cached version.
- \`no-store\` — never cache.
- \`s-maxage\` — CDN-specific max-age (browser still uses \`max-age\`).
- \`stale-while-revalidate\` — serve stale immediately, refresh in background.

**\`ETag\` / \`Last-Modified\`:** For conditional requests. Browser sends \`If-None-Match: "etag"\` or \`If-Modified-Since: date\`. Server responds 304 Not Modified (no body) if unchanged.

**Next.js caching:**
- Static assets (\`/_next/static/\`): content-hashed filenames → \`Cache-Control: max-age=31536000, immutable\`.
- Pages with ISR: \`Cache-Control: s-maxage=revalidate, stale-while-revalidate\`.
- API routes: no caching by default; set manually via \`res.setHeader('Cache-Control', ...)\`.`,
    },
    {
      id: "QF.8",
      question: "Have you used performance monitoring tools in production? What metrics did you track and how did you improve them?",
      tags: ["performance monitoring", "Real User Monitoring", "Lighthouse", "Web Vitals"],
      answer: `At Gameloft, performance was critical because campaign sites were linked in push notifications — users expected instant load after tapping.

**Tools used:**
- **Lighthouse CI** in the deployment pipeline — failed builds if LCP > 3s or CLS > 0.15.
- **Google PageSpeed Insights** for pre-launch checks.
- **Chrome DevTools** Performance tab for diagnosing specific bottlenecks.

**Key improvements I implemented:**
- **LCP:** The hero image in campaign sites was loading at ~380KB JPEG. Switched to WebP with \`next/image\`, dropped to ~80KB. LCP went from 4.2s to 1.8s on mobile.
- **CLS:** Layout shifts caused by fonts (FOUT) and the achievement reveal animation. Added \`font-display: swap\` and reserved fixed heights for the reveal container. CLS went from 0.25 to 0.04.
- **TTI (Time to Interactive):** Moved heavy animation library (GSAP) to a dynamic import, deferred until after first contentful paint. Reduced main thread blocking by ~600ms.

For A's app, I'd add **Real User Monitoring** (via Web Vitals API or a service like Datadog RUM) because lab metrics don't capture real device + network variability across Vietnam's user base.`,
    },
  ],
};

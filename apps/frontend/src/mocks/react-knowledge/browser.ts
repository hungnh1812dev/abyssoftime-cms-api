import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const browserSection: KnowledgeSection = {
  id: "browser",
  title: "Browser & Web APIs",
  icon: "Globe",
  description: "DOM, Browser APIs, Web Workers, WebSockets, WASM, and performance rendering models.",
  style: {
    iconColor: "text-cyan-500",
    headerBg: "bg-cyan-500/10 dark:bg-cyan-500/[0.08]",
    headerBorder: "border-cyan-500/20 dark:border-cyan-500/30",
    accentBorder: "border-cyan-500/50 dark:border-cyan-500/30",
    sidebarBg: "bg-cyan-500/10",
    sidebarText: "text-cyan-700 dark:text-cyan-300",
  },
  items: [
    {
      id: "browser-dom",
      title: "DOM & Events",
      summary: "Document Object Model, event delegation, and browser Observer APIs.",
      tags: ["DOM", "events", "bubbling", "delegation", "Observer"],
      body: "**DOM (Document Object Model)** is the tree representation of an HTML document as objects. The browser parses HTML → creates the DOM tree → parses CSS → CSSOM → combines them into the Render Tree → Layout → Paint → Composite.\n\n**Event model**: Events propagate in 3 phases:\n1. **Capture phase**: From the window down to the target.\n2. **Target phase**: The event arrives at the target element.\n3. **Bubble phase**: Propagates back up from the target to the window.\n\nUse \`addEventListener(event, handler, { capture: true })\` to listen during the capture phase. \`stopPropagation()\` stops propagation (bubbling/capturing). \`preventDefault()\` prevents default browser behaviors.",
      subtopics: [
        {
          title: "Event Delegation",
          body: "Instead of attaching a listener to every child element, attach a single listener to the parent container and use `event.target` to identify the clicked element. More memory-efficient for dynamic lists.",
          codeExample: {
            language: "javascript",
            code: `document.getElementById("list").addEventListener("click", (e) => {
  const item = e.target.closest("li[data-id]");
  if (!item) return;
  handleItemClick(item.dataset.id);
});`,
          },
        },
        {
          title: "MutationObserver, ResizeObserver, IntersectionObserver",
          body: "**MutationObserver**: Observes DOM mutations (attributes, childList, subtree). **ResizeObserver**: Tracks changes to element dimensions. **IntersectionObserver**: Detects when an element enters or exits the viewport — used for lazy loading, infinite scrolls, and visibility analytics.",
          codeExample: {
            language: "javascript",
            code: `const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src; // lazy load image
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll("img[data-src]").forEach(img => io.observe(img));`,
          },
        },
      ],
    },
    {
      id: "browser-web-apis",
      title: "Web APIs",
      summary: "Fetch API, Web Storage, Cache API, and key browser APIs.",
      tags: ["Fetch", "localStorage", "IndexedDB", "Cache API", "History"],
      body: "Browsers provide various built-in APIs allowing web applications to interact with system and network layers.",
      subtopics: [
        {
          title: "Fetch API & AbortController",
          body: "The Fetch API returns a Promise. AbortController allows cancelling ongoing requests — critical for avoiding race conditions and memory leaks when components unmount.",
          codeExample: {
            language: "javascript",
            code: `async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}`,
          },
        },
        {
          title: "Web Storage vs IndexedDB",
          body: "**localStorage/sessionStorage**: Synchronous, ~5-10MB limit, string-only. **IndexedDB**: Asynchronous, virtually unlimited (subject to user disk limits), supports binary data, transactions, and indexing — ideal for offline apps and larger datasets.",
        },
        {
          title: "Cache API & Service Worker",
          body: "The Cache API (accessible via Service Worker) stores Request/Response pairs. Combining it with a Service Worker enables offline-first apps: intercepting fetch requests, serving from cache, and falling back to the network.",
          codeExample: {
            language: "javascript",
            code: `// service-worker.js
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached ?? fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open("v1").then((cache) => cache.put(event.request, clone));
        return response;
      });
    }),
  );
});`,
          },
        },
      ],
    },
    {
      id: "browser-workers",
      title: "Web Workers",
      summary: "Executing JavaScript in background threads to avoid blocking the main UI thread.",
      tags: ["Web Worker", "SharedWorker", "Service Worker", "postMessage"],
      body: "Web Workers run JS code in a separate background thread — they have no direct access to the DOM. They communicate with the main thread via `postMessage` and `onmessage` (message passing using structured clone algorithms).\n\n**Dedicated Worker**: Used exclusively by a single script context.\n**SharedWorker**: Shared across multiple browsing contexts (iframes, tabs).\n**Service Worker**: Acts as a proxy between the app and network, operating with its own lifecycle (install → activate → fetch).",
      codeExample: {
        language: "javascript",
        code: `// worker.js
self.onmessage = ({ data }) => {
  const result = heavyComputation(data); // runs off main thread
  self.postMessage(result);
};

// main.js
const worker = new Worker("worker.js");
worker.postMessage(largeDataset);
worker.onmessage = ({ data }) => updateUI(data);
worker.onerror = (err) => console.error(err);

// Cleanup
worker.terminate();`,
      },
    },
    {
      id: "browser-websocket",
      title: "WebSocket",
      summary: "Full-duplex persistent connections between client and server.",
      tags: ["WebSocket", "SSE", "real-time", "polling"],
      body: "WebSockets provide full-duplex communication over a single TCP connection. After an HTTP Upgrade handshake, the connection is kept alive, allowing both parties to send messages at any time.\n\n**Comparison of real-time techniques**:\n- **Polling**: Client periodically requests updates → simple but wasteful.\n- **Long Polling**: Server holds the request until new data is available → better latency.\n- **SSE (Server-Sent Events)**: One-way server-to-client streaming over standard HTTP → simpler, auto-reconnect, and HTTP/2 friendly.\n- **WebSockets**: Bidirectional, low latency → best for chats, gaming, and collaborative tools.",
      codeExample: {
        language: "javascript",
        code: `class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.connect();
  }
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this.reconnectDelay = 1000; };
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000); // exponential backoff
    };
    this.ws.onmessage = ({ data }) => this.onMessage(JSON.parse(data));
  }
  send(data) { this.ws.send(JSON.stringify(data)); }
}`,
      },
    },
    {
      id: "browser-wasm",
      title: "WebAssembly (WASM)",
      summary: "A binary instruction format running at near-native speed in the browser.",
      tags: ["WASM", "Emscripten", "Rust", "performance"],
      body: "WebAssembly (WASM) is a compilation target for languages like C, C++, Rust, and Go. It is a complement to JavaScript, not a replacement. WASM modules run in the same security sandbox as JS and access browser APIs via JS bindings.\n\n**Use cases**: Video/image encoding (ffmpeg.wasm), cryptography, game engines, scientific computing, and browser IDEs.\n\n**JS-WASM Interoperability**: WASM functions are exported and called from JS. JS functions are imported into WASM via an import object. Memory is shared using `WebAssembly.Memory` (a linear memory buffer).",
      codeExample: {
        language: "javascript",
        code: `// Load and call WASM module
const { instance } = await WebAssembly.instantiateStreaming(
  fetch("math.wasm"),
  { env: { memory: new WebAssembly.Memory({ initial: 256 }) } }
);

const { add, fibonacci } = instance.exports;
console.log(add(1, 2));         // 3 — calling WASM function from JS
console.log(fibonacci(40));     // near-native speed`,
      },
    },
    {
      id: "browser-performance",
      title: "Browser Performance",
      summary: "Critical Rendering Path, paint rendering pipeline, and Core Web Vitals.",
      tags: ["CRP", "rAF", "Core Web Vitals", "LCP", "CLS", "INP"],
      body: "**Critical Rendering Path (CRP)**:\n1. Parse HTML → DOM\n2. Parse CSS → CSSOM\n3. DOM + CSSOM → Render Tree\n4. Layout (reflow): Compute element positions and sizes.\n5. Paint: Rasterize pixels.\n6. Composite: Layer compositing on the GPU.\n\n**Layout Thrashing**: Interleaving layout reads (e.g., offsetHeight) and style writes within loops, forcing the browser to perform synchronous reflows. Fix: Batch reads first, then batch writes.\n\n**Core Web Vitals (2024)**:\n- **LCP** (Largest Contentful Paint): < 2.5s — loading performance for main content.\n- **INP** (Interaction to Next Paint): < 200ms — overall page responsiveness (replaced FID in 2024).\n- **CLS** (Cumulative Layout Shift): < 0.1 — visual stability.",
      subtopics: [
        {
          title: "requestAnimationFrame & Scheduler",
          body: "`requestAnimationFrame` ensures callbacks run right before the next paint (~16ms). Ideal for smooth animations. `scheduler.postTask()` (Chrome 94+) allows prioritizing tasks (user-blocking, user-visible, background).",
          codeExample: {
            language: "javascript",
            code: `// Animation loop with rAF
function animate(timestamp) {
  const elapsed = timestamp - startTime;
  element.style.transform = \`translateX(\${easeInOut(elapsed)}px)\`;
  if (elapsed < duration) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Avoid layout thrashing
const heights = elements.map(el => el.offsetHeight); // batch reads
elements.forEach((el, i) => el.style.height = heights[i] + 10 + "px"); // batch writes`,
          },
        },
      ],
    },
  ],
};

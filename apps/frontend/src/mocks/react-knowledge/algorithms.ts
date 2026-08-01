import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const algorithmsSection: KnowledgeSection = {
  id: "algorithms",
  title: "Algorithms & Search",
  icon: "Binary",
  description: "Sorting and searching algorithms relevant to web development — complexity analysis, practical use cases, and interactive runnable demos.",
  style: {
    iconColor: "text-fuchsia-500",
    headerBg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/[0.08]",
    headerBorder: "border-fuchsia-500/20 dark:border-fuchsia-500/30",
    accentBorder: "border-fuchsia-500/50 dark:border-fuchsia-500/30",
    sidebarBg: "bg-fuchsia-500/10",
    sidebarText: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  items: [
    {
      id: "algo-native-sort",
      title: "Native Array.sort() & TimSort",
      summary: "JavaScript's built-in sort uses TimSort — stable, O(n log n). The most important thing: always pass a comparator for numbers.",
      tags: ["sort", "TimSort", "Array.sort", "comparator", "stable sort", "V8"],
      body: "**`Array.prototype.sort()`** in modern JavaScript engines (V8/SpiderMonkey) uses **TimSort** — a hybrid of Merge Sort and Insertion Sort.\n\n**Key properties**:\n- **Stable** (since Chrome 70 / Node 11): equal elements preserve their original relative order.\n- **O(n log n)** worst case.\n- **In-place** (uses O(n) extra space for merge passes).\n\n**Critical gotcha — numeric sort**:\n```\n[10, 9, 2, 1, 100].sort() → [1, 10, 100, 2, 9]  ❌ lexicographic!\n[10, 9, 2, 1, 100].sort((a, b) => a - b) → [1, 2, 9, 10, 100]  ✅\n```\nWithout a comparator, `.sort()` converts elements to strings and sorts **lexicographically**.\n\n**Comparator contract**: `(a, b) => number`\n- Return **negative** → `a` comes before `b`\n- Return **positive** → `b` comes before `a`\n- Return **0** → order unchanged (stable sort preserves original order)\n\n**When to use native sort**:\n- Almost always — it's the fastest option for any array in a browser/Node.js context.\n- Only reach for a custom algorithm when you need radix sort (integer arrays, O(n) time) or external sort (data larger than RAM).",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Click Run để xem kết quả sort",
        code: `// ❌ Gotcha: sort without comparator → lexicographic
const nums = [10, 9, 2, 1, 100];
console.log("Lexicographic (wrong): " + JSON.stringify(nums.slice().sort()));

// ✅ Numeric ascending
console.log("Numeric asc:           " + JSON.stringify(nums.slice().sort((a, b) => a - b)));

// ✅ Numeric descending
console.log("Numeric desc:          " + JSON.stringify(nums.slice().sort((a, b) => b - a)));

// ✅ Sort objects by field
const users = [
  { name: "Charlie", score: 85 },
  { name: "Alice",   score: 92 },
  { name: "Bob",     score: 85 },
  { name: "Dave",    score: 92 },
];
const byScore = users.slice().sort((a, b) => b.score - a.score);
console.log("\\nBy score desc (stable — Alice/Dave maintain original order within 92):");
byScore.forEach(u => console.log("  " + u.name + " → " + u.score));

// ✅ Multi-key sort: primary by score desc, secondary by name asc
const multi = users.slice().sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  return a.name.localeCompare(b.name);
});
console.log("\\nMulti-key (score desc, then name asc):");
multi.forEach(u => console.log("  " + u.name + " → " + u.score));`,
      },
    },
    {
      id: "algo-binary-search",
      title: "Binary Search",
      summary: "O(log n) search in sorted arrays — each step eliminates half the candidates. Essential for large sorted datasets.",
      tags: ["binary search", "O(log n)", "sorted", "left/right pointer", "bisect", "search"],
      body: "**Binary Search** works by repeatedly halving the search space. Requires the array to be **sorted**.\n\n**Algorithm**:\n1. Set `left = 0`, `right = arr.length - 1`.\n2. Compute `mid = Math.floor((left + right) / 2)`.\n3. If `arr[mid] === target` → found.\n4. If `arr[mid] < target` → search right half (`left = mid + 1`).\n5. If `arr[mid] > target` → search left half (`right = mid - 1`).\n6. Repeat until `left > right` → not found.\n\n**Complexity**: O(log n) time, O(1) space.\n\n**Web use cases**:\n- Searching in a sorted dropdown list (thousands of items).\n- Finding a timestamp in sorted event logs.\n- `Array.prototype.findIndex` fallback for sorted data.\n- Finding the insertion point in a sorted array (bisect-left/right pattern).\n\n**Variants**:\n- **Lower bound** (bisect-left): first index where `arr[i] >= target`.\n- **Upper bound** (bisect-right): first index where `arr[i] > target`.\n- **Search in rotated array**: split the sorted halves by finding the pivot first.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Quan sát số bước so với linear search",
        code: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1, steps = 0;
  while (left <= right) {
    steps++;
    const mid = Math.floor((left + right) / 2);
    console.log("  Step " + steps + ": check index " + mid + " → value " + arr[mid]);
    if (arr[mid] === target) return { index: mid, steps };
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return { index: -1, steps };
}

// Lower bound: first position where arr[i] >= target
function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const sorted = [1, 3, 5, 7, 9, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
console.log("Array (" + sorted.length + " items): " + JSON.stringify(sorted));

console.log("\\n→ Search for 23:");
const r1 = binarySearch(sorted, 23);
console.log("  Found at index " + r1.index + " in " + r1.steps + " steps (linear worst case: " + sorted.length + ")");

console.log("\\n→ Search for 10 (not in array):");
const r2 = binarySearch(sorted, 10);
console.log("  Result: " + r2.index + " (not found) in " + r2.steps + " steps");

console.log("\\n→ Lower bound of 13 (insert position): index " + lowerBound(sorted, 13));
console.log("→ Lower bound of 14 (insert position): index " + lowerBound(sorted, 14));`,
      },
    },
    {
      id: "algo-bubble-insertion",
      title: "Bubble Sort & Insertion Sort",
      summary: "O(n²) simple sorts — only practical for very small arrays (n < 20) or nearly-sorted data. Good baseline to understand.",
      tags: ["bubble sort", "insertion sort", "O(n²)", "in-place", "simple", "nearly sorted"],
      body: "**Bubble Sort**: repeatedly steps through the list, compares adjacent elements, and swaps them if out of order. After each pass, the largest unsorted element bubbles to its correct position.\n\n**Insertion Sort**: builds the sorted array one element at a time. For each element, find its correct position and shift larger elements right.\n\n**When they're actually useful**:\n- **Insertion Sort** is efficient for **nearly-sorted** data — O(n) best case.\n- Both are O(n²) average/worst — never use on large arrays.\n- Insertion Sort is stable, cache-friendly, and has low constant factors → V8 uses it for small sub-arrays (n ≤ 64) inside TimSort.\n- Bubble Sort is rarely used in production; useful for teaching the swap concept.\n\n**Practical rule**: if n > 20 and data isn't nearly sorted, use native `.sort()` instead.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "So sánh số lần swap/shift",
        code: `function bubbleSort(arr) {
  const a = arr.slice();
  let swaps = 0;
  for (let i = 0; i < a.length; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        swapped = true;
      }
    }
    if (!swapped) break; // early exit if already sorted
  }
  return { sorted: a, swaps };
}

function insertionSort(arr) {
  const a = arr.slice();
  let shifts = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
      shifts++;
    }
    a[j + 1] = key;
  }
  return { sorted: a, shifts };
}

const random = [64, 34, 25, 12, 22, 11, 90, 45, 73, 5];
console.log("Input: " + JSON.stringify(random));

const b = bubbleSort(random);
console.log("Bubble:    " + JSON.stringify(b.sorted) + " | swaps: " + b.swaps);

const ins = insertionSort(random);
console.log("Insertion: " + JSON.stringify(ins.sorted) + " | shifts: " + ins.shifts);

// Nearly-sorted — insertion sort's sweet spot
const nearlySorted = [1, 2, 3, 5, 4, 6, 7, 8, 10, 9];
console.log("\\nNearly-sorted input: " + JSON.stringify(nearlySorted));
const b2 = bubbleSort(nearlySorted);
const ins2 = insertionSort(nearlySorted);
console.log("Bubble:    swaps=" + b2.swaps + " (still checks all pairs)");
console.log("Insertion: shifts=" + ins2.shifts + " ← much fewer operations");`,
      },
    },
    {
      id: "algo-merge-sort",
      title: "Merge Sort",
      summary: "Stable O(n log n) divide-and-conquer — splits array in half, sorts each, merges back. Guaranteed performance, good for large datasets.",
      tags: ["merge sort", "O(n log n)", "stable", "divide and conquer", "recursive", "external sort"],
      body: "**Merge Sort** uses divide-and-conquer:\n1. **Divide**: split array in half recursively until single elements.\n2. **Conquer**: merge two sorted halves into one sorted array.\n\n**Complexity**:\n- Time: O(n log n) always — no worst-case degradation like Quick Sort.\n- Space: O(n) — needs auxiliary array for merging.\n\n**Stable**: equal elements always come out in original input order.\n\n**When to prefer Merge Sort over Quick Sort**:\n- You need **guaranteed O(n log n)** (real-time systems, user-facing sort).\n- You're sorting **linked lists** (merge is O(1) space for linked lists).\n- **External sort** — data too large for RAM, chunks sorted independently and merged.\n- Stability matters (e.g. sorting table rows by multiple columns sequentially).\n\n**In practice for web**: native `.sort()` is already TimSort (Merge+Insertion hybrid). Implement Merge Sort manually only when you need to understand the mechanics or build a custom merge pipeline.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Theo dõi số bước merge",
        code: `function mergeSort(arr) {
  let comparisons = 0;

  function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (left[i] <= right[j]) result.push(left[i++]);
      else result.push(right[j++]);
    }
    return result.concat(left.slice(i), right.slice(j));
  }

  function sort(a) {
    if (a.length <= 1) return a;
    const mid = a.length >> 1;
    return merge(sort(a.slice(0, mid)), sort(a.slice(mid)));
  }

  return { sorted: sort(arr), comparisons };
}

const arr = [38, 27, 43, 3, 9, 82, 10, 64, 5, 17, 56, 21];
console.log("Input  (" + arr.length + " items): " + JSON.stringify(arr));

const result = mergeSort(arr);
console.log("Sorted (" + arr.length + " items): " + JSON.stringify(result.sorted));
console.log("Comparisons: " + result.comparisons + " (theoretical O(n log n) ≈ " + Math.round(arr.length * Math.log2(arr.length)) + ")");

// Stability demo: sort by score, verify name order within equal scores
const players = [
  { name: "Alice", score: 90 }, { name: "Bob",   score: 75 },
  { name: "Carol", score: 90 }, { name: "Dave",   score: 75 },
  { name: "Eve",   score: 85 },
];
function mergeSortObjects(arr, key) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const L = mergeSortObjects(arr.slice(0, mid), key);
  const R = mergeSortObjects(arr.slice(mid), key);
  const out = [];
  let i = 0, j = 0;
  while (i < L.length && j < R.length) {
    // Stable: prefer left side on equal keys
    if (L[i][key] <= R[j][key]) out.push(L[i++]);
    else out.push(R[j++]);
  }
  return out.concat(L.slice(i), R.slice(j));
}
const byScore = mergeSortObjects(players, "score");
console.log("\\nBy score asc (stable):");
byScore.forEach(p => console.log("  " + p.name + " → " + p.score));
console.log("Bob/Dave maintain order within 75; Alice/Carol within 90 ✓");`,
      },
    },
    {
      id: "algo-quick-sort",
      title: "Quick Sort",
      summary: "O(n log n) average, in-place — fast in practice due to cache locality. Worst case O(n²) on already-sorted input without good pivot.",
      tags: ["quick sort", "O(n log n)", "pivot", "partition", "in-place", "Lomuto", "Hoare"],
      body: "**Quick Sort** picks a **pivot**, partitions the array into elements smaller/larger than the pivot, then recursively sorts each partition.\n\n**Complexity**:\n- Average: O(n log n) — best practical constant factor among comparison sorts.\n- Worst case: O(n²) — occurs when pivot is always the min/max (e.g. sorted input with first-element pivot).\n- Space: O(log n) stack frames (in-place, ignoring recursion stack).\n\n**Pivot strategies**:\n- **First element**: simple but O(n²) on sorted input.\n- **Median-of-three**: pick median of first/mid/last — avoids worst case for sorted data.\n- **Random pivot**: probabilistically avoids worst case — expected O(n log n).\n\n**Unstable**: equal elements may swap positions.\n\n**Partition schemes**:\n- **Lomuto**: simple, uses one pointer. More swaps.\n- **Hoare**: original, uses two pointers. Fewer swaps, faster in practice.\n\n**When to prefer Quick Sort over Merge Sort**:\n- In-memory sort where space matters.\n- Average performance is critical and you can randomize the pivot.\n- Native `.sort()` uses a hybrid (Tim/Intro Sort) that falls back to Heap Sort to avoid Quick Sort's worst case.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Median-of-3 pivot vs random pivot",
        code: `// Quick Sort with median-of-three pivot (avoids sorted-input worst case)
function quickSort(arr) {
  const a = arr.slice();
  let comparisons = 0;

  function medianOfThree(lo, hi) {
    const mid = (lo + hi) >> 1;
    if (a[lo] > a[mid]) [a[lo], a[mid]] = [a[mid], a[lo]];
    if (a[lo] > a[hi])  [a[lo], a[hi]]  = [a[hi],  a[lo]];
    if (a[mid] > a[hi]) [a[mid], a[hi]] = [a[hi], a[mid]];
    // a[hi] is now the median — use as pivot
    return a[hi];
  }

  function partition(lo, hi) {
    const pivot = medianOfThree(lo, hi);
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (a[j] <= pivot) { i++; [a[i], a[j]] = [a[j], a[i]]; }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    return i + 1;
  }

  function qs(lo, hi) {
    if (lo >= hi) return;
    const p = partition(lo, hi);
    qs(lo, p - 1);
    qs(p + 1, hi);
  }

  qs(0, a.length - 1);
  return { sorted: a, comparisons };
}

// Demo 1: random data
const rand = [64, 34, 25, 12, 22, 11, 90, 45, 73, 5, 56, 21];
const r1 = quickSort(rand);
console.log("Random input:  " + JSON.stringify(rand));
console.log("Sorted:        " + JSON.stringify(r1.sorted));
console.log("Comparisons:   " + r1.comparisons);

// Demo 2: already-sorted input — first-element pivot would be O(n²)
const sorted = Array.from({ length: 12 }, (_, i) => i + 1);
const r2 = quickSort(sorted);
console.log("\\nAlready sorted (median-of-3 pivot handles this well):");
console.log("Input:       " + JSON.stringify(sorted));
console.log("Comparisons: " + r2.comparisons + " (first-element pivot would need ~" + Math.round(sorted.length * sorted.length / 2) + ")");`,
      },
    },
    {
      id: "algo-fuzzy-search",
      title: "Fuzzy Search & Levenshtein Distance",
      summary: "Typo-tolerant search — find strings that are 'close enough' using edit distance. Core of autocomplete and spell-check features.",
      tags: ["fuzzy search", "Levenshtein", "edit distance", "autocomplete", "typo tolerance", "spell check", "dynamic programming"],
      body: "**Levenshtein Distance** measures the minimum number of single-character edits (insertions, deletions, substitutions) needed to transform one string into another.\n\n**Algorithm**: Dynamic programming on a 2D matrix.\n- `dp[i][j]` = edit distance between `a[0..i]` and `b[0..j]`.\n- If `a[i] === b[j]`: `dp[i][j] = dp[i-1][j-1]` (no edit needed).\n- Otherwise: `1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])` (delete, insert, substitute).\n\n**Complexity**: O(m×n) time and space — optimize with rolling two rows.\n\n**Web use cases**:\n- **Search box autocomplete** with typo tolerance.\n- **Spell-check** suggestions.\n- **Duplicate detection** (find near-duplicate strings in user-generated content).\n- **Command palette** fuzzy matching (VS Code Ctrl+P).\n\n**Optimizations**:\n- **Early exit** if current row minimum exceeds threshold → prune impossible paths.\n- **Prefix match boost**: if query is a prefix of the item, prioritize it over edit-distance results.\n- **Bigram similarity** (Dice coefficient): faster approximate alternative to Levenshtein.\n- For production: use libraries like `fuse.js` or `minisearch` (pre-built WASM-optimized).",
      subtopics: [
        {
          title: "Complexity Optimization: Space O(n) với rolling rows",
          body: "Full matrix cần O(m×n) space. Nhưng `dp[i][j]` chỉ phụ thuộc vào hàng trước — dùng 2 arrays thay vì matrix full: O(n) space. Khi m, n > 1000 (so sánh nhiều chuỗi dài), optimization này quan trọng.",
        },
      ],
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Fuzzy search autocomplete demo",
        code: `// Levenshtein distance — O(m×n) DP
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  // Space-optimized: two rows instead of full matrix
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

function fuzzySearch(query, items, maxDistance) {
  const q = query.toLowerCase();
  return items
    .map(item => {
      const lower = item.toLowerCase();
      const isPrefix = lower.startsWith(q);
      const dist = levenshtein(q, lower.slice(0, Math.max(lower.length, q.length)));
      return { item, dist, isPrefix };
    })
    .filter(({ dist, isPrefix }) => isPrefix || dist <= maxDistance)
    .sort((a, b) => {
      if (a.isPrefix !== b.isPrefix) return a.isPrefix ? -1 : 1;
      return a.dist - b.dist;
    });
}

const libs = [
  "React", "Redux", "Remix", "Recoil", "Router",
  "Vue", "Vite", "Vuex", "Vitest",
  "Next.js", "Nuxt", "Node.js", "Nest.js",
  "Angular", "Astro", "Svelte",
];

function showResults(query, maxDist) {
  console.log('Search "' + query + '" (max distance ' + maxDist + '):');
  const results = fuzzySearch(query, libs, maxDist);
  if (results.length === 0) { console.log("  (no results)"); return; }
  results.slice(0, 5).forEach(({ item, dist, isPrefix }) =>
    console.log("  " + item + " — dist:" + dist + (isPrefix ? " [prefix match]" : ""))
  );
}

showResults("reac", 2);     // typo for "React"
showResults("reedux", 2);   // typo for "Redux"
showResults("vuex", 1);     // exact prefix
showResults("nxt", 2);      // typo for "Next"
showResults("svlet", 2);    // typo for "Svelte"`,
      },
    },
    {
      id: "algo-trie",
      title: "Trie (Prefix Tree)",
      summary: "O(L) insert/search by character length — the data structure behind autocomplete, spell-check, and IP routing tables.",
      tags: ["trie", "prefix tree", "autocomplete", "O(L)", "radix", "dictionary", "search"],
      body: "A **Trie** is a tree where each path from root to a marked node spells out a stored word. Each node has up to 26 children (for lowercase ASCII) or a map for Unicode.\n\n**Operations** (all O(L) where L = word length):\n- **Insert**: walk down the tree, create nodes for missing characters.\n- **Search**: walk down — return false if any character is missing.\n- **StartsWith (prefix search)**: same as search but don't require `isEnd`.\n- **GetAll(prefix)**: walk to prefix node, then DFS to collect all words.\n\n**Complexity**:\n- Time: O(L) per operation — independent of how many words are in the trie.\n- Space: O(alphabet × total_chars) — can be large for wide alphabets.\n\n**Web use cases**:\n- **Autocomplete** dropdown: `trie.getAll(inputValue)`.\n- **Spell-check** (with edit-distance layer on top).\n- **IP routing tables** (binary trie on IP bits).\n- **Search highlight**: find all matches of a word set in a document.\n\n**Alternatives**:\n- **Radix Trie (Patricia)**: merges single-child nodes → less memory.\n- **Ternary Search Tree**: balanced, cache-friendly.\n- For small datasets (< 1000 items): `Array.filter(s => s.startsWith(q))` is simpler and fast enough.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Prefix autocomplete — thử tìm kiếm các prefix",
        code: `class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  // Returns up to 'limit' words with given prefix
  autocomplete(prefix, limit) {
    limit = limit || 8;
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    const results = [];
    const dfs = (n, word) => {
      if (results.length >= limit) return;
      if (n.isEnd) results.push(word);
      for (const [ch, child] of Object.entries(n.children)) dfs(child, word + ch);
    };
    dfs(node, prefix.toLowerCase());
    return results;
  }

  // Count total words
  count() {
    let n = 0;
    const dfs = (node) => {
      if (node.isEnd) n++;
      for (const child of Object.values(node.children)) dfs(child);
    };
    dfs(this.root);
    return n;
  }
}

const words = [
  "react", "redux", "remix", "recoil", "react-query", "react-router",
  "vue", "vite", "vuex", "vitest",
  "next", "nuxt", "node", "nest",
  "angular", "astro", "svelte", "solid",
  "typescript", "tailwind", "tanstack",
];

const trie = new Trie();
words.forEach(w => trie.insert(w));
console.log("Trie loaded: " + trie.count() + " words");

const queries = ["re", "r", "vi", "n", "t", "vue", "sol"];
for (const q of queries) {
  const results = trie.autocomplete(q);
  console.log('autocomplete("' + q + '"): [' + results.join(", ") + "]");
}`,
      },
    },
    {
      id: "algo-comparison",
      title: "Algorithm Selection Guide",
      summary: "Which algorithm to use when — complexity table and practical decision tree for web developers.",
      tags: ["comparison", "Big O", "complexity", "when to use", "O(n log n)", "O(log n)", "selection guide"],
      body: "**Sorting algorithms — when to use**:\n\n| Algorithm | Time (avg) | Time (worst) | Space | Stable | Use when |\n|---|---|---|---|---|---|\n| **Native `.sort()`** | O(n log n) | O(n log n) | O(n) | ✅ | Always — default choice |\n| **Merge Sort** | O(n log n) | O(n log n) | O(n) | ✅ | Guaranteed perf, linked lists, external sort |\n| **Quick Sort** | O(n log n) | O(n²) | O(log n) | ❌ | In-place, memory-constrained, pivot randomized |\n| **Insertion Sort** | O(n²) | O(n²) | O(1) | ✅ | n < 20, nearly-sorted data |\n| **Radix Sort** | O(n·k) | O(n·k) | O(n+k) | ✅ | Large arrays of integers/fixed strings |\n| **Counting Sort** | O(n+k) | O(n+k) | O(k) | ✅ | Small integer range (0–1000) |\n\n**Searching algorithms — when to use**:\n\n| Algorithm | Time | Space | Requirement | Use when |\n|---|---|---|---|---|\n| **Linear scan** | O(n) | O(1) | Unsorted | Small arrays, one-time search |\n| **Binary Search** | O(log n) | O(1) | **Sorted** | Sorted arrays, repeated lookups |\n| **Hash Map lookup** | O(1) avg | O(n) | None | Frequent lookups by key |\n| **Trie search** | O(L) | O(n·α) | None | Prefix/autocomplete queries |\n| **Fuzzy search** | O(m·n) | O(n) | None | Typo-tolerant, autocomplete |\n\n**Decision tree for web**:\n- Sorting a list of < 100 items? → **`array.sort()`** always.\n- Sorting 100k+ items by a number field? → **`array.sort((a,b) => a.x - b.x)`** still fine (TimSort is fast).\n- Only integers in range 0–1000? → **Counting Sort** can beat TimSort.\n- Looking up the same key many times? → **Hash Map** (`Map` / `{}`).\n- User typed a search query into a sorted list? → **Binary Search** to find matches.\n- Autocomplete dropdown with prefix matching? → **Trie** (pre-built at startup).\n- Typo-tolerant search? → **Levenshtein + prefix boost** or **fuse.js** library.\n\n**The 80/20 rule**: for 80% of web tasks, `array.sort()` + `Array.find/filter` + `Map` cover everything. Learn the others to know when to reach for them.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Benchmark: linear vs binary vs hash map lookup",
        code: `// Compare lookup strategies for the same dataset

// Build test data: 10,000 sorted user IDs
const N = 10000;
const ids = Array.from({ length: N }, (_, i) => "user-" + String(i).padStart(5, "0"));
const target = "user-07391";

// Strategy 1: Linear scan
function linearSearch(arr, t) {
  for (let i = 0; i < arr.length; i++) if (arr[i] === t) return i;
  return -1;
}

// Strategy 2: Binary search
function binarySearch(arr, t) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === t) return mid;
    if (arr[mid] < t) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

// Strategy 3: Hash map (pre-built index)
const hashMap = new Map(ids.map((id, i) => [id, i]));

// Benchmark each (simulate 1000 lookups)
const RUNS = 1000;

let t0 = performance.now();
for (let i = 0; i < RUNS; i++) linearSearch(ids, target);
const linearMs = (performance.now() - t0).toFixed(2);

t0 = performance.now();
for (let i = 0; i < RUNS; i++) binarySearch(ids, target);
const binaryMs = (performance.now() - t0).toFixed(2);

t0 = performance.now();
for (let i = 0; i < RUNS; i++) hashMap.get(target);
const hashMs = (performance.now() - t0).toFixed(2);

console.log("Dataset: " + N + " sorted strings, " + RUNS + " lookups each");
console.log("Target: " + target + " (index " + binarySearch(ids, target) + ")");
console.log("");
console.log("Linear scan:   " + linearMs + "ms  — O(n) per lookup");
console.log("Binary search: " + binaryMs + "ms  — O(log n) per lookup");
console.log("Hash Map:      " + hashMs + "ms   — O(1) per lookup");
console.log("");
console.log("Linear/Binary ratio: " + (linearMs / binaryMs).toFixed(1) + "x");
console.log("Linear/Hash ratio:   " + (linearMs / hashMs).toFixed(0) + "x");`,
      },
    },
    {
      id: "algo-radix-counting",
      title: "Radix Sort & Counting Sort",
      summary: "Linear-time O(n·k) sorts that beat comparison-based algorithms for integers or fixed-length strings.",
      tags: ["radix sort", "counting sort", "O(n)", "linear time", "integer sort", "bucket", "non-comparison"],
      body: "**Comparison-based sorts** have a lower bound of O(n log n). **Non-comparison sorts** can break this barrier by exploiting the structure of the keys.\n\n**Counting Sort**: O(n + k) where k = range of values.\n- Create a frequency array of size k.\n- Compute prefix sums to find each element's final position.\n- Stable — preserves relative order of equal elements.\n- **Use when**: integers in a small range (0–1000). Example: sorting scores, ages, priority levels.\n\n**Radix Sort**: O(n · d) where d = number of digits.\n- Sort by **least significant digit** first, then next digit, etc. (LSD Radix Sort).\n- Each pass is a Counting Sort on one digit.\n- Stable — ensures correct ordering after each pass.\n- **Use when**: large arrays of integers or fixed-length strings. Example: sorting 1M phone numbers, IP addresses, timestamps.\n\n**Web use cases**:\n- Counting Sort: sorting user ages, HTTP status codes, priority queues with bounded values.\n- Radix Sort: sorting large logs by timestamp (integer millis), sorting ZIP codes or IDs.",
      codeExample: {
        language: "javascript",
        runnable: true,
        caption: "Counting Sort O(n+k) vs Radix Sort O(n·d)",
        code: `// Counting Sort — for integers in range [0, maxVal]
function countingSort(arr, maxVal) {
  const count = new Array(maxVal + 1).fill(0);
  for (const x of arr) count[x]++;
  // Prefix sum → each count[i] = position of first i in output
  for (let i = 1; i <= maxVal; i++) count[i] += count[i - 1];
  const out = new Array(arr.length);
  // Iterate backwards to maintain stability
  for (let i = arr.length - 1; i >= 0; i--) {
    out[--count[arr[i]]] = arr[i];
  }
  return out;
}

// LSD Radix Sort — for non-negative integers
function radixSort(arr) {
  const max = Math.max(...arr);
  let exp = 1;
  while (Math.floor(max / exp) > 0) {
    // Counting sort on digit at position exp
    const count = new Array(10).fill(0);
    for (const x of arr) count[Math.floor(x / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    const out = new Array(arr.length);
    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      out[--count[digit]] = arr[i];
    }
    for (let i = 0; i < arr.length; i++) arr[i] = out[i];
    exp *= 10;
  }
  return arr;
}

// Demo 1: Counting Sort — scores 0-100
const scores = [72, 45, 89, 12, 67, 90, 34, 78, 56, 23, 91, 45, 67];
console.log("Scores: " + JSON.stringify(scores));
console.log("Counted: " + JSON.stringify(countingSort(scores, 100)));

// Demo 2: Radix Sort — large integers
const timestamps = [
  1704067200, 1672531200, 1735689600,
  1688169600, 1719705600, 1751241600,
];
console.log("\\nTimestamps (epoch seconds):");
console.log("Input:  " + JSON.stringify(timestamps));
console.log("Sorted: " + JSON.stringify(radixSort(timestamps.slice())));

// Demo 3: performance context
const big = Array.from({ length: 5000 }, () => Math.floor(Math.random() * 1000));
const t0 = performance.now();
countingSort(big, 1000);
const csMs = (performance.now() - t0).toFixed(3);
const t1 = performance.now();
big.slice().sort((a, b) => a - b);
const natMs = (performance.now() - t1).toFixed(3);
console.log("\\n5000 integers (0-1000):");
console.log("Counting Sort: " + csMs + "ms (O(n+k))");
console.log("Native sort:   " + natMs + "ms (O(n log n))");`,
      },
    },
  ],
};

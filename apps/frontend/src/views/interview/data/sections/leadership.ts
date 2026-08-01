import type { InterviewSection } from "../types";

export const systemDesignSection: InterviewSection = {
  id: "system-design",
  label: "III-A. System Design & Scalability",
  category: "Leadership",
  iconName: "Network",
  color: "text-violet-600",
  bgColor: "bg-violet-600/10",
  questions: [
    {
      id: "QSA.1",
      question: "Design a real-time notification system for A's app (100M users). Walk through your frontend architecture.",
      tags: ["system design", "real-time", "WebSocket", "notifications", "scale"],
      answer: `**Requirements clarification:**
- Notification types: message alerts, friend requests, system announcements.
- Delivery: real-time when app is open; push notification when closed.
- Scale: 100M users, assume 10M concurrent online.

**Frontend architecture:**

**1. Connection layer:** WebSocket per client to a notification gateway (or SSE for server-push-only). Connection pool behind a load balancer. Each WS server holds state for ~10K connections.

**2. Client-side notification manager (singleton hook):**
\`\`\`ts
function useNotifications() {
  const ws = useRef<WebSocket>();
  useEffect(() => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onmessage = (e) => {
      const notif = JSON.parse(e.data);
      notificationStore.add(notif);
      showToast(notif);
    };
    return () => ws.current?.close();
  }, []);
}
\`\`\`

**3. Reconnection:** Exponential backoff with jitter on disconnect. Persist last-seen notification ID — on reconnect, request missed notifications since that ID.

**4. UI:** Notification bell with unread badge, dropdown list, mark-as-read on click. Virtual scroll for long notification lists.

**5. Offline handling:** Queue missed notification IDs in IndexedDB. Reconcile on next online session.`,
    },
    {
      id: "QSA.2",
      question: "Design the frontend for a chat feature in A's app Mini App. What are the key technical challenges?",
      tags: ["system design", "chat", "WebSocket", "Mini App", "optimistic updates"],
      answer: `**Key challenges specific to Mini App chat:**
- WebView memory constraints — can't hold entire chat history in DOM.
- JS bridge latency for auth token retrieval.
- Unreliable network (mobile switching between WiFi/4G).

**Architecture:**

**Message list:** Virtual scroll with dynamic item heights (messages vary in length). Anchor to bottom on new messages; pause scroll to bottom when user has scrolled up.

**Sending flow (optimistic updates):**
\`\`\`ts
function sendMessage(text: string) {
  const tempId = crypto.randomUUID();
  // 1. Add to UI immediately with "pending" status
  dispatch({ type: 'ADD_MESSAGE', payload: { id: tempId, text, status: 'pending' } });
  // 2. Send via API
  api.sendMessage(text)
    .then(({ id }) => dispatch({ type: 'CONFIRM_MESSAGE', payload: { tempId, id } }))
    .catch(() => dispatch({ type: 'FAIL_MESSAGE', payload: { tempId } }));
}
\`\`\`

**Real-time updates:** WebSocket connection (or A's app push notification bridge) for incoming messages.

**Message status indicators:** Single tick (sent), double tick (delivered), read receipt.

**Pagination:** Load last 30 messages initially. "Load more" on scroll-to-top, prepend to list.

**Offline:** Queue unset messages, retry on reconnect.`,
    },
    {
      id: "QSA.3",
      question: "How do you approach frontend performance for a page with 100K+ data rows (e.g., transaction history)?",
      tags: ["performance", "virtual scroll", "pagination", "large data"],
      answer: `**Never render 100K rows in the DOM.** Even empty divs at this scale would freeze the browser.

**Strategy layers (from simplest to most complex):**

**1. Pagination (simplest):** Fetch and render 20-50 rows per page. Low complexity, great for infrequent access. Downside: navigating pages is tedious for users who need to scan.

**2. Infinite scroll + virtual rendering:** Fetch in pages, but render only the visible window. As user scrolls, render new items and recycle old ones.
- Library: \`@tanstack/react-virtual\` (already used in this project's Vocabulary page).
- Keeps DOM node count constant (~50) regardless of total items.

**3. Indexed search + filter first:** Instead of scrolling 100K rows, let users filter by date range, category, amount. Reduce the working set before rendering.

**4. Server-side search:** Search/filter API endpoint — never send 100K rows to the client. Paginate the filtered result.

**5. Web Worker for processing:** If data processing (aggregation, sorting) is needed client-side, offload to a Web Worker to avoid blocking the main thread.

**Measurement:** Profile with Chrome DevTools before optimizing — identify whether the bottleneck is rendering, network, or processing.`,
    },
    {
      id: "QSA.4",
      question: "How would you architect a shared component library for web and Mini App at A company?",
      tags: ["component library", "monorepo", "design system", "Mini App", "web"],
      answer: `**Goal:** One source of truth for UI components, usable in both Next.js web and A's app Mini App (React-based).

**Monorepo structure:**
\`\`\`
packages/
  ui/                    ← Shared React components
    src/
      Button.tsx
      Input.tsx
      ...
    package.json         ← { "main": "dist/index.js", "module": "dist/index.esm.js" }
  tokens/                ← Design tokens (colors, spacing, typography)
    tokens.css           ← CSS custom properties
apps/
  web/                   ← Next.js web app
  mini-app/              ← A's app Mini App
\`\`\`

**Key design decisions:**
1. **No platform-specific code in \`ui/\`** — components must work in both WebView and browser. No Server Components in the shared library (client-compatible only).
2. **CSS custom properties for theming** — both platforms load the same tokens.css.
3. **Headless primitives + visual layer:** Build on Radix UI (accessibility) + Tailwind (styling). Mini App can use a different Tailwind config for platform-specific sizing.
4. **Platform bridges in apps, not packages** — \`window.ZMPBridge\` calls stay in the Mini App app, never in the shared library.
5. **Storybook** for visual documentation, shared across both teams.`,
    },
    {
      id: "QSA.5",
      question: "How do you ensure a frontend feature is scalable from day one vs. optimising prematurely?",
      tags: ["scalability", "premature optimisation", "architecture", "trade-offs"],
      answer: `**Premature optimisation** is writing complexity before you have evidence the simple approach is insufficient. Donald Knuth's maxim applies: "Premature optimisation is the root of all evil."

**My approach — scalable by default, optimised when needed:**

**Scalable by default (no extra cost):**
- Correct data structures — use Map instead of array for O(1) lookups when IDs are involved.
- Component composition over inheritance — composable components are easier to extend.
- Avoid tight coupling — depend on interfaces, not concrete implementations.
- Meaningful abstractions — hooks for data fetching logic, components for rendering.

**Wait for evidence before optimising:**
- Virtual scroll: only when a list demonstrably lags on real devices.
- Code splitting: profile bundle size first; dynamic imports add complexity.
- Caching/memoization: only when profiler shows the computation is actually slow.
- Web Workers: only when main thread blocking is measured and confirmed.

**Evidence signals:** User reports lag, profiler shows long tasks, Lighthouse score drops, bundle size exceeds budget thresholds.

**The right question:** "Is this simplest correct implementation?" not "Is this fastest possible implementation?" Correctness first, then measure, then optimise the bottleneck.`,
    },
  ],
};

export const techDecisionsSection: InterviewSection = {
  id: "tech-decisions",
  label: "III-B. Technical Decision Making",
  category: "Leadership",
  iconName: "GitBranch",
  color: "text-blue-600",
  bgColor: "bg-blue-600/10",
  questions: [
    {
      id: "QSB.1",
      question: "Describe a significant technical decision you made. What was the trade-off and what was the outcome?",
      tags: ["technical decision", "trade-offs", "leadership", "real-world"],
      answer: `**Decision:** Migrating Gameloft Club's in-app browser from a pure WebView to a React-based hybrid architecture.

**Context:** The existing in-app browser was a legacy jQuery app with spaghetti event handling. It was causing memory leaks after 10+ minutes of use, which crashed the app on low-end Android devices. The team proposed rewriting from scratch.

**Trade-off I identified:**
- Full rewrite = 3 months, no new features during rewrite, risk of introducing new bugs.
- Incremental migration = longer overall, but ship improvements immediately.

**Decision:** Proposed a strangler fig pattern — keep the core WebView working, progressively replace UI regions with React components while maintaining the existing communication protocol. Used Web Components as the bridge layer so React components could be embedded in the legacy app without a full routing migration.

**Outcome:** Reduced memory leak rate by 70% after 3 sprints. Shipped new bookmark management feature (previously on hold) within the same quarter. Full migration completed in 5 months with zero regression incidents.

**What I learned:** Framing options with timeline + risk made the decision straightforward for stakeholders. The incremental path was less exciting technically but better for the business.`,
    },
    {
      id: "QSB.2",
      question: "How do you evaluate a new technology before adopting it in production?",
      tags: ["technology evaluation", "decision making", "risk", "adoption"],
      answer: `**Evaluation framework I use:**

**1. Problem fit:** Does it solve a real problem we have, or are we attracted to the novelty? "What problem does this replace or eliminate?"

**2. Maturity signals:**
- GitHub stars / npm weekly downloads trend (growing or plateauing?).
- Release cadence — active maintenance or stagnant?
- Breaking changes frequency — how much churn does it introduce?
- Backed by a company or individual? (Bus factor.)

**3. Ecosystem compatibility:** Does it work with our stack (Next.js, TypeScript strict, Tailwind)? Any peer dependency conflicts?

**4. Bundle cost:** \`bundlephobia.com\` — is the size justified by the functionality?

**5. Escape hatch:** If we adopt this and it goes wrong, how hard is it to remove? (Prefer additive, not deeply integrated.)

**6. Proof of concept:** Build the specific use case in a branch. Don't evaluate in abstract — test on our actual problem.

**7. Team readiness:** Learning curve vs. timeline. Will the team maintain it after I move on?

**Recent example:** Evaluated Zustand vs. Jotai for state management. Zustand won for its simpler mental model and ability to access state outside React components — but I built a small PoC in both to compare DX before committing.`,
    },
    {
      id: "QSB.3",
      question: "Have you ever pushed back on a technical requirement? How did you handle the conversation?",
      tags: ["pushback", "communication", "technical leadership", "stakeholders"],
      answer: `**Example:** Product requested a "load all messages" feature for the in-app browser history — display every browsed URL ever, in a single infinite list.

**My concern:** Browsing history can reach 10K+ entries after months of use. Rendering all at once would lag on mid-range devices; the query alone could take 2+ seconds.

**How I handled it:**

1. **Built the evidence first:** Implemented a proof of concept with test data (8K records) and profiled it — 3.4s render time, 800ms freeze on budget Android.

2. **Reframed as a user need:** "The user goal is finding a previously visited site quickly." A searchable, paginated list serves this better than an infinite scroll of 10K items.

3. **Proposed an alternative:** Paginate by date (last 7 days / last 30 days / older), with a search bar. Same data available, dramatically better performance.

4. **Let the data lead the conversation:** Showed the profiling results in the design review meeting. The PM appreciated the evidence and adopted the alternative.

**What I didn't do:** Say "that's impossible" or escalate without offering an alternative. Pushback without a better solution is just obstruction.`,
    },
    {
      id: "QSB.4",
      question: "How do you balance technical debt vs. new feature development?",
      tags: ["technical debt", "prioritisation", "engineering velocity", "refactoring"],
      answer: `**My mental model:** Technical debt is a loan. Some debt is intentional and rational (ship faster now, refactor later). Unmanaged debt compounds — the longer it stays, the more it costs every new feature built on top of it.

**Identifying high-priority debt:**
- Debt that slows down every new feature in the area (shared utilities, data access patterns).
- Debt causing bugs in production.
- Debt blocking a required technology upgrade (e.g., can't upgrade React because of a deprecated API spread everywhere).
- Debt that causes onboarding friction for new engineers.

**How I advocate for debt work:**
- Track it explicitly — a "tech debt" tag in the issue tracker makes it visible.
- Attach a cost to it — "this legacy auth pattern adds 1 hour to every feature that touches auth. We have 10 auth features this quarter. That's 10 hours of waste."
- Propose boy scout rule: leave it better than you found it. When touching a module for a feature, clean up adjacent debt as part of the same PR.
- Negotiate a dedicated ratio — advocate for 20% of sprint capacity for debt/infra work.

**Anti-patterns to avoid:** "Big bang refactors" that block features for months. Debt sprints that feel like punishment. Rewriting things that still work.`,
    },
  ],
};

export const codeReviewSection: InterviewSection = {
  id: "code-review",
  label: "III-C. Code Review & Quality",
  category: "Leadership",
  iconName: "CheckSquare",
  color: "text-emerald-600",
  bgColor: "bg-emerald-600/10",
  questions: [
    {
      id: "QSC.1",
      question: "How do you conduct a code review? What do you look for?",
      tags: ["code review", "quality", "process", "feedback"],
      answer: `**My code review checklist (in order of priority):**

**1. Correctness:** Does it do what the ticket/spec says? Does it handle edge cases (empty state, error state, loading state)?

**2. Security:** Unvalidated user input going into dangerous operations? XSS via dangerouslySetInnerHTML? Secrets in code?

**3. Performance:** N+1 rendering? Unnecessary re-renders (missing memo/callback)? Component that renders on every parent update?

**4. Architecture:** Does this add coupling? Is the abstraction right (not too early, not too late)? Does it follow the project's patterns?

**5. Readability:** Would a new team member understand this without asking? Are variable names clear?

**6. Tests:** Are there tests? Do they test behavior or implementation? Do they cover the edge cases?

**How I give feedback:**
- Distinguish severity: "blocker" (must fix), "suggestion" (consider this), "nit" (minor, up to you).
- Explain the why, not just the what: "This could cause a memory leak on unmount because..." not just "fix this."
- Acknowledge good work — code reviews aren't only for criticism.
- Don't block PRs on style — that's what linters and formatters are for.`,
    },
    {
      id: "QSC.2",
      question: "How do you handle receiving critical feedback on your own code?",
      tags: ["feedback", "growth mindset", "code review", "communication"],
      answer: `**My approach:**

**Separate ego from code.** The review is about the code, not about me as a person. A comment on my implementation is information, not an attack.

**Read charitably first.** Assume the reviewer is trying to improve the codebase, not score points. If feedback is unclear, ask for clarification before responding.

**Respond to substance, not tone.** If the reviewer is right, acknowledge it and make the change: "Good catch — I missed the cleanup in useEffect. Fixed." If I disagree, I explain my reasoning and ask for their thoughts.

**Example:** A senior engineer once rewrote 40% of a component I'd submitted, saying mine was "too clever." My first instinct was defensiveness. I took a day, then re-read both versions. His was more readable and easier to test. I thanked him and adopted his approach.

**What I ask in retrospect:** "Is there a pattern here — am I consistently over-engineering? Under-testing?" I use critical reviews as calibration for my blind spots.

**What I don't do:** Silently accept a change I think is wrong just to avoid conflict. A respectful "I see your point, but my concern with that approach is X — can we talk through it?" is the right path.`,
    },
    {
      id: "QSC.3",
      question: "How do you maintain code quality standards in a team? What tools and processes do you use?",
      tags: ["code quality", "standards", "tooling", "process", "team"],
      answer: `**Automated guardrails (non-negotiable, no human required):**
- **ESLint + TypeScript strict:** Block PR merge on lint errors or type errors. Configured in CI.
- **Prettier:** Auto-format on save and in CI. No style debates in reviews.
- **Husky + lint-staged:** Pre-commit hooks run lint + format on staged files only (fast).
- **Commitlint:** Enforce conventional commits.

**Process guardrails:**
- **PR template:** Checklist including "Does this have tests?" and "Did you test on mobile?"
- **Required reviewers:** At least one senior review for changes to shared components or critical paths.
- **Branch protection:** Can't push directly to main/develop.

**Living documentation:**
- \`CLAUDE.md\` / \`rules/\` in this project — conventions written down, referenced in reviews.
- Architecture Decision Records (ADRs) for significant decisions — "why we chose X over Y" is documented so future engineers don't re-litigate solved questions.

**Culture:**
- Psychological safety — engineers must feel comfortable raising quality concerns without fear.
- Lead by example — when I submit code with mistakes, I acknowledge them openly.
- Separate "code quality" from "personal style" — enforce the former, let go of the latter.`,
    },
    {
      id: "QSC.4",
      question: "How do you ensure knowledge is shared across the team (documentation, pair programming, etc.)?",
      tags: ["knowledge sharing", "documentation", "pair programming", "team"],
      answer: `**Documentation I write:**
- **Decision records** for significant architectural choices.
- **Rule files** (like this project's \`rules/\`) for conventions that would otherwise be tribal knowledge.
- **Inline comments** only for non-obvious WHY, not WHAT.

**Synchronous knowledge sharing:**
- **Pair programming** for complex features or onboarding new engineers — both parties learn.
- **Tech talks / brown bags:** 30-minute internal sessions on a topic (e.g., "How our caching layer works," "Performance tools walkthrough").
- **Design review meetings** before implementation — share the plan, get input early.

**Asynchronous:**
- **Detailed PR descriptions** — explain the approach and alternatives considered. Future engineers can read PR history to understand why code looks the way it does.
- **Slack/Teams channel** for frontend Q&A — answers are searchable, not buried in DMs.
- **Storybook** for component documentation — living docs, always in sync with code.

**Anti-pattern I avoid:** "Just ask me" as the documentation strategy. When only one person understands a system, the team has a bus-factor problem, not a knowledge-sharing strategy.`,
    },
  ],
};

export const cicdLeadSection: InterviewSection = {
  id: "cicd-lead",
  label: "III-D. CI/CD & Release Management",
  category: "Leadership",
  iconName: "GitMerge",
  color: "text-orange-600",
  bgColor: "bg-orange-600/10",
  questions: [
    {
      id: "QSD.1",
      question: "Describe your ideal CI/CD pipeline for a Next.js application at scale.",
      tags: ["CI/CD", "pipeline", "Next.js", "deployment", "scale"],
      answer: `**Pipeline stages:**

\`\`\`
PR opened → [Quality gate] → [Preview deploy] → [E2E smoke] → Review → Merge

Merge to develop → [Quality gate] → [Staging deploy] → [Full E2E] → QA sign-off

Develop → main → [Production deploy] → [Smoke test in prod] → Monitor
\`\`\`

**Quality gate (runs on every PR, ~3 min):**
- TypeScript type check
- ESLint (zero errors)
- Unit tests (Jest) — fast, parallelized
- Build validation (\`next build\`)
- Bundle size check — block if regression > 5%

**Preview deployment:** Each PR gets a unique URL (Vercel Preview / self-hosted equivalent). Reviewers can verify changes without local setup.

**E2E (Playwright):** Smoke test suite (~10 critical paths) on the preview URL. Full suite on staging after merge.

**Production deploy:**
- Canary release: route 5% of traffic to new version, monitor error rates + latency.
- Auto-rollback if error rate increases > threshold.
- Feature flags for new features — ship code before enabling UI.

**Observability:** Sentry error tracking, Core Web Vitals RUM, server response time dashboards. Alert on anomalies post-deploy.`,
    },
    {
      id: "QSD.2",
      question: "How do you manage feature flags? What tools and patterns do you use?",
      tags: ["feature flags", "deployment", "A/B testing", "risk management"],
      answer: `**Why feature flags:** Decouple deployment from release. Ship code any time; enable the feature when ready. Roll back a feature without a code deploy. Enable gradual rollout.

**Patterns:**

**1. Static flags (environment variables):**
\`\`\`ts
const ENABLE_NEW_CHAT = process.env.NEXT_PUBLIC_ENABLE_NEW_CHAT === 'true';
\`\`\`
Simple, but requires redeploy to change. Good for dev/staging vs. prod differences.

**2. Runtime flags (remote config):**
Fetch flags from a config service on app start. Change flags without redeployment.
Tools: LaunchDarkly, Unleash (open-source), GrowthBook, Firebase Remote Config.

**3. User-segment rollouts:**
Roll out to 1% → 10% → 50% → 100%. Flag service evaluates based on user ID hashing.

**Implementation pattern:**
\`\`\`ts
function useFeatureFlag(flag: string): boolean {
  const flags = useContext(FeatureFlagsContext);
  return flags[flag] ?? false;
}

// In component:
const showNewCheckout = useFeatureFlag('new_checkout_flow');
\`\`\`

**Flag hygiene:** Delete flags after the feature is fully rolled out. Stale flags are technical debt. Track flag age; auto-alert when a flag is 90+ days old.`,
    },
    {
      id: "QSD.3",
      question: "How do you handle hotfixes and rollbacks in production?",
      tags: ["hotfix", "rollback", "production", "incident response"],
      answer: `**Rollback first, debug second.** When production is broken, the first goal is restoring service, not understanding the cause.

**Rollback options (fastest to slowest):**
1. **Feature flag off** — if the issue is behind a flag, flip it off instantly. Sub-minute resolution.
2. **Previous deployment reactivation** — on Vercel or similar, promote the previous successful deployment. ~1 minute.
3. **Git revert + deploy** — revert the commit(s) that caused the issue, push, CI deploys. ~5-10 minutes.
4. **Manual hotfix** — fix forward if rollback isn't viable (data migration already ran, rollback would corrupt state).

**Hotfix process:**
\`\`\`
1. Identify and scope the issue (define blast radius)
2. Communicate status to stakeholders (don't go dark)
3. Branch from the current production tag: git checkout v1.2.3 -b hotfix/critical-auth-bug
4. Minimal fix — the smallest change that resolves the issue
5. Fast-track review (one reviewer, focused on the fix only)
6. Deploy through a fast CI path (skip full E2E, run smoke only)
7. Merge hotfix branch back to develop + main
8. Post-mortem: what caused it, how we detected it, how we prevent it
\`\`\`

**Post-mortem culture:** Blameless. Focus on systemic improvements (better tests, monitoring, process) not individual mistakes.`,
    },
    {
      id: "QSD.4",
      question: "How do you approach database/API migrations that require both frontend and backend changes?",
      tags: ["migration", "API versioning", "backward compatibility", "coordination"],
      answer: `**Core principle:** Never require simultaneous frontend and backend deployment. Instead, use an **expand-contract** pattern.

**Phase 1 — Expand (backend):**
- Add the new API field/endpoint alongside the old one.
- Old clients still work; new clients can start using the new field.
- Deploy backend. All current frontends continue working.

**Phase 2 — Migrate (frontend):**
- Update frontend to use the new API field.
- Deploy frontend. Both old and new logic may coexist briefly.

**Phase 3 — Contract (backend):**
- Remove the old field/endpoint.
- Deploy backend cleanup. Migration complete.

**API versioning:** For breaking changes, version the endpoint: \`/api/v2/users\`. Old clients use v1; new clients use v2. v1 can be deprecated gradually.

**Feature flags as safety net:** Deploy the frontend code that calls the new API behind a flag. Enable the flag only after the backend is confirmed live. On any issue, flip the flag.

**Communication:** Migration plan documented and shared between teams before Phase 1 starts. Each phase has explicit "done when" criteria and a team sign-off.`,
    },
    {
      id: "QSD.5",
      question: "How do you ensure frontend observability in production? What do you monitor?",
      tags: ["observability", "monitoring", "error tracking", "performance", "production"],
      answer: `**Four pillars of frontend observability:**

**1. Error tracking (Sentry / Datadog):**
- JavaScript errors with stack traces, user session replay.
- Alert on error rate spike post-deploy.
- Group by error type, triage by frequency × user impact.

**2. Core Web Vitals (RUM):**
- LCP, INP, CLS from real users, segmented by device, network, geo.
- 75th percentile is the target (not median — the worst 25% of users matter).
- Alert when p75 LCP > 3s.

**3. Business metrics:**
- Page load to first meaningful interaction (custom metric).
- Feature funnel completion rates — if chat open rate drops post-deploy, something broke.

**4. Availability:**
- Uptime checks (external synthetic monitoring).
- CDN cache hit rate — a drop indicates cache invalidation issues.
- Error rate on API calls (frontend perspective).

**Alerting:** PagerDuty/OpsGenie for critical (error rate > 5%), Slack notification for warning (LCP regression > 20%). Alerts must be actionable — avoid alert fatigue.

**Dashboard:** A single frontend health dashboard visible to the whole team. Surfaced during weekly syncs. Green board on release day = good confidence.`,
    },
    {
      id: "QSD.6",
      question: "You are the lead frontend engineer for A's app Mini App team. How do you set up the release process?",
      tags: ["release process", "Mini App", "team lead", "process design"],
      answer: `**Release cadence:** Bi-weekly releases aligned with A's app's Sprint cycle. Hotfix track available outside the cycle for critical issues.

**Release process:**

\`\`\`
Sprint end (Friday)
  → Code freeze Thursday noon
  → QA full regression on staging Mini App (in A's app developer sandbox)
  → Sign-off from QA + PM
  → Production deploy Friday 2pm
  → 1-hour monitoring window (engineer on standby)
  → Release notes published to team Slack
\`\`\`

**Environment strategy:**
- **dev:** Feature branches, auto-deploy on push, developer sandbox only.
- **staging:** Develop branch, synced with latest A's app version in UAT.
- **production:** Main branch, tagged with semver.

**Mini App-specific considerations:**
- Test on both iOS (WKWebView) and Android (System WebView) for each release.
- Validate JS bridge API calls work with the current A's app version.
- Maintain a compatibility matrix: which Mini App version works with which A's app version.

**Rollback:** A's app's Mini App platform allows pointing to a previous bundle URL. Rollback is possible without App Store review.

**On-call rotation:** Each engineer takes a 1-week on-call rotation post-release. Clear escalation path defined.`,
    },
  ],
};

export const mentoringSection: InterviewSection = {
  id: "mentoring",
  label: "III-E. Mentoring & Team Growth",
  category: "Leadership",
  iconName: "Users",
  color: "text-rose-600",
  bgColor: "bg-rose-600/10",
  questions: [
    {
      id: "QSE.1",
      question: "Have you mentored junior engineers? How do you approach it?",
      tags: ["mentoring", "junior engineers", "growth", "leadership"],
      answer: `**At Gameloft:** Informally mentored 2 junior engineers who joined during my time on the Gameloft Club project.

**My approach:**

**Meet them where they are:** First conversation is understanding their background, what they find hard, what they want to learn. One was strong in CSS but shaky on async JavaScript; the other was the opposite. Tailored support accordingly.

**Structured feedback, not just answers:** When they came with a bug, I wouldn't just fix it. I'd ask: "What have you tried? What does the error say? Where in the code do you think the issue might be?" This builds debugging intuition, not dependency.

**Code review as teaching:** I wrote detailed PR reviews with explanations — "I changed this from \`forEach\` to a \`for...of\` loop here because we need to \`await\` inside the loop. \`forEach\` doesn't await promises." I linked to MDN or relevant articles.

**Small wins first:** Started them on well-defined bug fixes before assigning new features. Builds confidence and context.

**Check-in rhythm:** Weekly 30-min sync to review what they learned, what was hard, what's next. Not a status meeting — a learning conversation.

**What I learned:** The best mentoring is modeling the thinking process, not the answer. "How I would approach debugging this…" is more valuable than the solution.`,
    },
    {
      id: "QSE.2",
      question: "How do you give constructive feedback to peers and direct reports?",
      tags: ["feedback", "communication", "leadership", "SBI model"],
      answer: `**Framework I use: Situation-Behavior-Impact (SBI):**
- **Situation:** "In yesterday's design review..."
- **Behavior:** "...you interrupted the PM three times while they were presenting."
- **Impact:** "It made the PM less willing to share context, and we ended up with an incomplete picture of the requirements."

This removes interpretation and keeps it factual.

**Positive feedback is just as important:** "In last sprint's demo, the way you walked through the feature from the user's perspective made it very clear. It led to the PM trusting the implementation without requesting changes." Specific, actionable, repeatable.

**Timing:** Immediate for small things (same day), private space for significant feedback. Don't give critical feedback in group settings — it's humiliating, not instructive.

**Checking understanding:** After feedback, ask: "Does that land with you? Is there context I'm missing?" Good feedback is a dialogue.

**What I avoid:**
- "You always do X" — always/never generalizations shut down the conversation.
- Feedback sandwiches ("good, bad, good") — dilutes the message and people stop trusting the positives.
- Waiting for a performance review to raise a chronic issue — that's too late to course correct.`,
    },
    {
      id: "QSE.3",
      question: "How do you stay up to date with frontend technology? What's your learning process?",
      tags: ["learning", "professional development", "staying current", "frontend"],
      answer: `**Passive learning (stays in background):**
- **Twitter/X list:** Dan Abramov, Tanner Linsley, Lee Robinson, Josh Comeau, Theo Browne. High signal, low noise.
- **Newsletters:** This Week in React, Bytes.dev — curated weekly summaries.
- **GitHub notifications:** Watch React, Next.js, shadcn/ui repos. Read changelogs before upgrading.

**Active learning (dedicated time):**
- **Deep dives:** When a new technology becomes relevant (e.g., RSC in Next.js 13), I read the RFC, source code, and build a small PoC — not just watch a tutorial.
- **Personal projects:** This portfolio (project-abyssoftime) is my lab. Features I want to learn go here first — ReactFlow for the Learning English page, crypto-js for the Secret Manager.
- **Reading source code:** Understanding how libraries work at the implementation level (e.g., reading React-Query source) improves how I use them and how I debug them.

**Evaluating new things:** "Is this solving a real problem I have, or is it just novel?" I've learned to resist hype cycles. I waited 2 years before adopting React Server Components until the patterns stabilized.

**What I don't do:** Try to learn everything — the ecosystem is too large. I go deep on the tools I use and stay broadly aware of what else exists.`,
    },
    {
      id: "QSE.4",
      question: "Where do you see yourself in 3–5 years? How does A company fit into that path?",
      tags: ["career goals", "growth", "A company", "vision"],
      answer: `**3–5 year vision:** Senior/Staff Frontend Engineer with both technical depth and engineering leadership scope — someone who can drive technical direction for a product area, not just execute tickets.

Specifically, I want to:
- Lead the technical architecture for a product that reaches tens of millions of users. Scale teaches you things you can't learn in small products.
- Build and grow a frontend engineering culture — conventions, quality standards, mentoring systems.
- Go deeper on performance engineering and platform/infrastructure concerns (WebView platform, Mini App SDK, build tooling).

**Why A company is the right place:**

A's app has ~77M+ users in Vietnam — that scale is genuinely rare. Problems at that scale (performance on low-end devices, real-time communication for millions, Mini App platform constraints) are problems I want to work on.

The Mini App platform means I'd be building tools that other developers build on — a multiplier effect I find compelling.

And from what I understand about A company's engineering culture, there's genuine investment in technical quality. That alignment matters more to me than a purely financial decision.`,
    },
  ],
};

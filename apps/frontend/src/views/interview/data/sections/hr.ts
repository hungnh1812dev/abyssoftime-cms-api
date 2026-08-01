import type { InterviewSection } from "../types";

export const hrSection: InterviewSection = {
  id: "hr",
  label: "I. HR / Recruitment",
  category: "HR",
  iconName: "Users",
  color: "text-emerald-500",
  bgColor: "bg-emerald-500/10",
  questions: [
    {
      id: "Q1.1",
      question: "Why do you want to leave Gameloft after ~6 years? You're already senior at a large company — what's driving the change?",
      tags: ["motivation", "career", "transition"],
      answer: `Gameloft gave me a strong foundation — I grew from game developer to senior frontend, owned major projects end-to-end, and mentored a team. But after 6 years at one company, I've optimized within a familiar environment. A company / A's app represents a fundamentally different scale (tens of millions DAU vs 3M), a different product category (platform/super-app vs campaign websites), and a different engineering culture. I want to solve problems I haven't seen before — real-time communication, mini app sandboxing, platform-level performance constraints — things Gameloft's web projects simply don't expose me to.`,
    },
    {
      id: "Q1.2",
      question: "Why A company / A's app? What do you know about the A's app Mini Apps platform? Have you used any Mini App?",
      tags: ["motivation", "platform", "mini-apps"],
      answer: `A's app is Vietnam's largest messaging platform with 70M+ users. A's app Mini Apps is a platform that allows third-party developers to build lightweight applications that run inside A's app — similar to WeChat Mini Programs. They run in a WebView-like environment with access to A's app APIs (payment, user info, sharing). This directly aligns with my in-app browser experience from Gameloft Club, where I dealt with WebView constraints daily. I've used Mini Apps for services like utility payments and food ordering within A's app.`,
    },
    {
      id: "Q1.3",
      question: "What do you expect from this role that Gameloft couldn't offer?",
      tags: ["motivation", "growth", "scale"],
      answer: `Three things:

**Scale** — A's app's tens of millions DAU pushes frontend architecture decisions that a 3M-user campaign site never requires.

**Platform engineering** — building infrastructure that other developers build on top of, not just end-user features.

**Growth in real-time systems** — A's app's core involves WebSocket, real-time sync, and performance under constant concurrent load, areas I want to deepen.`,
    },
    {
      id: "Q1.4",
      question: "What's your career goal in the next 2-3 years? Do you want to go IC (Individual Contributor) or Management?",
      tags: ["career", "goals", "IC vs management"],
      answer: `I lean toward **Senior IC / Staff Engineer** track. I want to go deeper on frontend architecture and performance at scale. That said, I enjoy mentoring and have done it informally — if a tech lead role emerges where I can still be hands-on (70%+ coding), I'm open to it. I don't want to become a full-time manager.`,
    },
    {
      id: "Q1.5",
      question: "Are you ready to work on a product serving tens of millions of daily users? How is that pressure different from the 3M users you've handled?",
      tags: ["scale", "DAU", "performance"],
      answer: `At 3M users, you can afford slightly slower pages and recover from mistakes relatively quietly. At tens of millions DAU:

- **Every performance regression is amplified** — a 100ms slower load × 50M users = massive aggregate impact.
- **Feature flags and staged rollouts become mandatory** — you can't just deploy and hope.
- **Error monitoring must be real-time** — a bug that affects 0.1% of 50M users is 50K users.
- **Caching strategy becomes critical** — origin servers can't handle the raw request volume.

I'm ready because I've already built the discipline around performance monitoring (Sentry, AWS RUM), load testing (k6 at 1,200 RPS), and caching (CDN + browser cache tuning). The scale is bigger, but the methodology transfers.`,
    },
    {
      id: "Q2.1",
      question: "Tell me about a time you had a conflict with a colleague (backend/designer/PM) over a technical decision. How did you resolve it?",
      tags: ["teamwork", "conflict", "collaboration", "STAR"],
      answer: `On DDV Expansion 3, the backend team wanted to send all localized content through the API. I argued for storing static content in Strapi CMS with ISR so we could cache it at the CDN layer and reduce backend load during launch spikes. There was tension because the backend team had already started building the endpoints.

I resolved it by running a quick load test comparing both approaches — the CMS+CDN path handled 4x more concurrent users without hitting the backend. Data won the argument, and we went with the hybrid approach (API for user-specific data, CMS for content).`,
    },
    {
      id: "Q2.2",
      question: "You mentored 4 developers at Gameloft — tell me about the hardest mentoring case. What was the issue and how did you help?",
      tags: ["mentoring", "leadership", "STAR"],
      answer: `One junior developer consistently wrote components with deeply nested state logic and prop drilling 4-5 levels deep. Code reviews kept flagging the same issues. Instead of just writing "refactor this" in reviews, I paired with them on one feature, showed them how to extract custom hooks and use composition. I also created a small reference architecture in our project wiki showing the pattern for common scenarios.

After about 3 weeks, the quality of their PRs improved significantly — the key was showing the **why** (maintainability, testability) not just the **what**.`,
    },
    {
      id: "Q2.3",
      question: "What experience do you have working cross-team (Product, Backend, QA, Design)? Give a specific example.",
      tags: ["cross-team", "collaboration", "STAR"],
      answer: `On DDV, I worked directly with: the **design team** (translating Figma to responsive components, negotiating animation complexity based on performance budgets), **backend team** (defining API contracts, coordinating deployment order for CMS + frontend + API), **QA** (building a checklist for WebView/Edge 18 testing, reproducing browser-specific bugs together), and **product** (advising on what rendering strategy supports their content update frequency).

Specific example: for the wrap-up feature, I worked with the product team to define data requirements, backend to shape the API response structure, and design to simplify animations that would have tanked performance on mobile.`,
    },
    {
      id: "Q2.4",
      question: "Do you have experience working in large teams (>10 people)? Your Gameloft teams seem small (3-6 people).",
      tags: ["teamwork", "team size", "coordination"],
      answer: `My direct frontend teams were small (3-6), but the full project teams were larger. DDV main site had ~15 people across frontend, backend, QA, design, and content. I coordinated with all of them.

That said, I acknowledge that a 30+ person engineering org at A company is different — more process, more communication overhead, more need for clear interfaces between teams. I'm aware of this gap and see it as something I'll adapt to quickly because I already value clear API contracts and documentation.`,
    },
    {
      id: "Q2.5",
      question: "When a deadline is tight and requirements change, how do you handle it?",
      tags: ["prioritization", "deadlines", "trade-offs"],
      answer: `Prioritize ruthlessly. In practice:

- Clarify with PM which requirements are must-have vs nice-to-have for this release.
- If a requirement change affects architecture, raise the flag immediately — don't silently absorb the risk.
- Cut scope on polish, not on stability — I'd rather ship fewer features that work well than more features that break.
- Communicate the trade-offs in writing so there's alignment, not just verbal agreement.`,
    },
    {
      id: "Q3.1",
      question: "4 years of game dev → frontend — how did that transition shape the way you do frontend work?",
      tags: ["background", "game dev", "performance", "rendering"],
      answer: `Game dev gave me a fundamentally different understanding of rendering. In game dev, you think in frames — 60fps means 16ms per frame, you profile GPU workload, you understand the render pipeline as paint → composite → display.

When I moved to frontend, concepts like layout thrashing, composite layers, \`will-change\`, \`transform\` vs \`top/left\` animations weren't abstract — they mapped directly to things I'd already optimized in OpenGL/WebGL. This is why I could identify and fix the GSAP bottleneck that dropped render time 45% — I knew to look at composite layer creation, not just React re-renders.`,
    },
    {
      id: "Q3.2",
      question: "Your English is conversational — are you comfortable reading/writing technical documentation in English?",
      tags: ["English", "communication"],
      answer: `I read and write technical documentation in English daily — all my work at Gameloft (international company) used English for code, commits, PRs, and internal docs. My spoken English is conversational, not native-fluent.

For technical discussions and meetings, I'm comfortable. For nuanced negotiation or presentation to executives in English, I'd want to improve — but that's unlikely to be a daily requirement at A company.`,
    },
    {
      id: "Q3.3",
      question: "You've only worked at one company (Gameloft) your entire career — do you have any concerns about adapting to a different culture and tech stack?",
      tags: ["adaptability", "single company", "culture"],
      answer: `It's a fair question. My counterpoint: within Gameloft, I've worked across very different contexts — game development (C/C++, OpenGL), web applications, CMS systems, high-traffic campaign sites, and in-app browser apps. Each required learning new tools, patterns, and constraints.

I've also kept current by building side projects, following the React/Next.js ecosystem closely, and adopting new tools (Vite, Vitest, Jotai) proactively. The bigger risk of staying is stagnation — which is exactly why I'm making this move.`,
    },
  ],
};

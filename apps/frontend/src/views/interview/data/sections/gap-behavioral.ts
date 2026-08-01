import type { InterviewSection } from "../types";

export const cvGapSection: InterviewSection = {
  id: "cv-gap",
  label: "IV. CV–JD Gap & Proactive Questions",
  category: "Gap",
  iconName: "FileSearch",
  color: "text-slate-500",
  bgColor: "bg-slate-500/10",
  questions: [
    {
      id: "QGP.1",
      question: "Your CV shows mostly campaign/marketing sites at Gameloft. A company builds consumer apps at scale. How do you bridge that gap?",
      tags: ["experience gap", "scale", "consumer apps", "Gameloft"],
      answer: `I'll be direct about the gap: Gameloft's campaign sites had shorter lifespans and lower traffic than A's app's consumer products. But I want to reframe what I actually built there and what I've been building toward.

**What Gameloft actually required:**
- Campaign sites launched to coincide with game events — **tight deadlines, hard launch dates**. A broken deploy at midnight before a campaign launch is not recoverable. This taught me deployment discipline and rollback planning.
- The DDV wrap-up site was sent via push notification to 4M+ users simultaneously — **traffic spikes**, not sustained load, but real scale events.
- Gameloft Club's in-app browser handled a large internal userbase across Android + iOS WebView — the same environment A's app Mini Apps live in.

**What I've been deliberately preparing:**
- Study of distributed systems and frontend architecture at scale (React Query, cache invalidation, virtual rendering for large datasets).
- This portfolio site is my lab — I've implemented patterns I haven't used in production specifically to close these gaps.
- I'm applying to A company *because* I want to work at consumer-app scale. I know there's a ramp-up; I'm not pretending otherwise.

**What I bring immediately:** Performance discipline, WebView depth, and delivery reliability. The scale problem is one I'm eager to learn hands-on.`,
    },
    {
      id: "QGP.2",
      question: "The JD requires Redux experience but your CV shows none. How confident are you working with Redux?",
      tags: ["Redux", "experience gap", "JD requirement"],
      answer: `Redux is on the JD as a requirement, but I think the underlying requirement is "can you manage complex client-side state in a large codebase with multiple engineers." My answer to that is yes.

**What I know about Redux:**
- Built toy projects with Redux, RTK, and Saga specifically to understand the patterns.
- Read the RTK source code — I understand \`createSlice\`, \`configureStore\`, \`createAsyncThunk\` at the implementation level, not just the API surface.
- Understand Flux architecture, reducer patterns, middleware chain, normalised cache.
- Understand when Redux is the right tool vs. when lighter solutions suffice.

**What I haven't done:** Shipped a production feature in an existing Redux codebase.

**Honest ramp-up estimate:** 1-2 weeks to be productive in an existing Redux project — understanding the specific slices, action patterns, and middleware configuration. 1 month to be confident making architectural decisions.

**What makes the ramp-up faster:** I already understand the concepts deeply. The learning is operational (how your specific codebase is organised), not conceptual.

I won't oversell this, but I also won't let it be a blocker. If Redux is critical, I'm prepared to close this gap fast.`,
    },
    {
      id: "QGP.3",
      question: "You've worked mostly alone or in small teams. A company has large engineering teams. How do you adapt?",
      tags: ["team size", "collaboration", "large team", "communication"],
      answer: `Gameloft wasn't a solo shop — the game studios had hundreds of engineers. The frontend web team was smaller (5-8 people) but we operated within a much larger engineering org with shared infrastructure, platform teams, and cross-functional coordination.

**What I've experienced in team contexts:**
- Cross-functional sprints with design, PM, and backend teams — negotiating API contracts, reviewing specs, raising concerns early.
- Code reviews with engineers at different levels — giving and receiving feedback.
- Coordinating frontend deploys with backend teams around shared release schedules.

**What changes at A company scale:**
- More specialisation — platform teams, design systems team, infra team. I'd need to learn who owns what and how to navigate that.
- More process — RFC processes, design reviews, more stakeholders per decision.
- Higher communication overhead — written clarity matters more.

**How I adapt:** I default to written communication (Slack threads, PR descriptions, design docs) over verbal-only discussions. I ask "who else needs to know this?" before decisions. I read existing conventions before writing new ones.

The skills I'm less sure about are the org-navigation skills that only come from being inside a large org. I'm upfront that this is a learning area, and I'd actively seek guidance from senior colleagues on how to work effectively within A company's structure.`,
    },
    {
      id: "QGP.4",
      question: "Why do you want to leave Gameloft? What are you looking for that you're not getting there?",
      tags: ["motivation", "career change", "Gameloft", "A company"],
      answer: `Gameloft gave me a strong foundation — real production experience, discipline around delivery, and depth in WebView/hybrid app development. I'm grateful for that.

What I'm looking for now:

**Scale:** Gameloft's web products reach hundreds of thousands of users at peak. I want to work on a product that tens of millions of people use daily — the technical and product problems at that scale are qualitatively different.

**Product depth:** Campaign sites have 2-4 week lifecycles. I want to build features that evolve over years, where I can see the long-term impact of architectural decisions.

**Mini App platform:** A's app's Mini App platform is one of the most technically interesting frontend environments in Vietnam. WebView performance, JS bridge design, offline support, auth delegation — these are real hard problems I want to work on.

**Team growth:** I want to work with engineers who are better than me in areas where I'm weak. That's how I grow fastest.

This isn't about Gameloft being bad — it's about where the next chapter of my growth is. A company is the right step.`,
    },
    {
      id: "QGP.5",
      question: "What questions do you have for us? (Questions to ask the interviewer)",
      tags: ["questions for interviewer", "culture", "growth", "team"],
      answer: `**About the role and team:**
- What does the first 90 days typically look like for a new frontend engineer on this team? What does success look like at 3 months?
- What's the biggest technical challenge the frontend team is working on right now?
- How is the team structured — are frontend engineers embedded in product teams or in a centralised frontend guild?

**About A's app Mini App platform:**
- How much of the frontend work touches the Mini App SDK vs. the main web app?
- What's the current state of the Mini App developer tooling and testing infrastructure?
- How do you handle WebView compatibility across the range of Android versions A's app supports?

**About growth and culture:**
- How does the engineering team approach learning and staying current with the frontend ecosystem?
- What's the process for a frontend engineer who wants to take on more architectural responsibility?
- What's something about the engineering culture here that surprised you when you joined?

**About the role specifically:**
- What are the open problems on this team that you hope a new hire will help solve?
- How does the team balance feature velocity with technical debt?`,
    },
    {
      id: "QGP.6",
      question: "Your expected salary is [X]. Is that negotiable?",
      tags: ["salary negotiation", "compensation", "expectations"],
      answer: `**Framing for the negotiation:**

I've researched the market range for senior frontend engineers in Vietnam with my level of experience — particularly those with WebView and React depth. My expectation of [X] reflects that research.

I'm flexible, and I want the decision to be about fit more than a number. If the base is slightly below my expectation, I'd want to understand the full compensation picture — equity, bonus structure, learning budget, career growth pace.

**What I'm optimising for, in priority order:**
1. The technical problems and growth opportunities (clearly compelling with A company).
2. Team quality and culture.
3. Total compensation.

I'm not going to negotiate against myself, but I'm also not going to let a small gap stop me from joining a company where I believe the growth opportunity justifies it.

**Practical:** I'd prefer to discuss compensation after we've both confirmed this is a strong mutual fit — I don't want to anchor a number before either of us has full information.

*(Note: This answer is a framework for the conversation, not a script — adapt to the specific number and context in the actual interview.)*`,
    },
    {
      id: "QGP.7",
      question: "You mentioned learning React by yourself. How do you approach learning a new technology without a teacher?",
      tags: ["self-learning", "methodology", "growth mindset"],
      answer: `**My learning framework:**

**1. Build something real, not a tutorial.**
Tutorials are demonstrations. I learn by building something I care about with the technology. For React, I rebuilt my portfolio from scratch — no copy-paste. For ReactFlow, I built the Learning English mind-map page in this portfolio. Forced to solve real problems, not follow steps.

**2. Read the source.**
When something doesn't work as I expected, I open the library source code. This has been the biggest accelerant. Understanding *how* React's reconciliation works, not just *that* it works, fundamentally changes how you debug.

**3. Read the RFC and changelog.**
Before using a major feature (RSC, React 19 compiler, Next.js App Router), I read the design documents. Understanding the *why* behind design decisions helps me use the tool correctly, not just mechanically.

**4. Teach back.**
Writing down what I learned — in docs, comments, or this portfolio's \`rules/\` files — forces clarity. If I can't explain it simply, I don't fully understand it.

**5. Break things deliberately.**
After learning something, I try to break it — remove the cleanup function from a useEffect, mutate state directly, skip the dependency array. Understanding why the tool enforces what it enforces builds intuition.`,
    },
    {
      id: "QGP.8",
      question: "What's a technical area you're weak in, and what are you doing about it?",
      tags: ["self-awareness", "weaknesses", "growth", "honesty"],
      answer: `**Backend and system design at scale.** My depth is firmly on the frontend. I understand backend concepts well enough to have productive conversations and design sensible API contracts, but I haven't built production backend systems beyond simple Node.js/Express endpoints.

**Why this matters for the role:** System design questions at the staff level require understanding the full stack — database query patterns, cache invalidation, API design, pub/sub systems. I can reason about these from the frontend's perspective, but my backend intuition is less developed.

**What I'm doing about it:**
- Reading "Designing Data-Intensive Applications" (Kleppmann) — working through it chapter by chapter.
- Building backend experience through personal projects — this portfolio has a CMS backend (Strapi + GraphQL) that I operate and debug.
- Studying the Next.js App Router deeply — Server Components, Server Actions, and RSC blur the frontend/backend boundary, which is a natural on-ramp.
- Taking system design mock questions seriously in interview prep — designing the notification system, chat system, and cache layer forces me to reason through the backend side.

**What I'm not weak in:** Performance, state management, TypeScript, WebView, accessibility, testing, component architecture, code quality. I'll be genuinely strong in these from day one.`,
    },
  ],
};

export const behavioralSection: InterviewSection = {
  id: "behavioral",
  label: "V. Behavioral (STAR Method)",
  category: "Behavioral",
  iconName: "Star",
  color: "text-yellow-600",
  bgColor: "bg-yellow-600/10",
  questions: [
    {
      id: "QSTAR.1",
      question: "Tell me about a time you had to deliver under tight deadline pressure.",
      tags: ["STAR", "deadline", "pressure", "delivery"],
      answer: `**Situation:** The DDV (Đấu Trường Danh Vọng) year-wrap campaign had to launch at midnight on December 31st — tied to a coordinated push notification to 4M+ users. Backend was finalised 5 days before launch.

**Task:** Build the frontend — data visualisation for individual player stats, a shareable card generator, animations — in 5 days.

**Action:**
- Cut scope immediately: identified the 3 features that would be shown in marketing screenshots vs. 2 "nice-to-have" features. Deprioritised the nice-to-haves explicitly, with PM buy-in on day 1.
- Parallelised: built the data fetching layer and static layout in parallel with the animation work.
- Deployed preview builds daily so the PM and designer could give feedback on a real URL, not a localhost demo.
- Set a personal code freeze 18 hours before launch — no new features, only bug fixes and browser compatibility.

**Result:** Launched at 00:03 (3 minutes late — server load on push notification delivery). All core features shipped. The shareable card was used by ~120K players in the first 48 hours.

**What I'd do differently:** Earlier scope conversation. Scope cuts made on day 1 are free; scope cuts made on day 4 are stressful.`,
    },
    {
      id: "QSTAR.2",
      question: "Tell me about a time you disagreed with a teammate or manager. How did you resolve it?",
      tags: ["STAR", "conflict", "disagreement", "resolution"],
      answer: `**Situation:** During the Gameloft Club redesign, a senior engineer proposed using an iframe-based architecture to embed a legacy content feed into the new React app — arguing it was faster to ship.

**Task:** I believed this would create significant long-term problems (style bleed, JS communication overhead, mobile scroll issues) that would outweigh the short-term speed gain.

**Action:**
- Didn't argue in the design review. Instead, requested 2 days to build a quick PoC of the iframe approach and document the problems concretely.
- Found: the iframe approach had a 200ms white-flash on load, broken deep-linking, and could not inherit the app's auth cookie cross-origin.
- Documented these findings with screenshots and measurements.
- Proposed an alternative: extract the legacy feed's API calls into a shared service layer, rebuild the UI in React. Estimated 2 extra days vs. the iframe approach.
- Presented both options with the trade-offs measured, not argued.

**Result:** The senior engineer reviewed the PoC findings and agreed the iframe approach would cause worse problems later. We went with the React integration.

**What I learned:** "I disagree" is the start of a conversation, not the end. Evidence wins over assertion. Respecting the other person's intelligence enough to show, not tell.`,
    },
    {
      id: "QSTAR.3",
      question: "Tell me about a time you made a significant mistake in production. What happened?",
      tags: ["STAR", "mistake", "production", "post-mortem", "learning"],
      answer: `**Situation:** During a campaign update for the Asphalt Legends site, I pushed a CSS fix that accidentally overrode a z-index on the cookie consent modal — making it appear behind the hero animation.

**What happened:** The cookie modal was invisible to users. Legal compliance was broken. The error wasn't caught in our staging environment because the animation only triggered after a 3-second delay, and I hadn't waited for it in my QA check.

**Task:** Resolve the issue immediately and prevent recurrence.

**Action:**
- Spotted the issue in a post-deploy smoke test 12 minutes after deployment.
- Rolled back the CSS change within 20 minutes of deployment. Zero new user impact after rollback.
- Wrote a post-mortem: root cause (CSS specificity collision between the fix and the existing z-index layer), how it was missed (QA checklist didn't include cookie modal visibility after animations complete), and three prevention measures.
- Updated the QA checklist and added a Playwright check for the cookie modal's visibility state.

**Result:** No recurrence of this class of issue. The post-mortem was shared with the team — two other engineers found their own similar risks after reading it.

**What I learned:** Time pressure + "small" changes = highest risk. I now treat CSS changes with broad selectors with the same caution as logic changes.`,
    },
    {
      id: "QSTAR.4",
      question: "Tell me about a time you had to learn a new technology quickly to complete a project.",
      tags: ["STAR", "learning", "new technology", "adaptability"],
      answer: `**Situation:** The Gameloft Club project required integrating a WebSocket-based real-time notification system. I had never worked with WebSockets in production.

**Task:** Design and implement the WebSocket client layer for real-time game event notifications (matches starting, friend requests, achievements) within a 3-week sprint.

**Action:**
- Spent 3 days reading: MDN WebSocket docs, the backend team's event schema spec, and studying how existing production WebSocket clients handled reconnection and message queuing.
- Built a small standalone prototype in isolation first — no React, just the WS connection with reconnection logic. Confirmed the backend messages were formatted as expected.
- Then integrated into React using a singleton pattern (one WS connection shared via Context across the app — not recreated on route changes).
- Key decisions I made: exponential backoff on reconnect, a message queue for messages received before handlers were registered, and a heartbeat ping to detect silent disconnections.

**Result:** Shipped within the sprint. The implementation handled a 2-hour server maintenance window gracefully — all clients reconnected without user-visible failure. I documented the reconnection pattern as a reusable module for future projects.

**What made it work:** Prototyping in isolation before integrating. Focusing on the failure modes (reconnect, message ordering, memory leaks) before the happy path.`,
    },
    {
      id: "QSTAR.5",
      question: "Tell me about a project you're most proud of and why.",
      tags: ["STAR", "pride", "achievement", "impact"],
      answer: `**Project:** Gameloft Club in-app browser — specifically the memory leak investigation and fix.

**Why this one:** It was the hardest problem I solved at Gameloft, and it had the most direct user impact.

**Situation:** Users on low-end Android devices were reporting app crashes after 10-15 minutes of browsing in-app. The app team suspected the in-app browser. No reproduction steps — it "just crashes after a while."

**Task:** Find and fix the root cause with no error message, no stack trace, and no reliable reproduction case.

**Action:**
- Attached Chrome DevTools to a physical low-end Android device. Started a heap recording and manually browsed for 10 minutes.
- Identified heap growth of ~8MB every navigation cycle that was never released — growing from 40MB to 80MB over 10 navigations.
- Narrowed to an event listener: the WebSocket notification handler was being registered on every page navigation without the previous one being removed. After 10 pages = 10 active WS message handlers, each holding a closure over the page's full component tree.
- Fix: tracked handler references, removed on page navigation. Heap stayed flat.

**Result:** Crash reports from this category dropped to zero in the following week. ~200K monthly active users on low-end Android were affected.

**Why I'm proud:** I solved it through measurement, not guessing. No shortcuts.`,
    },
    {
      id: "QSTAR.6",
      question: "Where do you see the biggest risk in your own candidacy for this role, and how are you addressing it?",
      tags: ["self-awareness", "risk", "honesty", "candidacy"],
      answer: `**Honest assessment of my risks:**

**1. No production Redux experience.** The JD lists it. My state management work has been Jotai/React Query, not Redux. I understand Redux deeply but haven't used it in a real codebase.

*Addressing it:* I've built Redux projects specifically for this; I can be productive in an existing Redux codebase quickly. But I can't claim production depth I don't have.

**2. No consumer-app-at-scale experience.** Gameloft's web products have traffic peaks but not sustained millions-of-concurrent-users scale.

*Addressing it:* I've studied the patterns — virtual rendering, cache invalidation, connection management. I know what I don't know. I'd expect a ramp-up period and would actively seek guidance.

**3. Limited large-team experience.** My teams have been 5-8 people. A company has much larger eng teams with more process, specialisation, and coordination overhead.

*Addressing it:* I default to written communication and documentation. I ask before assuming. I'd invest early in understanding how the team works before trying to change anything.

**What I'd say directly:** I'm not the safest hire. The safest hire is someone who's already done this exact job at this exact scale. But I think I'm the highest-upside hire — the fundamentals are strong, the gaps are learnable, and I'm genuinely motivated by the problems A company is solving.`,
    },
  ],
};

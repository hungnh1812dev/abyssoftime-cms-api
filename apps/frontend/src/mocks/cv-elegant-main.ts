import type { CvElegantPageDataType } from "@/views/cv-elegant/cv-elegant.types";

export const CVElegantMain_MockData: CvElegantPageDataType[] = [
  {
    documentId: "feb66e29-32aa-4bc2-a9a8-0af5fd164c9c",
    position: "Senior Frontend Developer",
    summary:
      "<p><strong>6 years</strong> building production frontend at Gameloft — <strong>React</strong>/<strong>Next.js</strong>/<strong>TypeScript</strong>, apps handling <strong>3M+ users</strong>. Picked the right rendering strategy (<strong>SSR</strong>/<strong>ISR</strong>/<strong>CSR</strong>) per use case, set up <strong>Strapi CMS</strong> with custom plugins, and handled <strong>GitLab CI/CD</strong> and <strong>Kubernetes</strong> from scratch. Also dealt a lot with <strong>WebView</strong> and in-app browser quirks, and helped junior developers grow through code review. Backed by 4 years of game dev (C/C++, OpenGL, WebGL) — makes browser performance issues like slow renders, layout shifts, and heavy animations familiar territory.</p>",
    educations: [
      {
        degree: "Bachelor of Science in Information Technology",
        description: "",
        institution: "University of Science (HCMUS)",
        location: "Ho Chi Minh City",
        period: "2011 – 2016",
      },
    ],
    experiences: [
      {
        company: "Gameloft Company",
        location: "Ho Chi Minh City",
        roles: [
          {
            period: "Mar 2022 – 2026",
            position: "Senior Frontend Developer",
            projects: "High-traffic web platforms and marketing campaign systems",
            responsibilities:
              "<ul><li>Owned the full frontend from project setup through deployment on multiple campaigns; <strong>mentored 4 developers</strong> mainly through <strong>code reviews</strong>.</li><li>Picked <strong>SSR</strong> for user data, <strong>ISR</strong> for game content, <strong>CSR</strong> only where needed — then tuned <strong>CDN caching</strong> and cut non-critical JS from first paint. <strong>LCP dropped 43%</strong> on the main DDV site.</li><li><strong>Edge 18</strong> and in-app browsers have bugs that don't show up in Chrome DevTools. Built a checklist of known issues the team reused across projects.</li><li>Designed the <strong>Strapi CMS</strong> setup for both major projects, including 3 custom plugins.</li><li>Set up <strong>GitLab CI/CD</strong> and wrote <strong>Kubernetes</strong> configs (<strong>Deployments + HPA</strong>) for frontend and CMS.</li></ul>",
            teamSize: 7,
            techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "GraphQL", "Kubernetes", "Strapi"],
          },
          {
            period: "Mar 2020 – Feb 2022",
            position: "Frontend Developer",
            projects: "Web applications, CMS systems, and legacy platform modernization",
            responsibilities:
              "<ul><li>Built and maintained web applications from Figma designs using <strong>React.js, Next.js</strong>, and <strong>TypeScript</strong>.</li><li>Handled a major <strong>React version upgrade</strong> mid-project and debugged several production rendering issues.</li><li>Introduced <strong>Strapi CMS</strong> to two projects, removing the need for code deploys for content updates.</li><li>Took on <strong>Disney Dreamlight Valley</strong> as main frontend developer from day one — built the Next.js + Strapi CMS foundation with <strong>SSG/ISR</strong> rendering that later scaled to <strong>70,000+ Day-1 peak sessions</strong>.</li></ul>",
            teamSize: 4,
            techStack: ["React", "Next.js", "JavaScript", "TypeScript", "Strapi", "Kubernetes"],
          },
          {
            period: "Jan 2016 – Feb 2020",
            position: "Game Developer",
            projects: "AAA mobile and web-based games",
            responsibilities:
              "<ul><li>Developed and ported mobile/web games across platforms; profiling GPU workload and understanding the render pipeline on low-end Android hardware.</li><li>That background is why browser rendering — paint, composite, layout thrash — feels natural rather than just theory.</li></ul>",
            teamSize: 12,
            techStack: ["C/C++", "Java", "JavaScript", "TypeScript", "OpenGL", "GLSL", "WebGL", "Android NDK", "Android SDK"],
          },
        ],
      },
    ],
    skills: [
      {
        level: "Proficient",
        skill: "React,Next.js,TypeScript,JavaScript (ES6+),HTML5,CSS3,SCSS,Tailwind CSS,SWR,Context API,Jotai,Git",
      },
      {
        level: "Intermediate",
        skill: "Material UI,Shadcn UI,React Query (TanStack),Webpack,Vite,Sentry,AWS RUM,Vitest,React Testing Library",
      },
      {
        level: "Working Knowledge",
        skill: "Core Web Vitals,Browser Rendering,GitLab CI/CD,Github Action,Docker,Kubernetes,Jira,Scrum/Agile",
      },
    ],
    projects: [
      {
        name: "Disney Dreamlight Valley: Yearly Wrap-up Website",
        liveLink: "https://disneydreamlightvalley.com/wrap-up/global",
        responsitoryLink: "",
        role: "Senior Frontend Developer & Reviewer",
        teamSize: 3,
        techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "GSAP", "K6", "Kubernetes"],
        responsibilities:
          "<ul><li>Joined early frontend design discussions for the <strong>wrap-up flow</strong> — shaped the core component structure.</li><li>Built the profile system used by <strong>3M+ users</strong> — SSR for user data, <strong>Strapi CMS</strong> for static content with ISR.</li><li>Found and fixed <strong>GSAP</strong> animation bottlenecks — render time dropped <strong>45%</strong>.</li><li>Set up <strong>Kubernetes HPA</strong> — site held at <strong>1,200 RPS</strong>.</li></ul>",
      },
      {
        name: "Disney Dreamlight Valley",
        liveLink: "https://disneydreamlightvalley.com/",
        responsitoryLink: "",
        role: "Main PIC & Reviewer",
        teamSize: 6,
        techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "GraphQL", "GSAP", "Kubernetes", "Sentry"],
        responsibilities:
          "<ul><li>Built the full <strong>Strapi CMS</strong> from scratch with <strong>SSG/ISR</strong> rendering.</li><li>Built UI and animations for Expansion 3 — Day-1 sessions hit <strong>70,851</strong> vs <strong>12,671</strong> on Expansion 2 (<strong>+559%</strong>).</li><li>Set up <strong>Sentry</strong> to track JS errors and <strong>Web Vitals</strong> in production.</li></ul>",
      },
      {
        name: "Asphalt Legends",
        liveLink: "https://asphaltlegends.com",
        responsitoryLink: "",
        role: "Frontend Developer",
        teamSize: 4,
        techStack: ["React.js", "Next.js", "TypeScript", "Tailwind CSS", "GSAP", "Sentry"],
        responsibilities:
          "<ul><li>Moved from <strong>React.js</strong> to <strong>Next.js App Router</strong> — Lighthouse went from 40 to 60, first load down 25%. GTM showed <strong>+22.5% users</strong> and <strong>+34.4% interactions</strong>.</li><li>Rebuilt all animations and added <strong>Strapi CMS</strong> for the download store.</li><li>Added <strong>Sentry</strong> after the migration to catch production bugs.</li></ul>",
      },
    ],
    languages: [
      { language: "Vietnamese", level: "Native" },
      { language: "English", level: "Read/Written: Intermediate · Spoken: Conversational" },
    ],
    references: [
      { name: "A", role: "H", phone: "0123456789" },
      { name: "B", role: "H", phone: "1234567890" },
    ],
  },
];

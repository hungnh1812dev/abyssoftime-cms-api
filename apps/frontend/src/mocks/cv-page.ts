import type { CvPageDataType } from "@/views/cv/CvPage";

export const CVPage_MockData: CvPageDataType = {
  position: "Senior Frontend Developer",
  summary: {
    name: "Professional Summary",
    description:
      "<p>Senior Frontend Developer with <strong>6 years at GL Saigon (2020–2026)</strong> building high-traffic Next.js applications. Delivered systems sustaining <strong>10,000+ users/minute</strong> at peak through SSR/ISR optimisation, code-splitting, and CDN caching. Reduced Kubernetes pod count by <strong>67%</strong> (60→20) by diagnosing a root-cause over-scaling issue; cut animation overhead by <strong>50%</strong> on a high-traffic campaign through CSS and rendering-level optimisation. Built custom Strapi plugins, configured GitLab CI/CD pipelines with Helmfile/K8s, and shipped features reliably across hostile environments (WebView, Edge 18, in-app browsers). Mentored junior developers through regular code reviews and pairing. Started out in game development before switching to web — that's where the render performance obsession came from.</p>",
  },
  skills: {
    name: "Technical Skills",
    items: [
      {
        category: "Core Technologies",
        items: [
          { name: "React.js", exp: "5+ years" },
          { name: "Next.js", exp: "5+ years" },
          { name: "TypeScript", exp: "5+ years" },
          { name: "JavaScript (ES6+)", exp: "5+ years" },
          { name: "HTML5 & CSS3", exp: "5+ years" },
          { name: "Vue.js", exp: "1+ years" },
        ],
      },
      {
        category: "State Management",
        items: [
          { name: "Jotai", exp: "4+ years" },
          { name: "React Context", exp: "3+ years" },
          { name: "Redux", exp: "1+ years" },
        ],
      },
      {
        category: "API & Data Fetching",
        items: [
          { name: "REST API", exp: "5+ years" },
          { name: "GraphQL", exp: "4+ years" },
          { name: "SWR", exp: "4+ years" },
          { name: "React Query (TanStack)", exp: "1+ years" },
        ],
      },
      {
        category: "Styling & UI",
        items: [
          { name: "Tailwind CSS", exp: "5+ years" },
          { name: "Responsive Design", exp: "5+ years" },
          { name: "Sass/LESS", exp: "5+ years" },
          { name: "Accessibility (A11Y)", exp: "2+ years" },
          { name: "Material-UI", exp: "2+ years" },
        ],
      },
      {
        category: "Web Fundamentals",
        items: [
          { name: "Core Web Vitals / Performance", exp: "5+ years" },
          { name: "SEO", exp: "4+ years" },
          { name: "Web Security Basics", exp: "2+ years" },
        ],
      },
      {
        category: "Testing & Quality",
        items: [
          { name: "Jest", exp: "1+ years" },
          { name: "React Testing Library", exp: "1+ years" },
          { name: "Playwright (E2E)", exp: "1+ years" },
          { name: "Storybook", exp: "1+ years" },
        ],
      },
      {
        category: "Build Tools & DevOps",
        items: [
          { name: "Git", exp: "6+ years" },
          { name: "GitLab CI/CD", exp: "6+ years" },
          { name: "npm / yarn / pnpm", exp: "5+ years" },
          { name: "Kubernetes / Helmfile", exp: "3 years" },
          { name: "Webpack / Vite", exp: "1+ years" },
        ],
      },
    ],
  },
  experiences: {
    name: "Professional Experience",
    items: [
      {
        company: "GL Saigon",
        location: "Ho Chi Minh City",
        roles: [
          {
            position: "Senior Frontend Developer",
            period: "03/2022 - 03/2026",
            responsibilities: `
        <ul>
          <li>Applied SSR, ISR, and dynamic imports to reduce page load times and maintain healthy Core Web Vitals across production</li>
          <li>Ran regular code reviews and pairing sessions to help juniors level up</li>
          <li>Built and shipped features reliably across challenging environments — WebView, Edge 18, in-app browsers</li>
          <li>Built custom Strapi plugins so editors could push content updates on their own, without waiting on a dev</li>
          <li>Implemented SEO across multiple projects: structured tracking classes, analytics events, and meta tags</li>
          <li>Pushed to switch from Redux to React Query + Jotai on new projects — cut a lot of boilerplate and made data-fetching patterns consistent across the team</li>
          <li>Configured GitLab CI/CD pipelines using Helmfile-based templates for Kubernetes deployments</li>
        </ul>
        `,
            techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GraphQL", "Strapi", "GitLab CI/CD", "Kubernetes"],
            projects: "Yearly wrap-up website, Community Companion website, DDV Website",
          },
          {
            position: "Frontend Developer",
            period: "03/2020 - 02/2022",
            responsibilities: `
        <ul>
          <li>Maintained a PHP legacy platform — resolved UI/responsive bugs and delivered new features including subscription flow, patch-note pages, and hero banners</li>
          <li>Upgraded React.js across multiple projects and resolved rendering and load issues impacting production users</li>
          <li>Built <strong>Strapi</strong> CMS pages so the content team could push updates without waiting on a dev</li>
          <li>Built new pages in <strong>React.js / Next.js</strong> from Figma, working closely with designers to make sure things looked right</li>
        </ul>
        `,
            techStack: ["React.js", "Next.js", "JavaScript", "Sass", "Strapi", "PHP"],
          },
          {
            position: "Game Developer",
            period: "07/2016 - 02/2020",
            responsibilities: `
        <ul>
          <li>Built game features across projects in <strong>Cocos Creator</strong> (JS/TS), <strong>Unreal Engine</strong>, and <strong>Unity</strong> — Cocos runs on a web engine, so this meant writing real JavaScript and thinking in frame budgets long before touching React</li>
          <li>Collaborated with designers and game designers on UI and gameplay, working from game design docs and mockups</li>
          <li>Participated in code reviews and internal knowledge-sharing to maintain codebase quality</li>
        </ul>
        `,
            techStack: ["Cocos Creator", "JavaScript", "TypeScript", "Unreal Engine", "Unity"],
          },
        ],
      },
    ],
  },
  projects: {
    name: "Featured Projects",
    items: [
      {
        name: "Yearly wrap-up website",
        role: "Main developer & reviewer",
        description: `
        <p>A high-traffic seasonal campaign celebrating what players accomplished throughout the year.</p>
        <ul>
          <li>Set up the data layer and built out the core UI pieces — cards, controllers</li>
          <li>Wired up the backend APIs</li>
          <li>Reviewed code across the team throughout the project</li>
          <li>Cut animation overhead by <strong>50%</strong> — optimised CSS, React hooks, and rendering behaviour to get there</li>
          <li>Ran k6 load and stress tests on the Kubernetes dev environment</li>
          <li>Used SSR, ISR, dynamic imports, code-splitting, and CDN/browser caching to hold up under <strong>10,000 users/minute</strong></li>
        </ul>`,
        teamSize: 3,
        // link: "Under NDA — available upon request",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GSAP", "K6", "K8s"],
      },
      {
        name: "Community Companion website",
        role: "Main developer",
        description: `
        <p>A voting site where players chose items they wanted to see on in-game characters — built and deployed solo.</p>
        <ul>
          <li>Handled the whole project solo — from design review through deployment</li>
          <li>Built both the voting API and the CMS data layer</li>
          <li>Wired up UI and display logic to live round-by-round API data</li>
          <li>Achieved <strong>30%</strong> performance improvement through SSR, ISR, and caching optimisation</li>
          <li>Diagnosed a Kubernetes over-scaling root cause; caching fixes reduced CMS pod count from <strong>60 to 20</strong> (−67%)</li>
        </ul>
        `,
        teamSize: 1,
        // link: "Under NDA — available upon request",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GraphQL"],
      },
      {
        name: "DDV Website",
        role: "Developer",
        description: `
        <p>Main website for the Disney Dreamlight Valley game — a large multi-team product with ongoing content and feature work.</p>
        <ul>
          <li>Built and maintained sub-pages within the main site, ensuring cross-browser compatibility across a wide device and browser matrix</li>
          <li>Managed content delivery through Strapi CMS, enabling fast turnaround without engineering bottlenecks</li>
          <li>Improved page performance across multiple site sections, contributing to Core Web Vitals targets</li>
          <li>Implemented SEO improvements: meta tags, structured data, and analytics tracking across the site</li>
        </ul>
        `,
        teamSize: 6,
        // link: "Under NDA — available upon request",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GraphQL"],
      },
      {
        name: "Personal Portfolio & Dev Toolset",
        role: "Solo — design, development, deployment",
        description: `
        <p>A personal site I built because I wanted something more than a static CV — ended up turning into a set of tools I actually use. The CV you're reading right now is part of it.</p>
        <ul>
          <li>Runs across 4 services: Next.js on Vercel, Strapi CMS on Render, Supabase for data, Cloudinary for assets — all connected and in production</li>
          <li>Vocabulary browser that scrolls through 3,000+ Oxford words smoothly — built the virtual scrolling from scratch without a library</li>
          <li>React knowledge graph (ReactFlow) I update as I go — beats keeping notes in Notion</li>
          <li>HMAC-SHA256 session auth and an AES-256 encrypted vault for personal credentials, no third-party auth library involved</li>
          <li>CMS-driven CV so content changes don't require a code deploy</li>
          <li>GitHub Actions handles CI/CD — push to main, it builds and ships automatically</li>
        </ul>
        `,
        teamSize: 1,
        link: "http://localhost:3000", // TODO: live URL
        responsitoryLink: "http://localhost:3000", // TODO: GitHub repo URL
        techStack: ["Next.js", "TypeScript", "Tailwind CSS", "Strapi", "Supabase", "Cloudinary", "Playwright", "GraphQL", "GitHub Actions"],
      },
    ],
  },
  education: {
    name: "Education",
    items: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Science",
        location: "Ho Chi Minh City",
        period: "2011 - 2016",
        description: "",
      },
    ],
  },
  languages: {
    name: "Languages",
    items: [
      { language: "Vietnamese", level: "Native" },
      { language: "English", level: "Fluent" },
    ],
  },
};

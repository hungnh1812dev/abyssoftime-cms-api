import type { CvCollectionItemType } from "@/views/cv/CvPage";

export const CVFeLeadJp2026_MockData: CvCollectionItemType = {
  documentId: "fe-lead-jp2026",
  isMain: false,
  companyName: "Frontend Lead (JP)",
  position: "Senior Frontend Developer / Tech Lead",
  summary: {
    name: "Professional Summary",
    description:
      "<p>Senior Frontend Developer with <strong>6 years of professional experience</strong> at GL Saigon (2020–2026), specialising in <strong>React.js / Next.js</strong> and <strong>TypeScript</strong>. Led frontend development across the full project lifecycle — from requirements definition with product managers and designers, through implementation and code review, to production deployment on Kubernetes. Delivered applications handling <strong>10,000+ users/minute</strong> at peak, with a consistent focus on UI quality, UX improvement, and <strong>DX promotion</strong> within the team. Experienced in unit testing (Jest, React Testing Library), cross-browser compatibility (including Edge 18, WebView, in-app browsers), and web security basics. Comfortable working and communicating in <strong>English</strong> on a daily basis.</p>",
  },
  skills: {
    name: "Technical Skills",
    items: [
      {
        category: "Core Technologies",
        items: [
          { name: "React.js", exp: "expert" },
          { name: "Next.js", exp: "expert" },
          { name: "TypeScript", exp: "expert" },
          { name: "JavaScript (ES6+)", exp: "expert" },
          { name: "HTML5 & CSS3", exp: "expert" },
          { name: "VueJS", exp: "familiar" },
        ],
      },
      {
        category: "UI / UX & Styling",
        items: [
          { name: "Tailwind CSS", exp: "expert" },
          { name: "Material-UI", exp: "proficient" },
          { name: "Radix UI", exp: "proficient" },
          { name: "Sass/LESS", exp: "proficient" },
          { name: "Responsive Design", exp: "expert" },
          { name: "Accessibility (A11Y)", exp: "proficient" },
        ],
      },
      {
        category: "Data Fetching & State",
        items: [
          { name: "React Query (TanStack)", exp: "expert" },
          { name: "REST API", exp: "expert" },
          { name: "GraphQL", exp: "proficient" },
          { name: "SWR", exp: "proficient" },
        ],
      },
      {
        category: "Testing & Quality",
        items: [
          { name: "Jest", exp: "proficient" },
          { name: "React Testing Library", exp: "proficient" },
          { name: "Playwright (E2E)", exp: "familiar" },
          { name: "Storybook", exp: "familiar" },
        ],
      },
      {
        category: "Web Fundamentals",
        items: [
          { name: "Browser rendering pipeline", exp: "proficient" },
          { name: "Cross-browser compatibility", exp: "expert" },
          { name: "Web Security basics", exp: "proficient" },
          { name: "Core Web Vitals / Performance", exp: "expert" },
          { name: "SEO", exp: "proficient" },
        ],
      },
      {
        category: "Build Tools & DevOps",
        items: [
          { name: "Webpack / Vite", exp: "proficient" },
          { name: "GitLab CI/CD", exp: "proficient" },
          { name: "Kubernetes / Helmfile", exp: "proficient" },
          { name: "Git", exp: "expert" },
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
            position: "Senior Frontend Developer (Tech Lead)",
            period: "03/2022 – 03/2026",
            responsibilities: `
        <ul>
          <li>Acted as tech lead across full project lifecycle: participated in <strong>requirements definition</strong> with product managers and designers, decomposed work, and drove technical decisions</li>
          <li>Conducted regular <strong>code reviews</strong> and pairing sessions to raise code quality and help junior developers grow</li>
          <li>Defined and enforced frontend technical standards and introduced tooling improvements that boosted <strong>developer experience (DX)</strong></li>
          <li>Implemented UI close to designer specs with a strong emphasis on <strong>UX quality</strong> — animations, interaction states, loading patterns</li>
          <li>Applied SSR, ISR, dynamic imports, and CDN caching to support <strong>10,000+ users/minute</strong> at peak, keeping Core Web Vitals healthy</li>
          <li>Reduced animation overhead by <strong>50%</strong> on a high-traffic campaign through CSS and React rendering optimisations</li>
          <li>Built and shipped features reliably in hostile environments: <strong>WebView, Edge 18, in-app browsers</strong> — solid understanding of browser rendering differences</li>
          <li>Wrote <strong>unit and integration tests</strong> (Jest, React Testing Library) as a standard part of feature delivery</li>
          <li>Set up GitLab CI/CD pipelines with Helmfile-based templates for Kubernetes deployments</li>
        </ul>
        `,
          },
          {
            position: "Frontend Developer",
            period: "03/2020 – 02/2022",
            responsibilities: `
        <ul>
          <li>Built new pages in <strong>React.js / Next.js</strong> from Figma designs, collaborating closely with designers to match UX intent</li>
          <li>Collaborated with product managers on <strong>specification formulation</strong> for new features (subscription flow, patch-note pages, hero banners)</li>
          <li>Upgraded React.js on several projects and resolved rendering/load issues impacting production users</li>
          <li>Built <strong>Strapi CMS</strong> pages so the content team could push updates without engineering dependency</li>
          <li>Maintained a PHP legacy platform — fixed UI/responsive bugs and delivered new features</li>
        </ul>
        `,
          },
        ],
      },
    ],
  },
  projects: {
    name: "Featured Projects",
    items: [
      {
        name: "Yearly Wrap-up Website",
        role: "Tech Lead Frontend & Reviewer",
        description: `
        <p>High-traffic seasonal campaign celebrating what players achieved throughout the year.</p>
        <ul>
          <li>Led technical decisions and <strong>reviewed all team code</strong> throughout the project</li>
          <li>Collaborated with designers on UX flows and implemented UI precisely from specs</li>
          <li>Reduced animation overhead by <strong>50%</strong> — optimised CSS, React hooks, and rendering behaviour</li>
          <li>Applied SSR, ISR, code-splitting, and CDN/browser caching to sustain <strong>10,000 users/minute</strong></li>
          <li>Ran k6 load and stress tests on the Kubernetes dev environment</li>
        </ul>`,
        teamSize: 3,
        link: "https://abc.com/wrap-up/global",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GSAP", "K6", "K8s"],
      },
      {
        name: "Community Companion Website",
        role: "Solo Developer (Full ownership)",
        description: `
        <p>A player-voting site built and deployed entirely by one engineer — demonstrating full project lifecycle ownership.</p>
        <ul>
          <li>Handled requirements, design review, implementation, API integration, and deployment solo</li>
          <li>Built both the voting API and CMS data layer; wired display logic to live round-by-round results</li>
          <li>Achieved <strong>30%</strong> performance improvement via SSR, ISR, and caching</li>
          <li>Diagnosed a Kubernetes over-scaling root cause; fixed caching layer, reducing CMS pod count from <strong>60 to 20</strong> (−67%)</li>
        </ul>
        `,
        teamSize: 1,
        link: "https://abc.com/community-companion",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GraphQL"],
      },
      {
        name: "DDV Main Website",
        role: "Developer",
        description: `
        <p>Main website for Disney Dreamlight Valley — a large multi-team product with ongoing content and feature work.</p>
        <ul>
          <li>Built sub-pages and maintained cross-browser compatibility across a wide device/browser matrix</li>
          <li>Contributed to site-wide performance and SEO improvements</li>
          <li>Managed content delivery via CMS, enabling fast turnaround without engineering bottlenecks</li>
        </ul>
        `,
        teamSize: 6,
        link: "https://abc.com",
        techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GraphQL"],
      },
    ],
  },
  education: {
    name: "Education",
    items: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Science (HCMUS)",
        location: "Ho Chi Minh City",
        period: "2011 – 2016",
        description: "",
      },
    ],
  },
  languages: {
    name: "Languages",
    items: [
      { language: "Vietnamese", level: "Native" },
      { language: "English", level: "Fluent — daily professional use" },
    ],
  },
};

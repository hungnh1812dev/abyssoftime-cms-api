import type { CvCollectionItemType } from "@/views/cv/CvPage";

export const CVDemoAbc123_MockData: CvCollectionItemType = {
  documentId: "demo-abc123",
  isMain: false,
  companyName: "Demo Company",
  position: "Senior Frontend Developer",
  summary: {
    name: "Professional Summary",
    description:
      "<p>Tailored CV for <strong>Demo Company</strong>. Experienced Senior Frontend Developer with <strong>6 years</strong> building large-scale Next.js applications. Proven ability to deliver high-performance web solutions — from SSR/ISR optimization to CI/CD pipelines — with strong focus on code quality and team collaboration.</p>",
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
        ],
      },
      {
        category: "Styling & UI",
        items: [
          { name: "Tailwind CSS", exp: "expert" },
          { name: "Radix UI", exp: "proficient" },
          { name: "Material-UI", exp: "proficient" },
        ],
      },
      {
        category: "Infrastructure",
        items: [
          { name: "GitLab CI/CD", exp: "proficient" },
          { name: "Kubernetes / Helmfile", exp: "proficient" },
          { name: "Docker", exp: "proficient" },
        ],
      },
    ],
  },
  experiences: {
    name: "Work Experience",
    items: [
      {
        company: "GL Saigon",
        location: "Ho Chi Minh City",
        roles: [
          {
            position: "Senior Frontend Developer",
            period: "2020 – 2026",
            responsibilities:
              "<ul><li>Built and maintained Next.js applications handling <strong>10,000+ users/minute</strong> at peak with SSR/ISR caching strategies.</li><li>Reduced Kubernetes pod count by <strong>67%</strong> (60 → 20) by diagnosing over-scaling root cause.</li><li>Cut animation overhead by <strong>50%</strong> through CSS and rendering optimizations on a high-traffic campaign.</li><li>Developed custom Strapi CMS plugins and GitLab CI/CD pipelines using Helmfile/K8s.</li></ul>",
          },
        ],
      },
    ],
  },
  projects: {
    name: "Key Projects",
    items: [
      {
        name: "High-Traffic Campaign Platform",
        description: "<p>Large-scale promotional platform optimized for peak traffic events. Focused on ISR, CDN caching, and rendering performance.</p>",
        techStack: ["Next.js", "TypeScript", "Strapi CMS", "Kubernetes", "GitLab CI"],
        teamSize: 6,
        role: "Tech Lead Frontend",
      },
      {
        name: "Internal CMS Dashboard",
        description: "<p>Custom Strapi plugin development and admin dashboard for content management across multiple markets.</p>",
        techStack: ["React.js", "TypeScript", "Strapi", "REST API"],
        teamSize: 3,
        role: "Frontend Developer",
      },
    ],
  },
  education: {
    name: "Education",
    items: [
      {
        degree: "Bachelor of Information Technology",
        institution: "University of Science (HCMUS)",
        location: "Ho Chi Minh City",
        period: "2016 – 2020",
        description: "",
      },
    ],
  },
  languages: {
    name: "Languages",
    items: [
      { language: "Vietnamese", level: "Native" },
      { language: "English", level: "Professional Working Proficiency" },
    ],
  },
};

export interface HomePageItem {
  href: string;
  iconName: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface HomePageData {
  data: {
    homePage: {
      pages: HomePageItem[];
    };
  };
}

export const HomePage_MockData: HomePageData = {
  data: {
    homePage: {
      pages: [
        {
          href: "/cv-2",
          iconName: "FileText",
          title: "CV",
          subtitle: "Senior React Frontend Developer",
          description: "Xem CV / Resume của Nguyen Huy Hung.",
          tags: ["6+ năm kinh nghiệm", "React · Next.js · TypeScript"],
        },
        {
          href: "/learning/english",
          iconName: "BookOpen",
          title: "EN Vocabulary",
          subtitle: "3000 từ giao tiếp",
          description: "Học 3000 từ vựng tiếng Anh giao tiếp thông dụng theo từng pack.",
          tags: ["3000+ từ vựng", "Học theo pack · Dark mode"],
        },
        {
          href: "/vaccine",
          iconName: "Syringe",
          title: "Vaccine",
          subtitle: "Thông tin tiêm chủng",
          description: "Tra cứu vắc-xin và so sánh các gói tiêm chủng VNVC.",
          tags: ["39+ loại vắc-xin", "Lịch 0 – 24 tháng · So sánh gói"],
        },
        {
          href: "/learning/develop/react",
          iconName: "Code2",
          title: "React Knowledge Base",
          subtitle: "JS · TS · Browser · React · Next.js · AI",
          description: "Tổng hợp kiến thức Frontend: JavaScript, TypeScript, Browser APIs, React lifecycle, tất cả React hooks với render phase, Next.js và AI.",
          tags: ["7 chủ đề", "React Hooks · Render phases"],
        },
        {
          href: "/learning/develop/architecture",
          iconName: "Layers",
          title: "Architecture & Design Patterns",
          subtitle: "System · Software · SOLID · GoF Patterns",
          description: "Tổng hợp kiến thức kiến trúc phần mềm: System Architecture, Software Architecture, SOLID principles, Creational, Structural và Behavioral patterns.",
          tags: ["6 chủ đề", "GoF · SOLID · Clean Architecture"],
        },
        {
          href: "/interview",
          iconName: "MessageSquare",
          title: "Interview Prep",
          subtitle: "Frontend Engineer · 150+ Q&A",
          description: "Bộ câu hỏi phỏng vấn Frontend Engineer: HR, React, State Management, JS, CSS, Performance, Architecture, Testing, WebView và Leadership.",
          tags: ["22 chủ đề", "React · System Design · Behavioral"],
        },
        {
          href: "/learning/develop/go",
          iconName: "Binary",
          title: "Go Knowledge Base",
          subtitle: "Syntax · Concurrency · Web Server · Testing",
          description: "Tổng hợp kiến thức Go: cú pháp, kiểu dữ liệu, concurrency, thư viện chuẩn, xây dựng server, testing và bảo mật.",
          tags: ["12 chủ đề", "Goroutines · gRPC · JWT"],
        },
      ],
    },
  },
};

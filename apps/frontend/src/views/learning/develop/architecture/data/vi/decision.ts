import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const decisionSection: ArchitectureSection = {
  id: "decision",
  title: "Decision Guide",
  icon: "Compass",
  description: "Khi nào dùng gì? Bảng tra cứu theo loại dự án, requirement, và dấu hiệu pain trong code",
  style: {
    iconColor: "text-yellow-500 dark:text-yellow-400",
    headerBg: "bg-yellow-500/10 dark:bg-yellow-500/[0.08]",
    headerBorder: "border-yellow-500/20 dark:border-yellow-500/30",
    accentBorder: "border-yellow-500/50 dark:border-yellow-500/30",
    sidebarBg: "bg-yellow-500/10",
    sidebarText: "text-yellow-700 dark:text-yellow-300",
  },
  cards: [
    {
      id: "project-type-guide",
      title: "Chọn kiến trúc hệ thống theo loại dự án",
      subtitle: "Mapping loại dự án → team size → kiến trúc đề xuất",
      icon: "Compass",
      iconColor: "text-yellow-500",
      isWide: true,
      content: {
        table: {
          headers: ["Loại dự án", "Team size", "Kiến trúc đề xuất", "Lý do"],
          rows: [
            ["MVP / Startup", "1–5", { badge: "Monolith", color: "blue" }, "Ship nhanh, chưa biết domain rõ, ít overhead"],
            ["SaaS scale-up (sau product-market fit)", "5–20", { badge: "Modular Monolith → Microservices", color: "blue" }, "Migrate dần khi domain rõ ràng hơn"],
            ["Enterprise (nhiều team, nhiều domain)", "20+", { badge: "Microservices", color: "green" }, "Team autonomy, independent deploy"],
            ["Data-heavy / Real-time analytics", "Any", { badge: "Event-Driven + CQRS", color: "purple" }, "High throughput, read/write workload khác nhau"],
            ["Serverless / API backend nhẹ", "1–3", { badge: "Serverless (Lambda/Vercel)", color: "orange" }, "Không cần quản lý infra, pay-per-use"],
            ["Internal tool / Admin dashboard", "Any", { badge: "Layered Monolith", color: "teal" }, "Đơn giản, không cần over-engineer"],
            ["E-commerce (orders, payments, inventory)", "5–15", { badge: "Microservices + Event-Driven", color: "green" }, "Domains rõ, cần async side effects (email, stock)"],
          ],
        },
      },
    },
    {
      id: "requirement-pattern",
      title: "Requirement → Design Pattern",
      subtitle: "Khi gặp requirement này, nghĩ đến pattern này",
      icon: "Compass",
      iconColor: "text-green-500",
      isWide: true,
      content: {
        table: {
          headers: ["Requirement / Dấu hiệu", "Pattern", "Giải thích"],
          rows: [
            ["Cần notify nhiều module khi X thay đổi", { badge: "Observer / Event Bus", color: "green" }, "Loose coupling giữa publisher và subscriber"],
            ["Cần hỗ trợ nhiều payment method, dễ thêm mới", { badge: "Strategy", color: "blue" }, "Mỗi method là strategy, thêm mới không sửa code cũ"],
            ["Object có nhiều states, behavior khác nhau theo state", { badge: "State", color: "orange" }, "Loại bỏ if/switch lan tràn theo state"],
            ['Cần undo/redo hoặc "queue tasks để execute sau"', { badge: "Command", color: "purple" }, "Encapsulate request as object"],
            ["Cần validate/auth/logging trước khi xử lý request", { badge: "Chain of Responsibility", color: "teal" }, "Middleware pipeline"],
            ["Dùng library/legacy có API không phù hợp", { badge: "Adapter", color: "green" }, "Wrap để expose interface mong muốn"],
            ["Cần create family of related objects (themes, drivers)", { badge: "Abstract Factory", color: "blue" }, "Đảm bảo compatibility trong cùng family"],
            ["Constructor quá nhiều params, nhiều optional", { badge: "Builder", color: "orange" }, "Fluent API, tạo object từng bước"],
            ["Cần cache / lazy load / access control cho object", { badge: "Proxy", color: "purple" }, "Transparent wrapper với thêm behavior"],
            ["Cần thêm feature cho class mà không thể sửa", { badge: "Decorator", color: "teal" }, "Wrap và extend behavior"],
            ["Subsystem quá phức tạp cho client", { badge: "Facade", color: "green" }, "Simple interface hide complexity"],
            ["Cần xử lý tree structure (folders, UI components)", { badge: "Composite", color: "blue" }, "Uniform interface cho leaf và branch"],
            ["Read và write workload khác nhau nhiều", { badge: "CQRS", color: "orange" }, "Tách model đọc/ghi, optimize riêng"],
            ["Cần audit log đầy đủ, time travel", { badge: "Event Sourcing", color: "purple" }, "Lưu events thay vì current state"],
            ["Business logic phức tạp, cần testable tốt", { badge: "Clean / Hexagonal Arch", color: "teal" }, "Domain không phụ thuộc framework"],
          ],
        },
      },
    },
    {
      id: "evolving-requirements",
      title: "Dự án có requirements thay đổi — Apply pattern khi nào?",
      subtitle: "Nguyên tắc: đừng apply pattern sớm quá — chờ đến khi pain xuất hiện",
      icon: "Compass",
      iconColor: "text-purple-500",
      isWide: true,
      content: {
        table: {
          headers: ["Dấu hiệu pain trong code", "Nên thay đổi thành", "Cách migrate"],
          rows: [
            ["if/else theo loại đối tượng ở nhiều nơi", { badge: "Strategy hoặc Polymorphism", color: "blue" }, "Extract mỗi branch thành class, inject strategy"],
            ["if/else theo state ở nhiều method", { badge: "State Pattern", color: "orange" }, "Extract mỗi state thành class, delegate behavior"],
            ["Tightly coupled modules — A import B import C phức tạp", { badge: "Observer / Event Bus", color: "green" }, "Introduce event bus, convert direct calls thành events"],
            ["Query DB phức tạp chậm vì model dùng chung cho write", { badge: "CQRS", color: "purple" }, "Tạo read model riêng, sync bằng events"],
            ["Monolith chậm vì 1 module có traffic đột biến", { badge: "Extract Microservice", color: "teal" }, "Strangler Fig Pattern — dần dần extract module ra service"],
            ["Unit test chậm vì phụ thuộc DB/HTTP", { badge: "Clean/Hexagonal Arch + Interfaces", color: "blue" }, "Introduce interface cho external deps, inject in tests"],
            ["Constructor có 5+ parameters, many optional", { badge: "Builder", color: "orange" }, "Extract builder class với fluent API"],
            [
              "Third-party library upgrade breaking API",
              { badge: "Adapter / Anti-corruption Layer", color: "green" },
              "Wrap library trong adapter — internal code không biết library version",
            ],
          ],
        },
        infoBoxes: [
          {
            type: "tip",
            title: "Quy tắc vàng — Rule of Three",
            content:
              "Lần đầu — just do it. Lần hai — note it. Lần ba — refactor. Đừng abstract khi chưa thấy pattern lặp lại ít nhất 3 lần. Over-engineering sớm tốn hơn là refactor sau.",
          },
          {
            type: "note",
            title: "YAGNI + SOLID",
            content:
              "Bắt đầu với solution đơn giản nhất. Áp dụng SOLID principles làm guide để biết **khi nào** nên refactor — không cần áp dụng mọi pattern ngay từ đầu. OCP thường là trigger để introduce Strategy hoặc Factory. SRP trigger để tách class. DIP trigger để introduce interface.",
          },
        ],
      },
    },
  ],
};

import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const softwareArchSection: ArchitectureSection = {
  id: "software-arch",
  title: "Software Architecture",
  icon: "Workflow",
  description: "Clean Architecture, Hexagonal, CQRS, Event Sourcing — kiến trúc phần mềm",
  style: {
    iconColor: "text-emerald-500 dark:text-emerald-400",
    headerBg: "bg-emerald-500/10 dark:bg-emerald-500/[0.08]",
    headerBorder: "border-emerald-500/20 dark:border-emerald-500/30",
    accentBorder: "border-emerald-500/50 dark:border-emerald-500/30",
    sidebarBg: "bg-emerald-500/10",
    sidebarText: "text-emerald-700 dark:text-emerald-300",
  },
  cards: [
    {
      id: "clean-architecture",
      title: "Clean Architecture",
      subtitle: "Robert C. Martin — dependency hướng vào trong, domain cô lập",
      icon: "Target",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "**Dependency Rule:** mọi dependency chỉ được trỏ vào trong (toward domain). Framework, DB, UI là detail — domain không biết chúng tồn tại.\n\n**Layers (outer → inner):**",
            unorderedList: ["Frameworks & Drivers (Web, DB, UI)", "Interface Adapters (Controllers, Gateways)", "Use Cases (Application)", "**Entities (Domain)** — lõi thuần túy"],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Business logic phức tạp — pricing engine, loan approval rules, tax calculation"** → Domain entities chứa toàn bộ logic, test không cần DB, chạy nhanh.',
                '**"Cần test coverage cao — CI chạy unit test trong <30s"** → UseCase không import framework/DB, inject mock repository là test ngay.',
                '**"Hiện dùng PostgreSQL, nhưng có thể cần chuyển sang MongoDB"** → DB là adapter, chỉ implement interface `UserRepository` — domain không đổi gì.',
                '**"App phải expose cả REST API lẫn CLI tool cho admin"** → Cùng một UseCase, hai adapter khác nhau.',
                "**Dự án dài hạn 2+ năm, team 5+ người** → Ranh giới rõ ràng giúp dev mới hiểu nhanh.",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào KHÔNG nên dùng",
              items: [
                "CRUD API đơn giản — blog post, product listing → 4 layers + interfaces cho một GET /posts là over-engineering",
                "MVP trong 6 tuần → Boilerplate của Clean Arch tốn 20–30% thời gian ban đầu. Không đáng ở giai đoạn này",
                "Team chưa quen → Áp dụng sai Clean Arch còn tệ hơn Layered đúng. Cần training trước",
                "Dấu hiệu đang làm sai: UseCase import express.Request, Entity biết về prisma.User — đây là vi phạm Dependency Rule, không phải Clean Arch",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Testable hoàn toàn — domain không cần DB/framework", "Thay DB/Framework dễ dàng", "Business logic tập trung, rõ ràng"],
              cons: ["Boilerplate nhiều", "Overkill cho app đơn giản", "Học và áp dụng đúng mất thời gian"],
            },
            codeBlock: {
              language: "typescript",
              code: `// entities/order.ts — không import framework nào
export class Order {
  constructor(private items: OrderItem[]) {}
  total() { return this.items.reduce((s, i) => s + i.price, 0); }
  canCheckout() { return this.items.length > 0; }
}

// use-cases/place-order.ts
export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {} // interface!
  async execute(dto: PlaceOrderDTO) {
    const order = new Order(dto.items);
    if (!order.canCheckout()) throw new Error('Empty cart');
    await this.repo.save(order);
  }
}`,
              caption: "Entities không import framework; UseCase nhận interface qua DI",
            },
          },
        },
      ],
    },
    {
      id: "hexagonal",
      title: "Hexagonal (Ports & Adapters)",
      subtitle: "Alistair Cockburn — app core kết nối với world qua ports",
      icon: "Hexagon",
      iconColor: "text-purple-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              'Application core (domain + use cases) không biết gì về bên ngoài. Mọi tương tác đi qua **Port** (interface) và được implement bởi **Adapter** (HTTP adapter, DB adapter, CLI adapter...).\n\n**Primary (Driving):** HTTP Adapter → Port → App Core\n**Secondary (Driven):** App Core → Port → DB Adapter\n\n**Khác với Clean Architecture:** Về bản chất tương tự, hexagonal nhấn mạnh "primary ports" (driven by app) và "secondary ports" (driven by external). Clean Arch phân theo vòng tròn layer.',
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Unit test phải chạy trong <1s, không cần DB"** → App core chỉ biết interface `UserRepository` — inject in-memory fake khi test.',
                '**"Backend phải phục vụ cả REST API (mobile) lẫn gRPC (internal service) lẫn CLI (admin script)"** → 3 primary adapter khác nhau gọi cùng một application core.',
                '**"Hiện dùng SendGrid, có thể sẽ đổi sang AWS SES"** → `EmailPort` interface, swap adapter mà không đụng domain.',
                "**Dự án fintech/healthcare** — domain rule quan trọng hơn infrastructure, cần isolate hoàn toàn.",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào KHÔNG nên dùng",
              items: [
                "CRUD API đơn giản, 1 entry point (HTTP), 1 DB không đổi → Ports và Adapters chỉ thêm indirection không cần thiết",
                "Deadline gấp, team nhỏ không quen pattern → Thời gian setup ban đầu cao. Sai sẽ tệ hơn không dùng",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Core business logic cô lập hoàn toàn", "Dễ swap infrastructure", "Test cực nhanh (no I/O)", "Hỗ trợ nhiều entry points"],
              cons: ["Nhiều interface và adapter → boilerplate", "Learning curve cao", "Overkill cho app CRUD đơn giản"],
            },
          },
        },
      ],
    },
    {
      id: "cqrs",
      title: "CQRS",
      subtitle: "Command Query Responsibility Segregation — tách đọc và ghi",
      icon: "Scale",
      iconColor: "text-teal-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "Tách model xử lý **Command** (ghi/mutation) và **Query** (đọc). Write side và read side có thể dùng DB khác nhau, được optimize cho mục đích của chúng.\n\n**Command Side:** Validation → Business Rule → Write DB (normalized)\n**Query Side:** Direct Read → Read DB (denormalized, optimized)",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Dashboard analytics cần join 8 bảng, nhưng write chỉ là insert đơn giản"** → Tạo read model riêng (materialized view hoặc separate DB) được denormalize sẵn, query cực nhanh.',
                '**"Read 50.000 req/s, write 500 req/s"** → Scale read replicas độc lập, không ảnh hưởng write path.',
                '**"Lịch sử giá sản phẩm — biết giá vào thời điểm T là bao nhiêu"** → Command ghi event, Query side build read model theo thời gian.',
                '**"Tách team — Team A viết write logic, Team B viết query/reporting"** → CQRS tạo boundary tự nhiên.',
                "**Domain phức tạp với DDD** — aggregate chỉ lo consistency, read model lo presentation.",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào KHÔNG nên dùng",
              items: [
                "Blog platform — tạo/sửa/xóa bài viết → Read và write dùng cùng model, không có lý do gì để tách",
                "Sau khi đặt hàng, hiển thị ngay tồn kho mới → Nếu dùng async sync, user sẽ thấy stale data. Cần điều chỉnh UX hoặc dùng sync CQRS",
                'Team chưa quen với eventual consistency → Bug kiểu "tại sao vừa tạo xong không thấy?" rất khó debug',
                "Không có nhu cầu scale read/write khác nhau → Overhead của 2 model, 2 handler cho mỗi operation không đáng",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Scale read và write độc lập", "Read model optimize không ảnh hưởng write", "SRP rõ ràng hơn"],
              cons: ["Phức tạp hơn đáng kể", "Eventual consistency (nếu dùng async sync)", "Duplicate code/model"],
            },
            codeBlock: {
              language: "typescript",
              code: `// Command — không return data, chỉ mutate
class CreateUserCommand {
  constructor(public name: string, public email: string) {}
}
class CreateUserHandler {
  async handle(cmd: CreateUserCommand) {
    await writeDb.save({ name: cmd.name, email: cmd.email });
    eventBus.emit('UserCreated', cmd);
  }
}

// Query — không mutate, return data
class GetUserByIdQuery {
  constructor(public id: string) {}
}
class GetUserByIdHandler {
  async handle(q: GetUserByIdQuery) {
    return readDb.findById(q.id); // denormalized view
  }
}`,
              caption: "Command mutates state và emits event; Query đọc từ read model tối ưu",
            },
          },
        },
      ],
    },
    {
      id: "event-sourcing",
      title: "Event Sourcing",
      subtitle: "Lưu chuỗi events thay vì current state",
      icon: "Scroll",
      iconColor: "text-orange-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Thay vì lưu trạng thái hiện tại, ta lưu tất cả events đã xảy ra. State hiện tại = replay tất cả events từ đầu. Thường dùng cùng CQRS.",
            flowSteps: [{ label: "Event 1: Created" }, { label: "Event 2: Updated" }, { label: "Event 3: Paid" }, { label: "= Current State" }],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Compliance yêu cầu audit log đầy đủ"** → Events là audit log tự nhiên, không cần implement riêng.',
                '**"Ngân hàng cần biết số dư tại bất kỳ thời điểm nào trong quá khứ"** → Replay events đến thời điểm T là ra balance tại T.',
                '**"Khi bug xảy ra trên production, cần reproduce chính xác sequence of actions"** → Load event stream, replay — reproduce hoàn toàn.',
                '**"Cần build nhiều projections khác nhau từ cùng một data"** → Cùng event stream, build read model cho analytics, UI, reporting — độc lập nhau.',
                "**Ví dụ thực tế:** Hệ thống giao dịch ngân hàng, ledger của Stripe, git (mỗi commit là event).",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào KHÔNG nên dùng",
              items: [
                "User profile — lưu tên, email, avatar → Không ai cần biết lịch sử các lần đổi tên. UPDATE là đủ",
                "Tìm kiếm sản phẩm theo tên → Event Sourcing không giúp gì cho query performance",
                "Schema event thay đổi sau khi deploy → Event cũ vẫn tồn tại trong store với schema cũ, phải xử lý migration cực kỳ cẩn thận (upcasting)",
                "Team chưa quen → Concept khó, tooling ít, debugging khác hoàn toàn với CRUD. Đừng apply cho toàn bộ hệ thống",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Audit log miễn phí", "Time travel — state ở bất kỳ thời điểm", "Debug production issues dễ hơn", "Nhiều projections từ cùng event stream"],
              cons: ["Phức tạp cao — cần snapshot cho perf", "Schema evolution khó", "Overkill cho hầu hết use case"],
            },
          },
        },
      ],
    },
  ],
};

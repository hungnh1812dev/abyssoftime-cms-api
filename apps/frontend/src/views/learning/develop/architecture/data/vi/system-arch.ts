import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const systemArchSection: ArchitectureSection = {
  id: "system-arch",
  title: "System Architecture",
  icon: "Layers",
  description: "Kiến trúc hệ thống: Monolithic, Microservices, Event-Driven, Serverless, Layered",
  style: {
    iconColor: "text-blue-500 dark:text-blue-400",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/[0.08]",
    headerBorder: "border-blue-500/20 dark:border-blue-500/30",
    accentBorder: "border-blue-500/50 dark:border-blue-500/30",
    sidebarBg: "bg-blue-500/10",
    sidebarText: "text-blue-700 dark:text-blue-300",
  },
  cards: [
    {
      id: "monolithic",
      title: "Monolithic Architecture",
      subtitle: "Kiến trúc nguyên khối — toàn bộ app trong một codebase/deploy unit",
      icon: "Building2",
      iconColor: "text-blue-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "Toàn bộ UI, business logic, data access layer đóng gói trong một artifact duy nhất (jar, exe, docker image). Mọi module chia sẻ cùng process, memory, database.",
            flowSteps: [{ label: "Client" }, { label: "Single App (UI + Logic + DB)" }, { label: "Database" }],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Ra mắt trong 2 tháng, team 3 người"** → Monolith. Overhead của microservices (CI/CD riêng, service discovery, tracing) tốn thêm 30–50% effort mà không mang lại lợi ích gì ở giai đoạn này.',
                '**"Admin dashboard nội bộ, ~50 user, không cần 99.9% uptime"** → Không đáng đầu tư infra phức tạp.',
                '**"Prototype để demo cho investor tuần sau"** → Cần ship, không cần scale.',
                '**Domain chưa ổn định** — chưa biết sẽ chia bounded context thế nào. Microservices sớm dẫn đến "distributed monolith".',
                "**Ví dụ thực tế:** Basecamp, Stack Overflow (vẫn chạy monolith ở quy mô lớn), Shopify (modular monolith trước khi có SOA).",
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
                "Team A (orders) và Team B (payments) cần deploy độc lập → Monolith buộc hai team phải release cùng nhau, tạo bottleneck và tăng rủi ro",
                "Search feature cần scale 10x vào Black Friday, checkout chỉ 2x → phải scale toàn bộ app chỉ vì 1 module, tốn tiền và tài nguyên",
                "Hệ thống xử lý 100.000 request/s, SLA 99.99% → một điểm failure duy nhất, scale khó",
                "Một module cần dùng Python (ML), một module dùng Go (perf) → lock cùng một tech stack",
                "Dấu hiệu đã đến lúc tách: Deploy mất >30 phút, merge conflict hàng ngày, một bug nhỏ làm cả hệ thống down",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Deploy đơn giản (một lệnh)", "Debug dễ — trace xuyên suốt", "Latency thấp (in-process call)", "Transaction dễ quản lý"],
              cons: [
                "Scale khó — phải scale toàn bộ app",
                "Deployment risk cao — thay đổi nhỏ deploy lại toàn bộ",
                "Tech lock — khó mix tech stack",
                "Team lớn → merge conflict nhiều",
              ],
            },
          },
        },
        {
          label: "Xây dựng",
          content: {
            description: "Cách xây dựng (Layered Monolith)",
            flowSteps: [{ label: "Presentation Layer" }, { label: "Service Layer" }, { label: "Repository Layer" }, { label: "DB" }],
            infoBoxes: [
              {
                type: "tip",
                title: "Tip",
                content:
                  "Ngay từ đầu hãy tách module rõ ràng bằng folder/package. Khi cần, sẽ dễ extract ra microservice hơn. Tránh viết spaghetti code — đây là lý do monolith có tiếng xấu, không phải do kiến trúc.",
              },
            ],
          },
        },
      ],
    },
    {
      id: "microservices",
      title: "Microservices Architecture",
      subtitle: "Hệ thống = nhiều service nhỏ, độc lập, deploy riêng",
      icon: "Microscope",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Chia app thành các service nhỏ, mỗi service:",
            unorderedList: [
              "Chịu trách nhiệm một **bounded context** duy nhất",
              "Có database riêng (database-per-service)",
              "Giao tiếp qua HTTP/REST, gRPC, hoặc message queue",
              "Deploy, scale độc lập với nhau",
            ],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Team Order và Team Payment cần release độc lập, không block nhau"** → Mỗi team own một service, tự deploy khi sẵn sàng.',
                '**"Search cần scale 50x dịp tết, nhưng checkout chỉ 5x"** → Scale từng service riêng, tiết kiệm hơn scale toàn bộ monolith.',
                '**"Module recommendation dùng Python/TensorFlow, core business dùng Java"** → Cho phép polyglot tech stack.',
                '**"Nếu service notification chết, hệ thống vẫn phải nhận order"** → Fault isolation — service failure không cascade.',
                "**Ví dụ thực tế:** Netflix (700+ services), Uber, Amazon (mỗi team own service của mình).",
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
                "MVP, ra mắt trong 3 tháng, team 4 người → Chi phí ops (Kubernetes, service mesh, tracing) cao hơn giá trị nhận được",
                'Domain chưa ổn định — chia service sai → phải gọi cross-service liên tục → "distributed monolith": latency cao, transaction phức tạp, không có benefit nào',
                "Thao tác cần update 3 bảng trong cùng một transaction → Distributed transaction (Saga pattern) phức tạp hơn local transaction hàng chục lần",
                "Team chưa có kinh nghiệm DevOps/Kubernetes → Sẽ chìm trong vận hành hạ tầng thay vì làm product",
                "Dấu hiệu microservices đang sai: Hầu hết request phải call 3+ service → thiết kế domain sai, không phải kiến trúc đúng",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Scale từng service riêng", "Team autonomy — deploy độc lập", "Tech diversity", "Fault isolation — 1 service chết không chết cả hệ thống"],
              cons: [
                "Distributed system complexity (network failure, latency)",
                "Data consistency khó (distributed transaction)",
                "Observability phức tạp (cần tracing, logging tập trung)",
                "Overhead: CI/CD, service discovery, load balancer",
              ],
            },
          },
        },
        {
          label: "Xây dựng",
          content: {
            description: "Cách xây dựng",
            orderedList: [
              "Domain-Driven Design — xác định Bounded Contexts",
              "Mỗi bounded context = 1 service ứng viên",
              "Chọn giao tiếp: REST (đơn giản) hoặc gRPC (perf) hoặc async (event bus)",
              "API Gateway làm entry point duy nhất",
              "Central logging (ELK), distributed tracing (Jaeger/Zipkin)",
              "Service discovery (Consul / Kubernetes DNS)",
            ],
            infoBoxes: [
              {
                type: "note",
                title: "Pattern liên quan",
                content: "API Gateway · Service Mesh · Saga Pattern · Circuit Breaker · Sidecar",
              },
            ],
          },
        },
      ],
    },
    {
      id: "event-driven",
      title: "Event-Driven Architecture",
      subtitle: "Giao tiếp thông qua event — producer/consumer tách biệt",
      icon: "Zap",
      iconColor: "text-purple-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "Các component giao tiếp bằng cách **phát event** (produce) và **lắng nghe event** (consume) thông qua message broker (Kafka, RabbitMQ, SNS/SQS). Producer không biết consumer tồn tại.",
            flowSteps: [{ label: "Producer" }, { label: "Event Bus (Kafka)" }, { label: "Consumer A · Consumer B" }],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Khi đặt hàng xong, cần gửi email + trừ kho + log analytics"** → 3 side effects chạy song song async. Order Service chỉ emit `OrderPlaced` event, 3 consumer xử lý riêng.',
                '**"1000 IoT thiết bị gửi data mỗi giây, cần process realtime"** → Kafka absorb spike, consumer scale theo tốc độ xử lý được.',
                '**"Thêm feature loyalty points khi user mua hàng, không được sửa OrderService"** → Consumer mới subscribe vào event `OrderPaid` mà không động đến producer.',
                '**"Cần audit trail đầy đủ — ai làm gì, lúc nào"** → Events là audit log tự nhiên.',
                "**Ví dụ thực tế:** Uber (trip events), LinkedIn (activity feed), Airbnb (booking workflow).",
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
                "User đăng ký → trả về token ngay lập tức → Cần synchronous response, EDA làm phức tạp flow mà không có lợi",
                "Sau khi thanh toán, cần chắc chắn 100% kho đã được trừ trước khi confirm → EDA cho eventual consistency, không đảm bảo strong consistency",
                "Simple CRUD — blog post, user profile update → Overhead của message broker không đáng",
                'Team chưa quen với async debugging → "Bug ở đâu?" rất khó trả lời khi flow phân tán qua nhiều consumer',
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Decoupled hoàn toàn", "Dễ thêm consumer mới không ảnh hưởng producer", "Tốt cho async processing", "Scalable với message queue"],
              cons: [
                "Khó debug — flow phân tán, không có call stack rõ ràng",
                "Eventual consistency — data không nhất quán ngay lập tức",
                "Message ordering phức tạp",
                "Idempotency phải tự xử lý (at-least-once delivery)",
              ],
            },
          },
        },
        {
          label: "Xây dựng",
          content: {
            description: "Checklist xây dựng",
            unorderedList: [
              "Định nghĩa event schema rõ ràng (Avro/Protobuf/JSON Schema)",
              "Đặt tên event theo quá khứ: `OrderPlaced`, `PaymentFailed`",
              "Consumer phải idempotent (xử lý lại cùng event không gây lỗi)",
              "Dead-letter queue cho event xử lý thất bại",
              "Distributed tracing với correlation ID xuyên suốt",
            ],
          },
        },
      ],
    },
    {
      id: "serverless",
      title: "Serverless Architecture",
      subtitle: "Functions-as-a-Service — không quản lý server, pay-per-use",
      icon: "Cloud",
      iconColor: "text-orange-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "Code chạy dưới dạng function nhỏ, trigger bởi event (HTTP, cron, queue). Cloud provider tự quản lý provisioning, scaling. Bạn chỉ trả tiền khi function thực sự chạy (AWS Lambda, Vercel Functions, Cloudflare Workers).",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"Webhook nhận Stripe payment — chỉ chạy khi có transaction"** → Lambda cost gần như $0, scale tự động khi có đợt tăng đột biến.',
                '**"Resize ảnh khi user upload lên S3"** → Trigger Lambda khi có file mới, xử lý xong là xong — không cần server thường trực.',
                '**"Chạy report hàng đêm lúc 2am, gửi email cho manager"** → Cron trigger, chạy 5 phút, xong. EC2 để làm việc này là lãng phí.',
                '**"Frontend SPA cần vài API endpoint đơn giản, team không biết DevOps"** → Vercel/Netlify Functions, zero config, zero ops.',
                "**Traffic spiky:** Flash sale chạy 1 giờ, peak 10.000 req/s, rồi im. Serverless scale instant, không cần pre-provision.",
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
                "WebSocket — giữ persistent connection với client → Lambda timeout tối đa 15 phút (AWS), không giữ được connection lâu",
                "Train ML model — job chạy 2 tiếng → Quá giới hạn thời gian, cần EC2/container",
                "API latency <10ms, user sẽ thấy mọi call → Cold start của Lambda có thể 100–500ms (Java), không chấp nhận được cho user-facing API",
                "High-frequency steady traffic (10.000+ req/phút liên tục) → Always-on EC2/container rẻ hơn pay-per-invocation",
                "State cần persist giữa requests (session, cache in-memory) → Mỗi Lambda invocation là stateless, phải ra ngoài (Redis, DB) để lưu state",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Zero infrastructure management", "Auto-scale to zero", "Cost-efficient cho low/burst traffic"],
              cons: ["Cold start latency", "Vendor lock-in", "Không phù hợp long-running tasks", "State management khó"],
            },
          },
        },
      ],
    },
    {
      id: "layered",
      title: "Layered (N-Tier) Architecture",
      subtitle: "Presentation → Business → Data — tầng kinh điển nhất",
      icon: "Layers",
      iconColor: "text-yellow-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Phân chia code thành các tầng theo trách nhiệm. Mỗi tầng chỉ được giao tiếp với tầng ngay bên dưới nó.",
            flowSteps: [{ label: "Presentation" }, { label: "Business Logic" }, { label: "Data Access" }, { label: "Database" }],
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào nên dùng",
              items: [
                '**"CRUD app — quản lý sản phẩm, đơn hàng, user"** → Layered là fit tự nhiên. Controller gọi Service gọi Repository — sạch, rõ, mọi người hiểu ngay.',
                '**"Onboard dev mới nhanh, team không có background về architecture phức tạp"** → Convention rõ ràng giúp mọi người biết code nên đặt ở đâu.',
                '**"Internal tool, ~100 user, không có SLA cao"** → Không cần over-engineer, layered là đủ.',
                "**Bắt đầu dự án mới chưa biết sẽ phức tạp đến đâu** → Layered là điểm xuất phát tốt. Sau migrate sang Clean/Hexagonal nếu cần.",
                "**Ví dụ thực tế:** Hầu hết backend Java Spring Boot, .NET MVC, NestJS CRUD apps.",
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
                "Business logic rất phức tạp — pricing engine với 50 rule → Layered dẫn đến God Service, logic khó test độc lập. Dùng Domain Model + Clean Arch",
                "Có thể đổi DB hoặc đổi framework sau → Layered thường leak DB concern vào Service layer. Dùng Hexagonal/Ports & Adapters",
                "Cần unit test nhanh, không phụ thuộc DB → Service thường import Repository trực tiếp, khó mock đúng cách nếu không có interface",
                "Dấu hiệu cần thoát: Service class có 500+ dòng, test chạy chậm vì phải spin up DB, controller biết quá nhiều về DB schema",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Dễ hiểu, convention rõ ràng", "Separation of concerns", "Testable từng layer"],
              cons: ['Dễ biến thành "anemic domain model"', "Logic rò rỉ giữa các tầng", "Khó thay thế DB hoặc UI"],
            },
          },
        },
      ],
    },
  ],
};

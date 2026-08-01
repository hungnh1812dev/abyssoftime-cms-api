import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const solidSection: ArchitectureSection = {
  id: "solid",
  title: "SOLID Principles",
  icon: "Shield",
  description: "5 nguyên tắc thiết kế hướng đối tượng: SRP, OCP, LSP, ISP, DIP",
  style: {
    iconColor: "text-violet-500 dark:text-violet-400",
    headerBg: "bg-violet-500/10 dark:bg-violet-500/[0.08]",
    headerBorder: "border-violet-500/20 dark:border-violet-500/30",
    accentBorder: "border-violet-500/50 dark:border-violet-500/30",
    sidebarBg: "bg-violet-500/10",
    sidebarText: "text-violet-700 dark:text-violet-300",
  },
  cards: [
    {
      id: "srp",
      title: "Single Responsibility Principle",
      subtitle: "Mỗi class chỉ có một lý do để thay đổi",
      icon: "Hash",
      iconColor: "text-blue-800 dark:text-blue-300",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              '"A class should have only one reason to change." — Robert C. Martin.\n\nKhông phải "class chỉ làm 1 việc" mà là "class chỉ thay đổi vì 1 actor (stakeholder) yêu cầu". Ví dụ: `UserService` phình to vì vừa phục vụ business logic, vừa phục vụ report team, vừa phục vụ ops → 3 actor → cần tách.\n\n**Hiểu đúng SRP:** "One reason to change" ≠ "chỉ làm 1 method". Một class phục vụ 1 actor có thể có 10 method liên quan. Sai lầm phổ biến: tách quá nhỏ đến mức mỗi method là 1 class.',
          },
        },
        {
          label: "Khi áp dụng",
          content: {
            useWhen: {
              title: "✅ Khi nào áp dụng SRP",
              items: [
                "**Class thay đổi vì nhiều lý do khác nhau:** `UserService` bị sửa khi: (1) business rule đổi, (2) email template đổi, (3) report format đổi → 3 actor → nên tách.",
                "**Test của class bị phình to:** File test có 500+ dòng, test cho quá nhiều behavior khác nhau → class đang làm quá nhiều thứ.",
                "**Thay đổi 1 feature phải đọc/hiểu toàn bộ class:** Sửa validation email nhưng phải hiểu cả pricing logic → coupling xấu.",
                '**Requirement: "Thêm cách export report mới"** → Nếu export logic nằm trong `OrderService`, phải sửa class đó dù không liên quan đến order business rule.',
              ],
            },
          },
        },
        {
          label: "Không áp dụng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên áp dụng SRP",
              items: [
                "Class nhỏ, ít thay đổi, chỉ 1 người dùng → Tách `UserValidator` riêng khi validation chỉ 3 rule là over-engineering",
                "Tách đến mức mỗi method là 1 class: GetUserByIdService, GetUserByEmailService... → quá granular, navigation code khó",
                "Cohesion bị phá vỡ: Nếu các method luôn gọi nhau, tách ra chỉ tạo thêm coupling giữa các file nhỏ",
              ],
            },
          },
        },
        {
          label: "Patterns",
          content: {
            badges: [
              { label: "Facade", color: "blue" },
              { label: "Command", color: "green" },
              { label: "Strategy", color: "purple" },
              { label: "Chain of Responsibility", color: "orange" },
            ],
            infoBoxes: [
              {
                type: "tip",
                title: "Design Patterns hỗ trợ SRP",
                content:
                  "**Facade** — tập hợp nhiều SRP-class vào 1 entry point\n**Command** — mỗi command = 1 responsibility\n**Strategy** — tách algorithm ra khỏi context class\n**Chain of Responsibility** — mỗi handler 1 concern\n\n**Tip:** Khi tách class, thường cần Factory (ai tạo các class mới?), Facade (ai kết hợp chúng?), hoặc Strategy (các class mới có interface chung).",
              },
            ],
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// ❌ Vi phạm SRP — 3 reasons to change
class UserService {
  createUser(dto: any)    { /* business logic */ }
  sendWelcomeEmail(u: any) { /* email template */ }
  generateReport(u: any)   { /* report format */  }
  saveToDatabase(u: any)   { /* DB schema */       }
}

// ✅ Tuân SRP — mỗi class 1 reason to change
class UserService    { createUser(dto: any) { /* business */ } }
class UserEmailer    { sendWelcome(u: any)  { /* email */    } }
class UserRepository { save(u: any)         { /* DB */       } }
class UserReporter   { generate(u: any)     { /* report */   } }`,
            },
          },
        },
      ],
    },
    {
      id: "ocp",
      title: "Open / Closed Principle",
      subtitle: "Mở rộng được, không sửa đổi code cũ",
      icon: "Hash",
      iconColor: "text-green-800 dark:text-green-300",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              '"Open for extension, closed for modification." Thêm behavior mới không được sửa code đang hoạt động. Đạt được qua **abstraction + polymorphism**: định nghĩa interface, mở rộng bằng cách thêm class mới implement interface đó.\n\n**Hiểu đúng OCP:** OCP không có nghĩa là không bao giờ sửa code. Khi phát hiện bug hoặc requirement thực sự thay đổi core behavior, sửa code là đúng. OCP áp dụng cho điểm mở rộng đã dự đoán trước được.',
          },
        },
        {
          label: "Khi áp dụng",
          content: {
            useWhen: {
              title: "✅ Khi nào áp dụng OCP",
              items: [
                '**"Thêm payment method mới (ZaloPay) không được đụng vào checkout flow"** → Checkout gọi `PaymentStrategy.pay()`, thêm `ZaloPayStrategy` mà không sửa `CheckoutService`.',
                '**"Thêm discount type mới (flash sale, loyalty) không sửa code tính giá"** → `DiscountCalculator` nhận list of `DiscountRule` — thêm rule mới = thêm class mới.',
                "**Dấu hiệu cần OCP:** Code có `if (type === 'A') ... else if (type === 'B') ...` và bạn thường xuyên phải thêm branch mới.",
                "**Plugin/extension system:** Cho phép bên ngoài mở rộng mà không cần access source code (VS Code extensions, webpack plugins).",
              ],
            },
          },
        },
        {
          label: "Không áp dụng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên áp dụng OCP",
              items: [
                "Requirement chưa ổn định → Abstract sớm khi chưa biết sẽ có bao nhiêu variant → abstract sai sẽ tệ hơn if-else. Chờ lần thứ 2–3 mới abstract (Rule of Three)",
                "Core behavior thực sự cần thay đổi → OCP không nghĩa là không bao giờ sửa code",
                "Over-abstracting simple switch: if (color === 'red') return '#f00' — không cần Strategy pattern cho 3 màu cố định",
              ],
            },
          },
        },
        {
          label: "Patterns",
          content: {
            badges: [
              { label: "Strategy", color: "purple" },
              { label: "Decorator", color: "blue" },
              { label: "Factory Method", color: "green" },
              { label: "Observer", color: "orange" },
              { label: "Chain of Responsibility", color: "teal" },
            ],
            infoBoxes: [
              {
                type: "tip",
                title: "Design Patterns implement OCP",
                content:
                  "**Strategy** — thêm algorithm mới không sửa context\n**Decorator** — thêm behavior không sửa class gốc\n**Factory Method** — thêm product type mới không sửa creator\n**Observer** — thêm subscriber mới không sửa subject\n**Chain of Responsibility** — thêm handler không sửa chain",
              },
            ],
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// ❌ Vi phạm OCP — thêm type mới phải sửa class này
class ShippingCost {
  calculate(type: string, weight: number) {
    if (type === 'standard') return weight * 5;
    if (type === 'express')  return weight * 10;
    // cần thêm 'drone'? → sửa file này
  }
}

// ✅ Tuân OCP — thêm type = thêm class mới
interface ShippingStrategy {
  calculate(weight: number): number;
}
class StandardShipping implements ShippingStrategy {
  calculate(w: number) { return w * 5; }
}
class ExpressShipping implements ShippingStrategy {
  calculate(w: number) { return w * 10; }
}
// Thêm DroneShipping — không sửa code cũ
class DroneShipping implements ShippingStrategy {
  calculate(w: number) { return w * 2 + 20; }
}`,
            },
          },
        },
      ],
    },
    {
      id: "lsp",
      title: "Liskov Substitution Principle",
      subtitle: "Subclass phải thay thế được superclass mà không làm hỏng chương trình",
      icon: "Hash",
      iconColor: "text-purple-800 dark:text-purple-300",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              '"Objects of a subtype must be substitutable for objects of their supertype." — Barbara Liskov.\n\nNếu bạn dùng `Bird bird = new Penguin()`, mọi thao tác hợp lệ trên `Bird` phải hoạt động đúng với `Penguin`. LSP vi phạm khi subclass ném exception hoặc làm ngơ method kế thừa.\n\n**Classic violation: Square extends Rectangle** — `Rectangle.setWidth(5)` không thay đổi height. Nhưng `Square.setWidth(5)` phải đặt cả height = 5. Code dùng Rectangle sẽ bị hỏng khi nhận Square — vi phạm LSP.',
          },
        },
        {
          label: "Khi áp dụng",
          content: {
            useWhen: {
              title: "✅ LSP đúng trông như thế nào",
              items: [
                "Subclass chỉ strengthen postconditions và weaken preconditions.",
                "Caller không cần `instanceof` check — dùng polymorphism một cách tự nhiên.",
                "Unit test của superclass pass với mọi subclass (Liskov test).",
              ],
            },
          },
        },
        {
          label: "Không áp dụng",
          content: {
            dontUseWhen: {
              title: "❌ Dấu hiệu vi phạm LSP",
              items: [
                "Subclass throw NotImplementedException: ReadOnlyList extends List mà add() ném exception — caller dùng List không thể biết nó sẽ fail",
                "Code kiểm tra type: if (bird instanceof Penguin) { skip fly } — đây là dấu hiệu rõ ràng hierarchy sai",
                "Subclass override method với behavior khác hoàn toàn precondition/postcondition",
                "Cách fix: Tách interface (ISP). FlyingBird và SwimmingBird thay vì Bird.fly() cho cả chim cánh cụt",
              ],
            },
          },
        },
        {
          label: "Patterns",
          content: {
            badges: [
              { label: "Template Method", color: "blue" },
              { label: "Composite", color: "green" },
              { label: "Strategy", color: "purple" },
            ],
            infoBoxes: [
              {
                type: "tip",
                title: "Design Patterns liên quan",
                content:
                  "**Template Method** — subclass override steps nhưng không phá vỡ flow của base\n**Composite** — Leaf và Composite cùng implement Component interface, thay thế được nhau từ góc nhìn client\n**Strategy** — tất cả concrete strategy thay thế được nhau qua interface\n\n**Tip:** Viết test suite cho base class, chạy với mọi subclass. Nếu test fail với subclass nào → vi phạm LSP.",
              },
            ],
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// ❌ Vi phạm LSP — Penguin không fly được
class Bird    { fly()  { console.log('flying'); } }
class Penguin extends Bird {
  fly() { throw new Error("Penguins can't fly!"); }
}
// Code bị hỏng khi nhận Penguin thay Bird
function makeBirdFly(bird: Bird) { bird.fly(); } // CRASH!

// ✅ Fix bằng ISP — tách interface
interface FlyingBird   { fly(): void;  }
interface SwimmingBird { swim(): void; }
class Eagle   implements FlyingBird               { fly()  {} }
class Penguin implements SwimmingBird             { swim() {} }
class Duck    implements FlyingBird, SwimmingBird { fly(){}; swim(){}; }`,
            },
          },
        },
      ],
    },
    {
      id: "isp",
      title: "Interface Segregation Principle",
      subtitle: "Client không bị buộc implement method mà họ không dùng",
      icon: "Hash",
      iconColor: "text-amber-800 dark:text-amber-300",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              '"Clients should not be forced to depend on interfaces they do not use." — Robert C. Martin.\n\nThay vì một fat interface với 10 method, tách thành nhiều interface nhỏ. Client chỉ implement interface phù hợp với nhu cầu của mình.\n\n**ISP trong thực tế:** ISP không chỉ áp dụng cho interface/abstract class. Áp dụng cho cả function signature, props trong React component (đừng truyền object 20 fields khi chỉ cần 2).',
          },
        },
        {
          label: "Khi áp dụng",
          content: {
            useWhen: {
              title: "✅ Khi nào áp dụng ISP",
              items: [
                "**Dấu hiệu rõ nhất:** Class implement interface phải để `throw new Error('not implemented')` hoặc return stub cho method không dùng.",
                '**"ReadOnlyRepository chỉ cần findById, findAll — không cần save, delete"** → Tách `ReadRepository` và `WriteRepository`.',
                '**"Worker thực hiện task nhưng không restart được; Manager vừa thực hiện vừa restart được"** → `IWorkable` và `IRestartable` riêng.',
                "**Testing dễ hơn:** Mock interface nhỏ nhanh hơn mock fat interface nhiều method.",
              ],
            },
          },
        },
        {
          label: "Không áp dụng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên áp dụng ISP",
              items: [
                "Interface đã nhỏ và cohesive — tách thêm chỉ tạo quá nhiều interface fragmented, khó tìm, khó hiểu",
                'Tất cả implementer đều dùng hết tất cả method — không có lý do tách. ISP giải quyết vấn đề "forced implementation", không phải "interface size"',
                "Interface chỉ có 2–3 method — overhead của việc tách không đáng",
              ],
            },
          },
        },
        {
          label: "Patterns",
          content: {
            badges: [
              { label: "Adapter", color: "blue" },
              { label: "Facade", color: "green" },
              { label: "Proxy", color: "purple" },
              { label: "CQRS", color: "orange" },
            ],
            infoBoxes: [
              {
                type: "tip",
                title: "Design Patterns liên quan",
                content:
                  "**Adapter** — expose chỉ interface client cần, ẩn phần còn lại\n**Facade** — interface đơn giản hóa che đi fat subsystem interface\n**Proxy** — có thể implement subset interface\n**CQRS** — tách ReadRepository và WriteRepository là ISP điển hình",
              },
            ],
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// ❌ Fat interface — ReadOnlyRepo bị forced implement save/delete
interface UserRepository {
  findById(id: string): User;
  findAll(): User[];
  save(u: User): void;
  delete(id: string): void;
}
class ReadOnlyUserRepo implements UserRepository {
  save()   { throw new Error('not supported'); } // 😬
  delete() { throw new Error('not supported'); } // 😬
}

// ✅ ISP — tách thành interface nhỏ
interface UserReader { findById(id: string): User; findAll(): User[]; }
interface UserWriter { save(u: User): void; delete(id: string): void; }
// Combine khi cần full access
interface UserRepository extends UserReader, UserWriter {}

class ReadOnlyUserRepo implements UserReader {
  findById(id: string) { /* ... */ return {} as User; }
  findAll()            { /* ... */ return []; }
} // clean — không có method thừa`,
            },
          },
        },
      ],
    },
    {
      id: "dip",
      title: "Dependency Inversion Principle",
      subtitle: "Phụ thuộc vào abstraction, không phụ thuộc vào concretion",
      icon: "Hash",
      iconColor: "text-red-800 dark:text-red-300",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              "Hai rules:\n1. High-level modules không phụ thuộc low-level modules — cả hai phụ thuộc **abstractions**.\n2. Abstractions không phụ thuộc details — details phụ thuộc abstractions.\n\nThực hiện qua **Dependency Injection**: không `new` dependency trong constructor, inject từ ngoài vào.\n\n**DI ≠ DIP:** Dependency Injection là *technique* (cách truyền dependency vào). DIP là *principle* (phụ thuộc vào interface). DI giúp đạt DIP nhưng DIP không yêu cầu DI framework.",
          },
        },
        {
          label: "Khi áp dụng",
          content: {
            useWhen: {
              title: "✅ Khi nào áp dụng DIP",
              items: [
                '**"Unit test không được hit real database"** → `UserService` nhận `UserRepository` interface qua constructor → inject `InMemoryUserRepository` khi test, `PostgresUserRepository` khi production.',
                '**"Đổi email provider từ SendGrid sang AWS SES"** → `NotificationService` phụ thuộc `EmailProvider` interface → swap implementation không sửa `NotificationService`.',
                "**Dấu hiệu cần DIP:** Class có `new HttpClient()`, `new MySQLConnection()`, `new SendGridMailer()` bên trong constructor → tightly coupled, không test được.",
              ],
            },
          },
        },
        {
          label: "Không áp dụng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên áp dụng DIP",
              items: [
                "Dependency là stable low-level utility: new Date(), Math.random(), JSON.parse() — những thứ này không đổi, không cần abstract",
                "Over-abstracting everything: Tạo IUserService interface khi chỉ có 1 implementation và không bao giờ thay đổi → ceremony không cần thiết",
                "Value object, entity đơn giản: new Money(100, 'USD') không cần inject qua interface",
                "Script/CLI one-off: Không có test, không có swap, inject framework là overhead",
              ],
            },
          },
        },
        {
          label: "Patterns",
          content: {
            badges: [
              { label: "Clean Architecture", color: "blue" },
              { label: "Hexagonal", color: "green" },
              { label: "Abstract Factory", color: "purple" },
              { label: "Strategy", color: "orange" },
              { label: "Proxy / Decorator", color: "teal" },
            ],
            infoBoxes: [
              {
                type: "tip",
                title: "Design Patterns implement DIP",
                content:
                  "**Clean Architecture** — toàn bộ dependency trỏ vào domain interface\n**Hexagonal** — ports là abstractions, adapters là details\n**Abstract Factory** — inject factory interface, không biết concrete class\n**Strategy** — inject strategy interface\n**Proxy / Decorator** — wrap qua interface, không biết concrete implementation\n\n**Tip:** Khi toàn bộ high-level module phụ thuộc vào interface → bạn đang tự nhiên tiến đến Clean Architecture / Hexagonal Architecture.",
              },
            ],
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// ❌ Vi phạm DIP — UserService biết về PostgreSQL
class UserService {
  private db = new PostgresUserRepository(); // tightly coupled!
  async getUser(id: string) {
    return this.db.findById(id); // cannot mock in tests
  }
}

// ✅ Tuân DIP — phụ thuộc interface, inject từ ngoài
interface UserRepository { findById(id: string): Promise<User>; }

class UserService {
  constructor(private repo: UserRepository) {} // abstraction!
  async getUser(id: string) { return this.repo.findById(id); }
}

// Production
const svc = new UserService(new PostgresUserRepository());
// Test — inject fake, không cần real DB
const svcTest = new UserService(new InMemoryUserRepository());`,
            },
          },
        },
      ],
    },
  ],
};

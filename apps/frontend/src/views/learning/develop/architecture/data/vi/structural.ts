import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const structuralSection: ArchitectureSection = {
  id: "structural",
  title: "Structural Patterns",
  icon: "Puzzle",
  description: "Nhóm cấu trúc — cách ghép class/object: Adapter, Decorator, Facade, Proxy, Composite, Bridge",
  style: {
    iconColor: "text-teal-500 dark:text-teal-400",
    headerBg: "bg-teal-500/10 dark:bg-teal-500/[0.08]",
    headerBorder: "border-teal-500/20 dark:border-teal-500/30",
    accentBorder: "border-teal-500/50 dark:border-teal-500/30",
    sidebarBg: "bg-teal-500/10",
    sidebarText: "text-teal-700 dark:text-teal-300",
  },
  cards: [
    {
      id: "adapter",
      title: "Adapter",
      subtitle: "Chuyển đổi interface của class thành interface khác client mong đợi",
      icon: "Plug",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description: "Cho phép hai interface *không tương thích* làm việc cùng nhau. Wrap class cũ / third-party trong adapter, expose interface mới.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Integrate Stripe SDK — API của Stripe khác với interface `PaymentGateway` trong code"** → `StripeAdapter implements PaymentGateway`, code core không biết Stripe tồn tại.',
                '**"Migrate từ legacy `OldAuthService` sang `NewAuthService` mà không break caller"** → Adapter wrap `NewAuthService`, expose interface giống `OldAuthService` — migrate dần dần.',
                '**"Test phải chạy offline — không gọi real payment API"** → `MockPaymentAdapter implements PaymentGateway` — inject vào test.',
                "**Dấu hiệu cần Adapter:** Code phải gọi `thirdPartyLib.doSomethingWeird(x, y, z)` ở nhiều nơi — wrap một lần trong adapter, caller dùng API đẹp hơn.",
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
                "Interface gần như giống nhau → Thêm adapter chỉ là thêm một layer không cần thiết",
                "Khi có thể sửa trực tiếp — nếu bạn own cả hai phía, refactor interface trực tiếp tốt hơn",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Tích hợp incompatible interface không sửa code gốc", "Dễ test (mock adapter)", "Tuân DIP", "Migration dần dần"],
              cons: ["Thêm indirection layer", "Có thể bỏ sót feature của target nếu adapter không đầy đủ", "Double maintenance nếu adapter phức tạp"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// Third-party có API lạ
class LegacyPayment {
  doPayment(amount: number, currency: string) { /* ... */ }
}
// Interface ta muốn dùng
interface PaymentGateway {
  pay(dto: { amount: number; currency: string }): void;
}
// Adapter
class LegacyAdapter implements PaymentGateway {
  constructor(private legacy = new LegacyPayment()) {}
  pay({ amount, currency }) {
    this.legacy.doPayment(amount, currency);
  }
}

// Core code chỉ biết PaymentGateway interface
class CheckoutService {
  constructor(private gateway: PaymentGateway) {}
  checkout(order: Order) { this.gateway.pay({ amount: order.total, currency: 'VND' }); }
}`,
              caption: "Adapter wrap LegacyPayment để expose interface PaymentGateway sạch",
            },
          },
        },
      ],
    },
    {
      id: "decorator",
      title: "Decorator",
      subtitle: "Thêm behavior vào object tại runtime mà không thay đổi class",
      icon: "Ribbon",
      iconColor: "text-yellow-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Wrap object trong một decorator object, thêm behavior trước/sau khi delegate đến object gốc. Thay thế subclassing linh hoạt hơn.\n\n**Ví dụ thực tế:** Express middleware, Java I/O streams (`BufferedReader(new FileReader())`), Python `@decorator`.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Thêm logging cho tất cả method của `UserRepository` mà không sửa class gốc"** → `LoggingUserRepository` wrap `UserRepository`, log trước/sau mỗi call.',
                '**"Cache kết quả repository — nếu có cache trả về ngay, không hit DB"** → `CachingUserRepository` decorator, transparent với caller.',
                '**"Stack nhiều behavior: cache → retry → logging → real call"** → Decorator stack: `new LoggingRepo(new RetryRepo(new CachingRepo(new RealRepo())))`.',
                "**Khi không thể subclass** (sealed class, final class, third-party không own) — decorator dùng composition thay inheritance.",
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
                "Stack quá nhiều decorator → Khó debug khi lỗi — phải trace qua nhiều wrapper để tìm nguyên nhân",
                "Khi chỉ cần thêm 1 behavior đơn giản và không cần reuse → Sửa trực tiếp class gốc là đủ",
                "Khi thứ tự decorator quan trọng nhưng không được document rõ → Bug tinh vi khi swap thứ tự (cache trước hay auth trước?)",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Composition thay inheritance", "Thêm/bỏ behavior linh hoạt tại runtime", "Stack nhiều decorator", "Tuân OCP"],
              cons: ["Nhiều wrapper object nhỏ", "Debug khó qua nhiều layer", "Thứ tự decorator phải được quản lý cẩn thận"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface Logger { log(msg: string): void; }

class ConsoleLogger implements Logger {
  log(msg: string) { console.log(msg); }
}
class TimestampDecorator implements Logger {
  constructor(private inner: Logger) {}
  log(msg: string) {
    this.inner.log(\`[\${new Date().toISOString()}] \${msg}\`);
  }
}
class PrefixDecorator implements Logger {
  constructor(private inner: Logger, private prefix: string) {}
  log(msg: string) { this.inner.log(\`[\${this.prefix}] \${msg}\`); }
}

// Stack decorators
const logger = new PrefixDecorator(
  new TimestampDecorator(new ConsoleLogger()),
  'APP'
);
logger.log('Server started'); // [APP] [2024-01-01T...] Server started`,
              caption: "Stack decorators — mỗi layer thêm behavior, delegate xuống inner",
            },
          },
        },
      ],
    },
    {
      id: "facade",
      title: "Facade",
      subtitle: "Cung cấp interface đơn giản cho subsystem phức tạp",
      icon: "AppWindow",
      iconColor: "text-blue-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Tạo một class ở phía trên, delegate xuống các subsystem phức tạp. Client chỉ cần biết facade, không cần biết internals.\n\n**Service layer trong Layered Architecture chính là Facade** — Controller gọi service, không gọi trực tiếp repository hay domain object.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Đặt hàng cần: reserve tồn kho + charge payment + gửi email confirm + tạo shipment"** → `OrderFacade.placeOrder()` orchestrate 4 subsystem, caller chỉ gọi 1 method.',
                '**"Wrap AWS SDK phức tạp — developer chỉ cần `storage.upload(file)`"** → `S3Facade` ẩn toàn bộ S3 config, presigned URL, multipart upload.',
                '**"Expose API đơn giản cho third-party tích hợp"** → Facade là "public API", che đi internal complexity.',
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
                'Facade trở thành "God Object" — biết quá nhiều về quá nhiều subsystem → vi phạm SRP, khó test',
                "Khi caller cần fine-grained control — nếu caller luôn cần override một phần behavior của facade, abstraction bị leak",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Đơn giản hóa interface phức tạp", "Giảm dependency của client vào subsystem", "Dễ dùng", "Entry point rõ ràng"],
              cons: ["Có thể trở thành God Object", "Che giấu quá nhiều — caller mất control chi tiết", "Thêm layer khi subsystem đã đơn giản"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// Subsystems phức tạp
class InventoryService { async reserve(items: Item[]) { /* ... */ } }
class PaymentService   { async charge(amount: number) { /* ... */ } }
class EmailService     { async sendConfirmation(userId: string) { /* ... */ } }
class ShipmentService  { async create(order: Order) { /* ... */ } }

// Facade — caller chỉ cần biết placeOrder()
class OrderFacade {
  constructor(
    private inventory: InventoryService,
    private payment: PaymentService,
    private email: EmailService,
    private shipment: ShipmentService,
  ) {}

  async placeOrder(order: Order) {
    await this.inventory.reserve(order.items);
    await this.payment.charge(order.total);
    await this.shipment.create(order);
    await this.email.sendConfirmation(order.userId);
  }
}`,
              caption: "Facade orchestrate 4 subsystems — caller gọi 1 method duy nhất",
            },
          },
        },
      ],
    },
    {
      id: "proxy",
      title: "Proxy",
      subtitle: "Placeholder điều khiển access đến object khác",
      icon: "ShieldCheck",
      iconColor: "text-teal-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Cung cấp object thay thế / placeholder để kiểm soát access đến object gốc. Có thể add caching, lazy loading, access control, logging...\n\n**Các loại Proxy:**\n- **Caching Proxy** — cache kết quả, tránh gọi lại\n- **Protection Proxy** — kiểm tra permission trước khi delegate\n- **Virtual Proxy** — lazy-load object expensive\n- **Remote Proxy** (RPC stub) — ẩn network call",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"DB query `getUserById` bị gọi 1000 lần/giây, phần lớn cùng ID"** → Caching Proxy: cache kết quả trong Redis — DB chỉ được gọi khi cache miss.',
                '**"Load ảnh kích thước lớn — chỉ load khi user scroll đến"** → Virtual Proxy: hiển thị placeholder ngay, lazy-load ảnh thực khi cần.',
                '**"Chỉ admin mới được gọi `deleteUser()`"** → Protection Proxy: check permission trước khi delegate, không cần sửa `UserService` gốc.',
                '**"Gọi service trên server khác như local method"** → Remote Proxy (RPC stub) ẩn network call.',
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
                "Khi Decorator đủ dùng — Proxy thường kiểm soát lifecycle/access của object gốc; Decorator thêm behavior. Nếu chỉ cần thêm behavior, dùng Decorator",
                "Caching sai chỗ — Proxy cache data stale mà không có invalidation strategy gây bug khó tìm",
              ],
            },
          },
        },
        {
          label: "Proxy vs Decorator",
          content: {
            description:
              "**Proxy:** Kiểm soát access đến object gốc, có thể quản lý lifecycle (tạo, hủy). Client thường không biết đang dùng proxy.\n\n**Decorator:** Thêm behavior vào object. Client thường biết và chủ động wrap decorator.\n\n**Rule of thumb:** Dùng Proxy khi cần kiểm soát access/lifecycle; Dùng Decorator khi cần thêm feature.",
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// Caching Proxy
class CachingUserRepository implements UserRepository {
  private cache = new Map<string, User>();
  constructor(private real: UserRepository) {}

  async findById(id: string) {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const user = await this.real.findById(id);
    this.cache.set(id, user);
    return user;
  }
}

// Protection Proxy
class AdminUserRepository implements UserRepository {
  constructor(private real: UserRepository, private currentUser: User) {}

  async delete(id: string) {
    if (this.currentUser.role !== 'admin')
      throw new Error('Forbidden');
    return this.real.delete(id);
  }
}`,
              caption: "Caching Proxy giảm DB load; Protection Proxy enforce access control",
            },
          },
        },
      ],
    },
    {
      id: "composite",
      title: "Composite",
      subtitle: "Xử lý individual object và group object như nhau",
      icon: "TreePine",
      iconColor: "text-purple-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Tổ chức object theo cây phân cấp (tree structure). Cả leaf node và composite node đều implement cùng interface — client không phân biệt.\n\n**Dấu hiệu cần Composite:** Bạn đang viết code kiểu `if (item instanceof Bundle) { for child... } else { item.price }` ở nhiều nơi.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"File system — tính tổng size của folder bao gồm tất cả subfolder và file"** → `folder.size()` gọi đệ quy `child.size()` — không quan tâm child là file hay folder.',
                '**"Sidebar menu có item lồng submenu, submenu lại có submenu"** → Cùng `MenuItem.render()` cho cả leaf (link) và composite (dropdown).',
                '**"Tính tổng giá order bao gồm bundle (gói nhiều sản phẩm)"** → `OrderItem.price()` — leaf trả về giá đơn, bundle gọi đệ quy.',
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
                "Cấu trúc chỉ có 1 level (flat list) → Composite thêm complexity không cần thiết",
                "Leaf và Composite có interface quá khác nhau → Forcing cùng interface làm một trong hai phải implement method không liên quan (vi phạm ISP)",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Client code đơn giản — xử lý đồng nhất leaf và composite", "Dễ thêm node type mới", "Đệ quy tự nhiên"],
              cons: ["Khó restrict — không thể ngăn ai đó thêm leaf vào nơi chỉ nhận composite", "Interface chung có thể quá rộng"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface Component { render(): string; size(): number; }

class Leaf implements Component {
  constructor(private name: string, private bytes: number) {}
  render() { return this.name; }
  size()   { return this.bytes; }
}
class Folder implements Component {
  private children: Component[] = [];
  constructor(private name: string) {}
  add(c: Component) { this.children.push(c); }
  render() { return \`\${this.name}/\\n\` + this.children.map(c => '  ' + c.render()).join('\\n'); }
  size()   { return this.children.reduce((s, c) => s + c.size(), 0); } // recursive!
}

const root = new Folder('src');
root.add(new Leaf('index.ts', 1024));
const components = new Folder('components');
components.add(new Leaf('Button.tsx', 512));
root.add(components);
console.log(root.size()); // 1024 + 512 = 1536`,
              caption: "Folder.size() đệ quy qua children — client không cân biết Leaf hay Folder",
            },
          },
        },
      ],
    },
    {
      id: "bridge",
      title: "Bridge",
      subtitle: "Tách abstraction khỏi implementation — scale 2 chiều độc lập",
      icon: "Landmark",
      iconColor: "text-red-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Khi có 2 dimension cần mở rộng (vd: hình dạng × màu sắc), thay vì subclass tổ hợp (N×M class), dùng composition. Abstraction hold reference đến Implementation.\n\n**Dấu hiệu cần Bridge:** Bạn thấy class hierarchy đang nổ thành N×M classes khi thêm variant mới.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"UI Button có 3 loại (Primary, Secondary, Ghost) × 2 platform (Web, Mobile) → 6 class"** — và sắp thêm Dark mode nữa → 12 class. Bridge: 3 Button abstraction × 2 Renderer implementation = 5 class.',
                '**"Notification có 2 loại nội dung (Text, Rich) × 3 channel (Email, SMS, Push)"** → Bridge tách content type khỏi delivery channel.',
                "**Cần swap implementation tại runtime** — ví dụ đổi renderer từ Canvas sang SVG mà không đổi shape logic.",
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
                "Chỉ có 1 dimension biến thiên → Strategy hoặc simple inheritance là đủ",
                "Apply sớm khi chưa thấy N×M explosion → YAGNI — đừng abstract trước khi thấy pain thực sự",
              ],
            },
          },
        },
        {
          label: "Bridge vs Adapter",
          content: {
            description:
              '**Adapter:** Fix incompatible interfaces sau khi thiết kế xong — "make it work".\n\n**Bridge:** Thiết kế từ đầu để tách 2 dimension — "make it extensible".\n\n**Rule of thumb:** Adapter là reactive (fix existing code); Bridge là proactive (design for extension).',
          },
        },
      ],
    },
  ],
};

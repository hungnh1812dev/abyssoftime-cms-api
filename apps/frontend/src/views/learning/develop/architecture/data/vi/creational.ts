import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const creationalSection: ArchitectureSection = {
  id: "creational",
  title: "Creational Patterns",
  icon: "Package",
  description: "Nhóm khởi tạo đối tượng: Singleton, Factory Method, Abstract Factory, Builder, Prototype",
  style: {
    iconColor: "text-orange-500 dark:text-orange-400",
    headerBg: "bg-orange-500/10 dark:bg-orange-500/[0.08]",
    headerBorder: "border-orange-500/20 dark:border-orange-500/30",
    accentBorder: "border-orange-500/50 dark:border-orange-500/30",
    sidebarBg: "bg-orange-500/10",
    sidebarText: "text-orange-700 dark:text-orange-300",
  },
  cards: [
    {
      id: "singleton",
      title: "Singleton",
      subtitle: "Đảm bảo chỉ có một instance duy nhất",
      icon: "Hash",
      iconColor: "text-red-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description:
              'Chỉ tạo một instance của class. Cung cấp điểm truy cập global.\n\n**⚠️ Anti-pattern cảnh báo:** Singleton là "code smell" trong nhiều trường hợp — prefer dependency injection container thay vì global singleton.',
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào dùng Singleton",
              items: [
                '**"Toàn bộ app dùng chung một DB connection pool"** → Tạo nhiều pool sẽ vượt quá connection limit của DB. Singleton đảm bảo chỉ 1 pool.',
                '**"Config (API keys, feature flags) load 1 lần từ env, dùng khắp nơi"** → Singleton config object, lazy-init khi first access.',
                '**"Logger cần ghi vào cùng một file/stream"** → Nhiều logger instance ghi đồng thời gây race condition.',
                '**Ví dụ thực tế:** `PrismaClient` trong Next.js (cần singleton để tránh "too many connections" khi hot reload), Redux store, EventBus.',
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên dùng Singleton",
              items: [
                'Mọi class đều làm Singleton "cho tiện" → Global state làm test khó (state leak giữa test cases), coupling cao',
                "Mỗi user session có config riêng → Singleton là global, không scope được per-user. Dùng dependency injection",
                "Multithreading mà không xử lý lock → Race condition khi khởi tạo nếu 2 thread cùng check instance == null",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Controlled access to single instance", "Lazy initialization", "Tiết kiệm tài nguyên"],
              cons: ["Global state khó test", "Thread safety phải tự xử lý", "Vi phạm SRP nếu lạm dụng", "Dependency hidden (không rõ ai dùng)"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `class Database {
  private static instance: Database;
  private constructor() {} // prevent new

  static getInstance() {
    if (!Database.instance)
      Database.instance = new Database();
    return Database.instance;
  }
}

// Next.js pattern — tránh "too many connections"
declare global { var prisma: PrismaClient | undefined; }
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;`,
              caption: "Singleton với private constructor; Next.js pattern cho PrismaClient",
            },
          },
        },
      ],
    },
    {
      id: "factory-method",
      title: "Factory Method",
      subtitle: "Để subclass quyết định class nào sẽ được tạo",
      icon: "Factory",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Định nghĩa interface để tạo object, nhưng để subclass quyết định class nào được instantiate. Ẩn implementation detail của việc tạo object.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào dùng Factory Method",
              items: [
                '**"Hệ thống notification — email, SMS, push — thêm channel mới không sửa code cũ"** → Factory Method tạo channel đúng loại, caller chỉ biết interface `Channel.send()`.',
                '**"Tùy theo env (dev/staging/prod) tạo object khác nhau"** → `createRepository()` trả về `InMemoryRepo` (test) hoặc `PostgresRepo` (prod).',
                "**Khi loại object cần tạo phụ thuộc vào input/config lúc runtime**, không biết trước lúc compile time.",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên dùng Factory Method",
              items: [
                "Chỉ có một loại object duy nhất → Factory chỉ thêm indirection, dùng new trực tiếp là đủ",
                "Khi Abstract Factory phù hợp hơn — cần tạo nhiều object liên quan cùng lúc (family), không chỉ một",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Tuân OCP — thêm product type mới không sửa creator", "Ẩn construction logic", "Dễ test (inject factory)"],
              cons: ["Thêm abstract layer và subclass", "Phức tạp hơn new trực tiếp", "Client vẫn cần biết concrete creator nào dùng"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// Abstract creator
abstract class Notifier {
  abstract createChannel(): Channel; // factory method
  send(msg: string) {
    const ch = this.createChannel();
    ch.deliver(msg);
  }
}
class EmailNotifier extends Notifier {
  createChannel() { return new EmailChannel(); }
}
class SMSNotifier extends Notifier {
  createChannel() { return new SMSChannel(); }
}
// Thêm PushNotifier — không sửa Notifier base`,
              caption: "Abstract creator định nghĩa factory method; subclass quyết định concrete class",
            },
          },
        },
      ],
    },
    {
      id: "abstract-factory",
      title: "Abstract Factory",
      subtitle: "Tạo family of related objects mà không chỉ định class cụ thể",
      icon: "Building",
      iconColor: "text-blue-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Cung cấp interface để tạo **nhóm** các object liên quan đến nhau mà không cần biết class cụ thể. Đảm bảo các object được tạo ra *compatible* với nhau.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào dùng Abstract Factory",
              items: [
                '**"Component library hỗ trợ dark/light theme — Button, Input, Modal phải đồng màu với nhau"** → `DarkThemeFactory.createButton()` và `DarkThemeFactory.createInput()` đều trả về dark variant, không bao giờ mix.',
                '**"App chạy trên Windows và Mac, mỗi platform có UI native riêng"** → `WindowsFactory` tạo Windows-style controls, `MacFactory` tạo Mac-style — caller không biết platform.',
                '**"Test dùng in-memory DB, production dùng PostgreSQL — cần swap toàn bộ data access layer"** → `InMemoryStorageFactory` vs `PostgresStorageFactory`.',
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên dùng Abstract Factory",
              items: [
                "Chỉ cần tạo một loại object → Factory Method đủ, Abstract Factory over-kill",
                'Family chỉ có 1 member → Không có lợi ích "đảm bảo compatibility" khi chỉ có 1 component',
                "Products trong factory thay đổi thường xuyên → Thêm product mới phải sửa toàn bộ factory interface — vi phạm OCP",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Đảm bảo compatibility trong cùng family", "Tuân DIP — client phụ thuộc vào factory interface", "Dễ swap cả family"],
              cons: ["Khó thêm product type mới vào factory", "Nhiều interface và class", "Overkill nếu chỉ cần 1 loại object"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface UIFactory {
  createButton(): Button;
  createInput(): Input;
}
class DarkThemeFactory implements UIFactory {
  createButton() { return new DarkButton(); }
  createInput()  { return new DarkInput();  }
}
class LightThemeFactory implements UIFactory {
  createButton() { return new LightButton(); }
  createInput()  { return new LightInput();  }
}

// Client không biết dark hay light
function buildForm(factory: UIFactory) {
  const btn = factory.createButton(); // guaranteed compatible
  const inp = factory.createInput();
}`,
              caption: "Factory interface đảm bảo Button và Input luôn cùng theme",
            },
          },
        },
      ],
    },
    {
      id: "builder",
      title: "Builder",
      subtitle: "Xây dựng complex object từng bước một",
      icon: "Blocks",
      iconColor: "text-yellow-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Tách việc tạo object phức tạp thành các bước riêng biệt. Có thể tạo nhiều loại object khác nhau bằng cùng construction process.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào dùng Builder",
              items: [
                '**"HTTP request có nhiều optional config — timeout, retry, headers, auth, proxy"** → `new HttpClient().timeout(5000).retry(3).auth(token).build()`.',
                '**"Test fixture cần tạo User với nhiều variant — admin user, banned user, new user"** → `UserBuilder.base().asAdmin().build()` — tái sử dụng base, override từng field.',
                "**\"SQL query động — filter, sort, pagination tùy caller\"** → `QueryBuilder.from('users').where('active').orderBy('name').limit(10).build()`.",
                "**Telescoping constructor problem** — khi class có constructor `(a, b?, c?, d?, e?)` với 5+ optional params.",
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên dùng Builder",
              items: [
                "Object đơn giản, ít fields → Builder thêm boilerplate không cần thiết. new User('Alice', 'alice@example.com') là đủ",
                "Khi object cần mutable sau khi tạo → Builder thường tạo immutable object. Nếu cần mutate thì dùng setter thông thường",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Fluent API dễ đọc", "Tạo nhiều variant từ cùng process", "Immutable objects", "Tránh telescoping constructor"],
              cons: ["Nhiều boilerplate hơn simple constructor", "Builder cần được sync với class khi thêm field", "Overkill cho object đơn giản"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `class QueryBuilder {
  private table = '';
  private conditions: string[] = [];
  private limitVal?: number;

  from(table: string) { this.table = table; return this; }
  where(cond: string) { this.conditions.push(cond); return this; }
  limit(n: number)    { this.limitVal = n; return this; }
  build() {
    const where = this.conditions.length
      ? \` WHERE \${this.conditions.join(' AND ')}\`
      : '';
    const limit = this.limitVal ? \` LIMIT \${this.limitVal}\` : '';
    return \`SELECT * FROM \${this.table}\${where}\${limit}\`;
  }
}

// Fluent API
const sql = new QueryBuilder()
  .from('users').where('age > 18').where('active = true').limit(10).build();`,
              caption: "Builder với fluent API — mỗi method return this để chain",
            },
          },
        },
      ],
    },
    {
      id: "prototype",
      title: "Prototype",
      subtitle: "Clone object thay vì tạo mới từ đầu",
      icon: "Dna",
      iconColor: "text-purple-500",
      tabs: [
        {
          label: "Khái niệm",
          content: {
            description: "Tạo object mới bằng cách copy (clone) object đã tồn tại. Tránh cost của việc khởi tạo từ đầu, đặc biệt khi initialization expensive.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi nào dùng Prototype",
              items: [
                '**"Tạo 100 enemy trong game cùng loại — load sprite, config, AI behavior từ đầu là tốn"** → Clone từ một template object, chỉ override position/health.',
                '**"Document template — tạo invoice mới từ template có sẵn header, footer, branding"** → Clone template, điền thông tin cụ thể.',
                "**Unit test:** `const base = buildUser(); const admin = { ...base, role: 'admin' };` — clone và modify, tránh tạo lại từ đầu.",
                '**"Config object phức tạp, nhiều môi trường kế thừa từ base config"** → Clone base config, override per-environment.',
              ],
            },
          },
        },
        {
          label: "Không dùng",
          content: {
            dontUseWhen: {
              title: "❌ Khi nào không nên dùng Prototype",
              items: [
                "Object chứa circular reference → Deep clone gây infinite loop nếu không xử lý đặc biệt",
                "Object đơn giản, khởi tạo nhanh → Clone không mang lại lợi ích perf, chỉ thêm complexity",
                "Khi cần object hoàn toàn độc lập về state → Shallow clone chia sẻ nested object references — thay đổi clone sẽ ảnh hưởng original (cần deep clone)",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Tránh cost initialization từ đầu", "Tạo variant từ template nhanh", "Đơn giản với spread/Object.assign trong JS"],
              cons: ["Shallow vs deep clone dễ gây bug", "Circular reference phức tạp", "Clone không gọi constructor — có thể bỏ sót side effects"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface Cloneable<T> { clone(): T; }

class UserConfig implements Cloneable<UserConfig> {
  constructor(public theme = 'light', public lang = 'vi') {}
  clone() { return new UserConfig(this.theme, this.lang); }
}
const base = new UserConfig();
const dark = base.clone(); dark.theme = 'dark';

// JavaScript idiomatic — spread cho shallow clone
const baseUser = { name: 'Alice', role: 'user', prefs: { notify: true } };
const admin = { ...baseUser, role: 'admin' }; // shallow clone
// ⚠️ admin.prefs === baseUser.prefs — shared reference!
const adminDeep = { ...baseUser, prefs: { ...baseUser.prefs }, role: 'admin' };`,
              caption: "Explicit clone() method hoặc spread — chú ý shallow vs deep clone",
            },
          },
        },
      ],
    },
  ],
};

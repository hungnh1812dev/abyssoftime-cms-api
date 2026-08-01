import type { ArchitectureSection } from "@/views/learning/develop/architecture/data/types";

export const behavioralSection: ArchitectureSection = {
  id: "behavioral",
  title: "Behavioral Patterns",
  icon: "Activity",
  description: "Nhóm hành vi — giao tiếp giữa objects: Observer, Strategy, Command, Chain, State, Template, Mediator, Iterator",
  style: {
    iconColor: "text-amber-500 dark:text-amber-400",
    headerBg: "bg-amber-500/10 dark:bg-amber-500/[0.08]",
    headerBorder: "border-amber-500/20 dark:border-amber-500/30",
    accentBorder: "border-amber-500/50 dark:border-amber-500/30",
    sidebarBg: "bg-amber-500/10",
    sidebarText: "text-amber-700 dark:text-amber-300",
  },
  cards: [
    {
      id: "observer",
      title: "Observer",
      subtitle: "Pub/Sub — object thông báo subscribers khi state thay đổi",
      icon: "Eye",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Subject duy trì danh sách observers. Khi state thay đổi, tự động notify tất cả observers. Cơ sở của event system, reactive programming.\n\n**Dấu hiệu cần Observer:** Code có dạng `function doSomething() { updateA(); updateB(); updateC(); }` — A, B, C là concerns khác nhau, nên tách bằng events.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Khi giỏ hàng thay đổi, cần update badge count (header), tổng tiền (sidebar), và analytics tracker"** → Cart emit `cartUpdated` event, 3 component subscribe riêng — Cart không biết ai đang lắng nghe.',
                '**"WebSocket nhận data realtime, nhiều UI widget cùng hiển thị"** → 1 WebSocket subject, N widget observers — thêm/xóa widget không ảnh hưởng connection.',
                '**"Khi user tạo account, gửi email welcome + log audit + tạo profile"** → Domain event `UserRegistered` notify nhiều handlers.',
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
                "Cần đảm bảo thứ tự xử lý → Observer không đảm bảo thứ tự notify. Dùng Chain of Responsibility nếu thứ tự quan trọng",
                "Memory leak — observer không unsubscribe khi component unmount (đặc biệt trong React/Angular). Luôn cleanup",
                'Quá nhiều event, flow khó trace → "Spaghetti event" — debug khó vì không rõ ai emit, ai handle. Cần document rõ event map',
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Loose coupling giữa subject và observer", "Thêm/bỏ observer tại runtime", "Broadcast đến nhiều listener"],
              cons: ["Thứ tự notification không đảm bảo", "Memory leak nếu không unsubscribe", "Cascade update khó debug", "Observer không biết nhau gây implicit dependency"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `class EventEmitter<T> {
  private listeners: ((v: T) => void)[] = [];

  subscribe(fn: (v: T) => void) {
    this.listeners.push(fn);
    return () => { // unsubscribe function
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
  emit(value: T) { this.listeners.forEach(l => l(value)); }
}

const cartUpdated = new EventEmitter<Cart>();

// Subscribe
const unsub1 = cartUpdated.subscribe(cart => updateBadge(cart.count));
const unsub2 = cartUpdated.subscribe(cart => updateTotal(cart.total));
const unsub3 = cartUpdated.subscribe(cart => analytics.track(cart));

// Cleanup (e.g. on component unmount)
unsub1(); unsub2(); unsub3();`,
              caption: "EventEmitter generic — subscribe trả về unsubscribe function để cleanup",
            },
          },
        },
      ],
    },
    {
      id: "strategy",
      title: "Strategy",
      subtitle: "Định nghĩa family of algorithms, đổi chúng tại runtime",
      icon: "Swords",
      iconColor: "text-blue-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Đóng gói mỗi algorithm trong class riêng, cho phép đổi chúng interchangeably. Loại bỏ if-else switch dài khi chọn thuật toán.\n\n**Dấu hiệu cần Strategy:** Code có dạng `if (type === 'A') { ... } else if (type === 'B') { ... }` lặp lại ở nhiều method — mỗi branch là một strategy candidate.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Hỗ trợ thanh toán qua Momo, VNPay, thẻ tín dụng — thêm method mới không sửa checkout flow"** → Mỗi method là một `PaymentStrategy`. Checkout chỉ gọi `strategy.pay(amount)`.',
                '**"Sort sản phẩm theo nhiều tiêu chí — giá, rating, mới nhất — user chọn tại runtime"** → Inject sort strategy tương ứng, không if-else.',
                '**"A/B test — 50% user dùng algorithm cũ, 50% dùng algorithm mới"** → Inject strategy theo user segment.',
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
                "Chỉ có 1–2 variant, không có kế hoạch thêm → Simple if-else dễ đọc hơn",
                "Các strategy cần share state với nhau → Strategy tốt nhất là stateless/pure function. Nếu cần share state, xem lại thiết kế",
                "Khi client cần biết quá nhiều về strategy để chọn đúng → Abstraction bị leak, Strategy không che đủ complexity",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Tuân OCP — thêm strategy mới không sửa context", "Swap algorithm tại runtime", "Loại bỏ if-else phức tạp", "Mỗi strategy dễ test riêng"],
              cons: ["Client phải biết strategy nào dùng", "Nhiều class nhỏ", "Overkill nếu algorithm ít và ổn định"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface SortStrategy<T> {
  sort(data: T[]): T[];
}
class PriceSortAsc implements SortStrategy<Product> {
  sort(data: Product[]) { return [...data].sort((a, b) => a.price - b.price); }
}
class RatingSortDesc implements SortStrategy<Product> {
  sort(data: Product[]) { return [...data].sort((a, b) => b.rating - a.rating); }
}
class NewestFirst implements SortStrategy<Product> {
  sort(data: Product[]) { return [...data].sort((a, b) => b.createdAt - a.createdAt); }
}

class ProductList {
  constructor(private strategy: SortStrategy<Product>) {}
  setStrategy(s: SortStrategy<Product>) { this.strategy = s; }
  getSorted(products: Product[]) { return this.strategy.sort(products); }
}

// Swap tại runtime
const list = new ProductList(new PriceSortAsc());
list.setStrategy(new RatingSortDesc()); // user chọn sort khác`,
              caption: "Strategy inject vào context; swap tại runtime không cần sửa ProductList",
            },
          },
        },
      ],
    },
    {
      id: "command",
      title: "Command",
      subtitle: "Đóng gói request thành object — undo/redo, queue, log",
      icon: "ClipboardList",
      iconColor: "text-yellow-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              'Đóng gói một request thành object, cho phép: parameterize requests, queue, log, và hỗ trợ undo/redo operations.\n\n**Dấu hiệu cần Command:** Cần "ai gọi" tách khỏi "cái gì được thực hiện" — invoker không biết receiver cụ thể.',
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Text editor cần Ctrl+Z undo, Ctrl+Y redo"** → Mỗi edit là Command object với `execute()` và `undo()`. Stack commands, pop để undo.',
                '**"Batch operations — user chọn 50 file rồi click Delete, Compress, Move"** → Queue commands, execute asynchronously, có thể cancel/retry từng command.',
                '**"Audit log — lưu history mọi thao tác user thực hiện, có thể replay"** → Serialize command objects vào DB.',
                '**"Macro — user record sequence of actions, replay sau"** → List of commands, gọi `execute()` tuần tự.',
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
                "Không cần undo/queue/log → Simple method call là đủ, Command pattern chỉ thêm boilerplate",
                'Command chứa business logic phức tạp → Command nên là thin object — chỉ biết "làm gì", không "làm thế nào". Logic phức tạp thuộc về domain/service',
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Undo/redo built-in", "Queue và schedule commands", "Audit log dễ dàng", "Invoker và receiver decoupled"],
              cons: ["Nhiều class nhỏ", "Command có thể bị phình nếu chứa logic", "Phức tạp hơn direct method call khi không cần undo/queue"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface Command { execute(): void; undo(): void; }

class MoveCommand implements Command {
  constructor(private obj: Shape, private dx: number, private dy: number) {}
  execute() { this.obj.move(this.dx, this.dy);   }
  undo()    { this.obj.move(-this.dx, -this.dy); }
}

class TextInsertCommand implements Command {
  constructor(private editor: Editor, private text: string, private pos: number) {}
  execute() { this.editor.insert(this.text, this.pos); }
  undo()    { this.editor.delete(this.pos, this.text.length); }
}

// History stack
const history: Command[] = [];
function executeCmd(cmd: Command) { cmd.execute(); history.push(cmd); }
function undoCmd() { history.pop()?.undo(); } // Ctrl+Z`,
              caption: "Command với execute/undo; history stack cho undo/redo",
            },
          },
        },
      ],
    },
    {
      id: "chain-of-responsibility",
      title: "Chain of Responsibility",
      subtitle: "Pass request dọc theo chain — ai xử lý được thì xử lý",
      icon: "Link",
      iconColor: "text-teal-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Request được pass qua chain của handlers. Mỗi handler quyết định xử lý hoặc pass tiếp cho handler kế tiếp. Cơ sở của middleware pattern.\n\n**Dấu hiệu cần CoR:** Có sequence of checks mà mỗi check có thể short-circuit, và sequence có thể thay đổi/mở rộng.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Mọi API request phải qua: check auth → check rate limit → validate input → business logic"** → Mỗi bước là handler, chain lại. Handler nào fail thì short-circuit, không pass tiếp.',
                '**"Approval workflow — manager duyệt đơn dưới 10 triệu, director dưới 50 triệu, CEO trên 50 triệu"** → Request pass qua chain cho đến khi handler có thẩm quyền xử lý.',
                '**"Log tất cả request nhưng log detail level khác nhau (DEBUG/INFO/ERROR)"** → Chain of logging handlers, mỗi handler filter theo level.',
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
                'Chỉ có 1 handler xử lý — không có "chain" thực sự → Direct call đơn giản hơn',
                "Mọi handler đều phải xử lý request → Đây là Decorator, không phải Chain of Responsibility",
                "Thứ tự chain quan trọng nhưng không được enforce → Bug khi ai đó swap thứ tự handler (auth sau rate limit)",
              ],
            },
          },
        },
        {
          label: "CoR vs Decorator",
          content: {
            description:
              "**Chain of Responsibility:** Chỉ 1 handler xử lý (hoặc short-circuit). Handler có thể dừng chain.\n\n**Decorator:** Tất cả decorator đều wrap và delegate. Không có short-circuit.\n\n**Rule of thumb:** CoR cho pipelines có điều kiện; Decorator cho stacking behaviors.",
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `abstract class Handler {
  protected next?: Handler;
  setNext(h: Handler) { this.next = h; return h; } // return h để chain
  abstract handle(req: Request): Response | null;
}

class AuthHandler extends Handler {
  handle(req: Request) {
    if (!req.token) return { status: 401, body: 'Unauthorized' };
    return this.next?.handle(req) ?? null;
  }
}
class RateLimitHandler extends Handler {
  handle(req: Request) {
    if (isRateLimited(req.ip)) return { status: 429, body: 'Too Many Requests' };
    return this.next?.handle(req) ?? null;
  }
}
class BusinessHandler extends Handler {
  handle(req: Request) { return processRequest(req); }
}

// Wire chain
const auth = new AuthHandler();
auth.setNext(new RateLimitHandler()).setNext(new BusinessHandler());
auth.handle(request);`,
              caption: "Chain với setNext() — handler fail thì short-circuit, không pass tiếp",
            },
          },
        },
      ],
    },
    {
      id: "state",
      title: "State",
      subtitle: "Object thay đổi behavior khi state thay đổi — loại bỏ if/switch khổng lồ",
      icon: "RefreshCw",
      iconColor: "text-orange-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Đóng gói mỗi state thành class riêng. Object delegate hành vi hiện tại cho state object của nó. Tránh if/else/switch lan tràn khi xử lý state.\n\n**Dấu hiệu rõ nhất cần State:** Cùng method nhưng hành vi hoàn toàn khác nhau tùy state, và switch/if ngày càng lớn khi thêm state mới.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                "**\"Order có lifecycle: draft → pending → paid → shipped → delivered → cancelled\"** → `if (order.status === 'paid') { ... } else if ...` lặp trong nhiều method. Mỗi state thành class riêng, delegate action.",
                '**"Button behavior thay đổi theo trạng thái form — disabled khi loading, enabled khi idle, spinner khi submitting"** → State Pattern hoặc finite state machine (XState).',
                "**Khi transition rules phức tạp** — State Pattern enforce valid transitions (`PaidState` không cho phép gọi `pay()` lần nữa).",
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
                "Chỉ có 2 state (boolean flag) → if (isActive) đơn giản hơn nhiều",
                "State ít, hành vi đơn giản → Switch statement với 3–4 case dễ đọc hơn 4 class riêng",
                "Khi XState/state machine library phù hợp hơn — với state phức tạp trong frontend (React), XState express transitions rõ ràng và có visualizer",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Loại bỏ if/switch phức tạp", "Enforce valid transitions", "Mỗi state class dễ test", "Thêm state mới không sửa state khác (OCP)"],
              cons: ["Nhiều class cho mỗi state", "State classes cần biết context", "Overkill cho FSM đơn giản"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `interface OrderState { pay(): void; cancel(): void; ship(): void; }

class PendingState implements OrderState {
  constructor(private order: Order) {}
  pay()    { this.order.setState(new PaidState(this.order)); }
  cancel() { this.order.setState(new CancelledState(this.order)); }
  ship()   { throw new Error('Must pay before shipping'); }
}
class PaidState implements OrderState {
  constructor(private order: Order) {}
  pay()    { throw new Error('Already paid'); }
  cancel() { /* initiate refund */ this.order.setState(new CancelledState(this.order)); }
  ship()   { this.order.setState(new ShippedState(this.order)); }
}

class Order {
  private state: OrderState = new PendingState(this);
  setState(s: OrderState) { this.state = s; }
  pay()    { this.state.pay(); }
  cancel() { this.state.cancel(); }
  ship()   { this.state.ship(); }
}`,
              caption: "Mỗi state enforce valid transitions — PaidState.pay() throw error",
            },
          },
        },
      ],
    },
    {
      id: "template-method",
      title: "Template Method",
      subtitle: "Định nghĩa skeleton of algorithm trong base class, subclass fill in steps",
      icon: "Ruler",
      iconColor: "text-purple-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Base class định nghĩa cấu trúc của algorithm (template method), một số bước là abstract — subclass implement. Tránh duplicate code cho flow chung.\n\n**Framework hooks** — React lifecycle (`componentDidMount`), game loop (`update()`, `render()`) là Template Method built-in của framework.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Import CSV và Excel — flow giống nhau (parse → validate → transform → save) nhưng parse step khác nhau"** → Base class định nghĩa flow, `CSVImporter` và `ExcelImporter` chỉ override `parse()`.',
                '**"Report export ra PDF và Excel — fetch data giống nhau, format khác"** → Template method cho flow, override `format()` và `export()`.',
                "**Dấu hiệu cần Template Method:** Nhiều class có cùng flow nhưng khác nhau ở một vài steps → duplicate code.",
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
                "Khi cần thay algorithm tại runtime → Template Method dùng inheritance (compile-time), không swap được lúc chạy. Dùng Strategy thay",
                "Algorithm quá khác nhau giữa subclass — nếu override quá nhiều bước, base class không còn giá trị. Mỗi subclass nên override tối đa 30–40% steps",
                "Base class có quá nhiều abstract methods → Subclass bị forced implement nhiều method không liên quan (vi phạm ISP)",
              ],
            },
          },
        },
        {
          label: "Template vs Strategy",
          content: {
            description:
              '**Template Method:** Dùng inheritance. Algorithm skeleton trong base class, subclass override steps. Không swap được tại runtime.\n\n**Strategy:** Dùng composition. Algorithm hoàn chỉnh trong strategy object. Swap được tại runtime.\n\n**Rule of thumb:** Template Method cho "same structure, different steps"; Strategy cho "different algorithms entirely".',
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `abstract class DataImporter {
  // Template method — định nghĩa flow, subclass fill in steps
  async import(data: string): Promise<void> {
    const parsed = await this.parse(data);   // abstract
    const valid  = this.validate(parsed);    // abstract
    await this.save(valid);                  // concrete (common logic)
  }

  abstract parse(data: string): Promise<any[]>;
  abstract validate(rows: any[]): any[];

  protected async save(rows: any[]) {
    await db.insertMany(rows); // common save logic
  }
}

class CSVImporter extends DataImporter {
  async parse(data: string) { return parseCSV(data); }
  validate(rows: any[])     { return rows.filter(r => r.name); }
}
class ExcelImporter extends DataImporter {
  async parse(data: string) { return parseExcel(data); }
  validate(rows: any[])     { return rows.filter(r => r.id && r.name); }
}`,
              caption: "import() là template method — parse và validate là abstract hooks",
            },
          },
        },
      ],
    },
    {
      id: "mediator",
      title: "Mediator",
      subtitle: "Object trung gian điều phối giao tiếp giữa các components",
      icon: "Drama",
      iconColor: "text-red-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Thay vì components giao tiếp trực tiếp với nhau (tight coupling), tất cả giao tiếp qua mediator. Giảm many-to-many relationship thành one-to-many.\n\n**Redux/Vuex là Mediator pattern** — components không gọi nhau trực tiếp, tất cả đi qua store.\n\n**Khác Observer:** Observer: subject biết observers tồn tại. Mediator: components không biết nhau, chỉ biết mediator.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Form phức tạp — chọn country thì state dropdown thay đổi, chọn state thì city thay đổi"** → Mediator (FormController) điều phối interaction giữa các field, fields không import nhau trực tiếp.',
                '**"Chat room — user A gửi tin nhắn, tất cả user khác trong room nhận"** → Room là mediator, users không biết nhau.',
                "**Dấu hiệu cần Mediator:** Components A biết B, B biết C, C biết A → circular dependency. Mediator phá vỡ vòng tròn này.",
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
                "Mediator trở thành God Object — biết quá nhiều về quá nhiều components → chuyển complexity từ nhiều chỗ về 1 chỗ, không giải quyết được",
                "Chỉ có 2 components giao tiếp → Direct reference đơn giản hơn",
                "Khi Observer đủ dùng — nếu chỉ cần 1-many notification, Observer nhẹ hơn Mediator",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Loại bỏ circular dependency", "Components độc lập, dễ reuse", "Tập trung logic phối hợp vào 1 chỗ"],
              cons: ["Mediator có thể phình thành God Object", "Khó theo dõi flow vì gián tiếp", "Testing mediator phức tạp khi có nhiều components"],
            },
          },
        },
      ],
    },
    {
      id: "iterator",
      title: "Iterator",
      subtitle: "Duyệt collection mà không expose cấu trúc bên trong",
      icon: "Repeat",
      iconColor: "text-green-500",
      tabs: [
        {
          label: "Concept",
          content: {
            description:
              "Cung cấp cách duyệt qua elements của collection mà không cần biết collection là array, tree, hay graph. JavaScript built-in với `Symbol.iterator`.\n\n**Dấu hiệu cần Iterator:** Client phải biết nội tại của collection để duyệt (biết là array thì dùng index, biết là tree thì đệ quy) → cần ẩn đi.",
          },
        },
        {
          label: "Khi dùng",
          content: {
            useWhen: {
              title: "✅ Khi dùng",
              items: [
                '**"Custom tree structure cần dùng được với for...of, spread operator, Array.from()"** → Implement `Symbol.iterator`, tự động tương thích toàn bộ JS iteration protocol.',
                '**"Pagination — fetch page kế tiếp lazily, không load toàn bộ"** → Async generator `async function* paginate()` — caller dùng `for await...of`, data load on demand.',
                '**"Process CSV 1 triệu dòng mà không load hết vào memory"** → Iterator đọc từng dòng, yield, GC thu hồi dòng đã xử lý.',
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
                "Collection đã là Array/Map/Set → Đã có built-in iterator, không cần implement thêm",
                "Cần random access (index-based) → Iterator là sequential-only, dùng array index trực tiếp",
              ],
            },
          },
        },
        {
          label: "Trade-off",
          content: {
            prosCons: {
              pros: ["Ẩn cấu trúc nội tại của collection", "Tương thích JS iteration protocol (`for...of`, spread, destructuring)", "Lazy evaluation — không cần load all"],
              cons: ["Sequential-only, không random access", "Generator function syntax khác lạ", "Debugging generator stack phức tạp hơn"],
            },
          },
        },
        {
          label: "Code",
          content: {
            codeBlock: {
              language: "typescript",
              code: `// Custom iterable
class Range {
  constructor(private start: number, private end: number) {}
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        if (current <= end) return { value: current++, done: false };
        return { value: undefined, done: true };
      }
    };
  }
}
for (const n of new Range(1, 5)) console.log(n); // 1 2 3 4 5
console.log([...new Range(1, 3)]); // [1, 2, 3]

// Async generator cho pagination
async function* paginate<T>(fetchPage: (page: number) => Promise<T[]>) {
  let page = 1;
  while (true) {
    const items = await fetchPage(page++);
    if (items.length === 0) return;
    yield* items;
  }
}
for await (const user of paginate(p => fetchUsers(p))) {
  process(user); // lazy — chỉ fetch khi cần
}`,
              caption: "Symbol.iterator cho sync iteration; async generator cho lazy pagination",
            },
          },
        },
      ],
    },
  ],
};

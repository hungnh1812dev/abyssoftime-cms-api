import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const designPatternsSection: KnowledgeSection = {
  id: "design-patterns",
  title: "Design Patterns",
  icon: "Workflow",
  description: "Architectural and design patterns for scalable web apps: Clean Architecture, Repository, MVC, MVVM, SOLID, Dependency Injection, and common behavioral patterns.",
  style: {
    iconColor: "text-lime-600 dark:text-lime-400",
    headerBg: "bg-lime-500/10 dark:bg-lime-500/[0.08]",
    headerBorder: "border-lime-500/20 dark:border-lime-500/30",
    accentBorder: "border-lime-500/50 dark:border-lime-500/30",
    sidebarBg: "bg-lime-500/10",
    sidebarText: "text-lime-700 dark:text-lime-300",
  },
  items: [
    {
      id: "dp-clean-architecture",
      title: "Clean Architecture",
      summary: "Robert C. Martin's layered architecture — business logic at the center, dependencies always pointing inward.",
      tags: ["Clean Architecture", "Uncle Bob", "layers", "Dependency Rule", "Use Cases", "Entities", "Adapters"],
      body: "**Clean Architecture** (Robert C. Martin / Uncle Bob) organizes code into concentric layers. The **Dependency Rule**: source code dependencies can only point inward — outer layers depend on inner layers, never the reverse.\n\n**Layers (inner → outer)**:\n- **Entities**: Core business objects and rules — pure TypeScript classes/interfaces, zero external dependencies.\n- **Use Cases** (Application Business Rules): Orchestrate the flow of data to/from entities. Define repository interfaces here.\n- **Interface Adapters**: Controllers, Presenters, Gateways — convert data between Use Cases and the outside world (API, DB, UI).\n- **Frameworks & Drivers**: Next.js, Prisma, React, Express — all at the outermost ring.\n\n**Key Insight**: Your business logic (Use Cases) should never `import` from Next.js, Prisma, or React. If you can swap Next.js for Express without touching your Use Cases, the architecture is correct.\n\n**In Next.js practice**:\n- `domain/` → Entities + Use Cases (pure TypeScript)\n- `infrastructure/` → Prisma repositories, third-party API clients\n- `app/` → Next.js routes acting as Interface Adapters that call Use Cases",
      codeExample: {
        language: "typescript",
        code: `// Project structure following Clean Architecture
//
// domain/user/User.ts               ← Entity
// domain/user/UserRepository.ts     ← Interface (defined by Use Case)
// domain/user/CreateUserUseCase.ts  ← Use Case
// infrastructure/UserPrismaRepository.ts ← Implements interface
// app/api/users/route.ts            ← Interface Adapter (Next.js)

// 1. Entity — zero external dependencies
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

// 2. Repository Interface — defined in domain, implemented outside
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(data: Omit<User, "id">): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}

// 3. Use Case — depends only on domain interfaces, not Prisma
export class CreateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(input: { name: string; email: string }): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new Error("Email already in use");
    return this.users.create({ ...input, role: "user" });
  }
}

// 4. Infrastructure — implements interface using Prisma
export class UserPrismaRepository implements UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  async create(data: Omit<User, "id">) {
    return prisma.user.create({ data });
  }
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
}

// 5. Interface Adapter — Next.js route calls Use Case
export async function POST(req: Request) {
  const body = await req.json();
  const repo = new UserPrismaRepository();
  const useCase = new CreateUserUseCase(repo);
  const user = await useCase.execute(body);
  return Response.json(user, { status: 201 });
}`,
      },
    },
    {
      id: "dp-repository",
      title: "Repository Pattern",
      summary: "Abstract data access behind an interface — decouple business logic from databases, enable unit testing without a real DB.",
      tags: ["Repository", "data access", "abstraction", "interface", "Prisma", "testability", "ORM", "in-memory"],
      body: "**Repository Pattern** provides an abstraction layer between business logic and data access. Instead of calling Prisma/fetch directly in Use Cases, you inject a repository interface — allowing you to swap implementations (Prisma → in-memory → REST API) without touching business logic.\n\n**Benefits**:\n- **Testability**: Inject a mock/in-memory repository in unit tests — no database needed.\n- **Flexibility**: Swap PostgreSQL for MongoDB by providing a new repository class.\n- **Separation**: Business rules live in Use Cases; SQL/ORM details stay in repositories.\n\n**Repository vs DAO** (Data Access Object):\n- DAO is low-level (one method per SQL query).\n- Repository is domain-focused, works with aggregates and entities.\n\n**In Next.js**: Repositories are used in Server Components, Server Actions, and API routes — never imported directly into client components.",
      codeExample: {
        language: "typescript",
        code: `// domain/post/IPostRepository.ts — interface (contract)
export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findByAuthor(authorId: string): Promise<Post[]>;
  save(post: Post): Promise<Post>;
  delete(id: string): Promise<void>;
}

// infrastructure/PostPrismaRepository.ts — production implementation
export class PostPrismaRepository implements IPostRepository {
  async findById(id: string) {
    return prisma.post.findUnique({ where: { id }, include: { author: true } });
  }
  async findByAuthor(authorId: string) {
    return prisma.post.findMany({ where: { authorId }, orderBy: { createdAt: "desc" } });
  }
  async save(post: Post) {
    return prisma.post.upsert({ where: { id: post.id }, update: post, create: post });
  }
  async delete(id: string) {
    await prisma.post.delete({ where: { id } });
  }
}

// infrastructure/PostInMemoryRepository.ts — for unit tests
export class PostInMemoryRepository implements IPostRepository {
  private store = new Map<string, Post>();

  async findById(id: string) { return this.store.get(id) ?? null; }
  async findByAuthor(authorId: string) {
    return [...this.store.values()].filter((p) => p.authorId === authorId);
  }
  async save(post: Post) { this.store.set(post.id, post); return post; }
  async delete(id: string) { this.store.delete(id); }
}

// Use Case — agnostic to which repository is injected
class GetUserPostsUseCase {
  constructor(private posts: IPostRepository) {}
  execute(authorId: string) { return this.posts.findByAuthor(authorId); }
}

// Unit test — no database, fast, deterministic
const repo = new PostInMemoryRepository();
await repo.save({ id: "1", authorId: "u1", title: "Hello World" } as Post);
const useCase = new GetUserPostsUseCase(repo);
const posts = await useCase.execute("u1"); // [{ title: "Hello World" }]`,
      },
    },
    {
      id: "dp-mvc-mvvm",
      title: "MVC & MVVM",
      summary: "Model-View-Controller vs Model-View-ViewModel — separating concerns in UI-driven applications.",
      tags: ["MVC", "MVVM", "Model", "View", "Controller", "ViewModel", "data binding", "separation of concerns", "custom hook"],
      body: "**MVC (Model-View-Controller)** is a classic pattern:\n- **Model**: Data and business rules (database, API responses).\n- **View**: UI presentation (HTML, JSX).\n- **Controller**: Receives user input, updates Model, selects which View to render.\n\nMVC maps well to **Express.js** and traditional server-rendered apps: route handler = Controller, template = View, Prisma model = Model.\n\n**MVVM (Model-View-ViewModel)** is better suited for reactive UIs:\n- **Model**: Raw data (API response shape).\n- **View**: Declarative UI (React component).\n- **ViewModel**: Derived/formatted state, event handlers, side-effect logic — the intermediary layer between View and Model.\n\nIn React, the **ViewModel** is a custom hook wrapping TanStack Query / SWR: it shapes raw data into what the View needs and exposes actions.\n\n**Key difference**:\n- MVC: Controller pushes data to the View imperatively.\n- MVVM: ViewModel exposes reactive state; View subscribes and updates automatically.\n\n**React mapping**:\n- `useUserListViewModel()` hook → ViewModel\n- `<UserList />` component → View\n- Server / API response → Model",
      codeExample: {
        language: "typescript",
        code: `// ─── MVC (Express.js style) ──────────────────────────────────────

// Model
const userModel = {
  findAll: () => prisma.user.findMany(),
  create: (data: CreateUserDto) => prisma.user.create({ data }),
};

// Controller — handles request, calls model, returns view (JSON)
export async function userController(req: Request, res: Response) {
  if (req.method === "GET") {
    const users = await userModel.findAll();
    res.json(users);
  }
  if (req.method === "POST") {
    const user = await userModel.create(req.body);
    res.status(201).json(user);
  }
}

// ─── MVVM (React style) ───────────────────────────────────────────

// Model (API shape)
type User = { id: string; name: string; email: string; role: string };

// ViewModel — custom hook encapsulating derived state + actions
function useUserListViewModel() {
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });
  const queryClient = useQueryClient();

  // Derived state — View doesn't compute this
  const adminCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: string) => fetch(\`/api/users/\${id}\`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return { users, adminCount, isLoading, error, deleteUser };
}

// View — only renders, zero data-fetching logic
function UserListView() {
  const { users, adminCount, isLoading, deleteUser } = useUserListViewModel();

  if (isLoading) return <Spinner />;
  return (
    <div>
      <h2>Users · {adminCount} admins</h2>
      {users.map((u) => (
        <div key={u.id}>
          {u.name}
          <button onClick={() => deleteUser(u.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}`,
      },
    },
    {
      id: "dp-solid",
      title: "SOLID Principles",
      summary: "Five foundational design principles for maintainable, extensible code — especially relevant in TypeScript backends and large React apps.",
      tags: ["SOLID", "SRP", "OCP", "LSP", "ISP", "DIP", "Single Responsibility", "Open/Closed", "Dependency Inversion"],
      body: "**SOLID** is an acronym for five design principles:\n\n**S — Single Responsibility Principle (SRP)**: A class/module should have only one reason to change. A `UserService` should not also send emails — extract an `EmailService`.\n\n**O — Open/Closed Principle (OCP)**: Open for extension, closed for modification. Add new behavior by extending (new class, new strategy), not by editing existing code.\n\n**L — Liskov Substitution Principle (LSP)**: Subtypes must be substitutable for their base type without breaking correctness. An `InMemoryRepository` swapped in for `PrismaRepository` must satisfy the same interface contract.\n\n**I — Interface Segregation Principle (ISP)**: Clients should not depend on methods they don't use. Split a fat `IRepository` into `IReadRepository` and `IWriteRepository` — read-only consumers don't carry mutation methods.\n\n**D — Dependency Inversion Principle (DIP)**: High-level modules depend on abstractions, not concretions. Use Cases depend on `IUserRepository` (interface), not `UserPrismaRepository` (class).\n\n**In React / frontend**:\n- SRP → one component, one job; logic in hooks, not inside JSX\n- OCP → extend via composition and props, not by editing base components\n- DIP → inject services via Context, not by importing concrete implementations directly",
      codeExample: {
        language: "typescript",
        code: `// ─── S: Single Responsibility ─────────────────────────────────────
// ❌ One class doing too many things
class UserService {
  async createUser(data: CreateUserDto) { /* ... */ }
  async sendWelcomeEmail(email: string) { /* ... */ } // wrong place
  async generateAvatar(name: string) { /* ... */ }    // wrong place
}

// ✅ Each class has a single reason to change
class UserService   { async createUser(data: CreateUserDto) { /* ... */ } }
class EmailService  { async sendWelcome(email: string) { /* ... */ } }
class AvatarService { async generate(name: string) { /* ... */ } }

// ─── O: Open/Closed ───────────────────────────────────────────────
// ❌ Adding a new discount type requires editing the function
function price(type: "standard" | "premium" | "vip", p: number) {
  if (type === "standard") return p;
  if (type === "premium") return p * 0.9;
  if (type === "vip") return p * 0.8; // adding "enterprise" = edit this
}

// ✅ Strategy pattern — add a new class, never edit existing ones
interface DiscountStrategy { apply(price: number): number; }
class StandardDiscount implements DiscountStrategy { apply = (p: number) => p; }
class PremiumDiscount  implements DiscountStrategy { apply = (p: number) => p * 0.9; }
class VipDiscount      implements DiscountStrategy { apply = (p: number) => p * 0.8; }
// Adding "enterprise"? Just add a new class.

// ─── I: Interface Segregation ─────────────────────────────────────
// ❌ Fat interface — read-only callers are forced to see write methods
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// ✅ Split into focused interfaces
interface IReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
}
interface IWriteRepository<T> {
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// ─── D: Dependency Inversion ──────────────────────────────────────
// ❌ Use Case depends on concrete Prisma class
class CreatePostUseCase {
  private repo = new PostPrismaRepository(); // ← tightly coupled
}

// ✅ Depend on abstraction — inject via constructor
class CreatePostUseCase {
  constructor(private repo: IWriteRepository<Post>) {}
  async execute(data: CreatePostDto) {
    return this.repo.save({ ...data, id: crypto.randomUUID() } as Post);
  }
}`,
      },
    },
    {
      id: "dp-di",
      title: "Dependency Injection",
      summary: "Inversion of Control — inject dependencies instead of instantiating them, enabling loose coupling and easy testing.",
      tags: ["Dependency Injection", "DI", "IoC", "constructor injection", "React Context", "container", "testability", "loose coupling"],
      body: "**Dependency Injection (DI)** is an implementation of the Dependency Inversion Principle: instead of a class creating its own dependencies with `new`, they are **injected from outside** — making the class configurable, testable, and decoupled.\n\n**3 forms of DI**:\n- **Constructor Injection**: Dependencies passed via constructor (preferred — explicit, clear contract).\n- **Property Injection**: Set on instance properties after construction (less explicit).\n- **Method Injection**: Dependencies passed as method arguments (useful for optional, per-call deps).\n\n**DI Containers**: Libraries like `tsyringe` or `inversify` automate dependency wiring using decorators — valuable in large Node.js backends.\n\n**In Next.js / React**:\n- Use **React Context** as a lightweight DI container for client-side services.\n- Use **constructor injection** in server-side Use Cases and Services.\n- Manual DI (passing objects explicitly) is sufficient for most apps — no heavy container needed.\n\n**Testing Advantage**: With constructor injection, replace real services with mocks in tests — no production code changes required.",
      codeExample: {
        language: "typescript",
        code: `// ─── Manual DI — preferred for most Next.js apps ─────────────────

interface IPaymentGateway {
  charge(amount: number, currency: string): Promise<{ id: string }>;
}

// ❌ Without DI — tightly coupled, untestable
class OrderService {
  private gateway = new StripePaymentGateway(); // cannot swap
  async checkout(order: Order) {
    return this.gateway.charge(order.total, "usd");
  }
}

// ✅ With constructor DI — loosely coupled, testable
class OrderService {
  constructor(private gateway: IPaymentGateway) {}
  async checkout(order: Order) {
    return this.gateway.charge(order.total, "usd");
  }
}

// Production wiring
const stripeGateway = new StripePaymentGateway(process.env.STRIPE_KEY!);
const orderService = new OrderService(stripeGateway);

// Test wiring — mock gateway, no real API calls, no money charged
const mockGateway: IPaymentGateway = {
  charge: jest.fn().mockResolvedValue({ id: "test-charge-123" }),
};
const testOrderService = new OrderService(mockGateway);

// ─── React Context as DI Container ───────────────────────────────

interface AppServices {
  userRepo: IUserRepository;
  emailService: IEmailService;
}

const ServicesCtx = createContext<AppServices | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo<AppServices>(() => ({
    userRepo: new UserPrismaRepository(),
    emailService: new SendgridEmailService(),
  }), []);

  return <ServicesCtx.Provider value={services}>{children}</ServicesCtx.Provider>;
}

export function useServices() {
  const ctx = useContext(ServicesCtx);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}

// Component — consumes injected services, not concrete imports
function UserDashboard() {
  const { userRepo } = useServices();
  // ...
}`,
      },
    },
    {
      id: "dp-common-patterns",
      title: "Common Patterns: Factory, Observer, Strategy, Singleton",
      summary: "Frequently used creational and behavioral patterns in React/Node.js applications.",
      tags: ["Factory", "Observer", "Strategy", "Singleton", "Facade", "EventEmitter", "creational", "behavioral", "design patterns"],
      body: "**Factory Pattern**: Encapsulates object creation. A factory function decides which concrete class to instantiate based on input — callers don't need to know about concrete types.\n\n**Singleton Pattern**: Ensures only one instance exists for the app's lifetime. The Prisma client and database connection pools are canonical singletons in Node.js.\n\n**Observer Pattern**: Objects (observers) subscribe to events emitted by a subject. Node.js `EventEmitter`, custom event buses, and React's `useEffect` reacting to state changes are all Observer implementations.\n\n**Strategy Pattern**: Define a family of algorithms behind a shared interface, making them interchangeable at runtime. Sorting, pricing, validation, and notification strategies are common examples.\n\n**Facade Pattern**: Simplifies a complex subsystem behind a clean, minimal interface. A `PaymentService` class hiding Stripe SDK complexity is a Facade — callers never see Stripe types.",
      codeExample: {
        language: "typescript",
        code: `// ─── Factory Pattern ─────────────────────────────────────────────
interface Logger { log(msg: string): void; warn(msg: string): void; }

class ConsoleLogger implements Logger {
  log  = (msg: string) => console.log(msg);
  warn = (msg: string) => console.warn(msg);
}
class SilentLogger implements Logger {
  log  = () => {};
  warn = () => {};
}

function createLogger(env: string): Logger {
  return env === "test" ? new SilentLogger() : new ConsoleLogger();
}
const logger = createLogger(process.env.NODE_ENV!);

// ─── Singleton Pattern ────────────────────────────────────────────
// Standard Next.js Prisma singleton (prevents connection pool exhaustion)
import { PrismaClient } from "@prisma/client";
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ─── Observer Pattern (EventEmitter) ─────────────────────────────
import { EventEmitter } from "events";

const orderEvents = new EventEmitter();

// Subscribers — register independently, decouple side effects
orderEvents.on("order:created", async (order: Order) => {
  await emailService.sendConfirmation(order.userEmail);
});
orderEvents.on("order:created", async (order: Order) => {
  await inventoryService.reserve(order.items);
});
orderEvents.on("order:created", async (order: Order) => {
  await analyticsService.track("order_created", { orderId: order.id });
});

// Publisher — emits event, doesn't know who listens
async function createOrder(data: CreateOrderDto) {
  const order = await orderRepo.save(data);
  orderEvents.emit("order:created", order);
  return order;
}

// ─── Strategy Pattern ─────────────────────────────────────────────
interface SortStrategy<T> { sort(items: T[]): T[]; }

class ByNameAsc  implements SortStrategy<User> {
  sort(u: User[]) { return [...u].sort((a, b) => a.name.localeCompare(b.name)); }
}
class ByDateDesc implements SortStrategy<User> {
  sort(u: User[]) { return [...u].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
}

// React hook using strategy — swap without touching the component
function useUserList(strategy: SortStrategy<User>) {
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["users"], queryFn: fetchUsers });
  return useMemo(() => strategy.sort(users), [users, strategy]);
}`,
      },
    },
  ],
};

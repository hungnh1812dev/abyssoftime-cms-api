import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const testingSection: KnowledgeSection = {
  id: "testing",
  title: "Testing",
  icon: "TestTube2",
  description: "Unit, Integration, and E2E testing strategies for React applications: Jest, React Testing Library, Playwright, and Storybook.",
  style: {
    iconColor: "text-teal-500",
    headerBg: "bg-teal-500/10 dark:bg-teal-500/[0.08]",
    headerBorder: "border-teal-500/20 dark:border-teal-500/30",
    accentBorder: "border-teal-500/50 dark:border-teal-500/30",
    sidebarBg: "bg-teal-500/10",
    sidebarText: "text-teal-700 dark:text-teal-300",
  },
  items: [
    {
      id: "testing-philosophy",
      title: "Testing Pyramid & Strategy",
      summary: "Categorizing tests based on execution speed and writing cost: unit, integration, and E2E.",
      tags: ["unit", "integration", "e2e", "test pyramid", "testing strategy"],
      body: "**The Testing Pyramid** maps out different test categories relative to execution speed, compilation scope, and cost:\n\n- **Unit Tests** (Base): Focus on isolating a single function or component, mocking all external dependencies. They run in milliseconds and are cheap to implement.\n- **Integration Tests** (Middle): Assess how multiple units interact, such as components hooked up to contexts or custom hooks. They are slower but verify collaboration interfaces.\n- **E2E Tests** (Top): Run full user workflows inside real browsers. They are slower and more brittle, but deliver the highest confidence.\n\n**Core Guideline**: *Test behavior, not implementation.* Design tests around what the user sees and interacts with, rather than asserting internal state keys or custom method calls.\n\n**Target Composition**: 70% unit tests, 20% integration tests, 10% E2E tests.\n\n**What NOT to test**: Internal implementation details (private state variables, helper methods), standard browser APIs, static HTML styling structures.",
      subtopics: [
        {
          title: "Deciding What to Test",
          body: "Prioritize writing tests based on critical risks and frequency of changes:\n- Pure business logic functions → Unit tests are mandatory.\n- Components carrying complex conditional rendering → Integration tests using React Testing Library.\n- Crucial happy paths (e.g. checkout forms, user login portals) → E2E tests.\n- Visual layout elements → Skip, or enforce visual regression suites using Storybook.",
        },
      ],
    },
    {
      id: "testing-jest",
      title: "Jest: Unit Testing",
      summary: "Jest is the default test runner for React applications — structuring assertions using describe, it, expect, mock, and spy.",
      tags: ["jest", "describe", "it", "expect", "mock", "spy", "beforeEach", "afterEach"],
      body: "**Jest** is the standard Javascript test execution runner. It integrates out-of-the-box with Create React App and Next.js.\n\n**Test Structure**:\n- `describe(name, fn)`: Groups related test cases.\n- `it(name, fn)` / `test(name, fn)`: Declares a single test spec.\n- `beforeEach / afterEach / beforeAll / afterAll`: Setup and teardown hooks.\n\n**Matchers**: Supports fluent assertions like `expect(value).toBe()`, `.toEqual()`, `.toContain()`, `.toThrow()`, `.resolves.toEqual()`, and `.rejects.toThrow()`.\n\n**Mocking tools**:\n- `jest.fn()`: Creates a dummy spy function that tracks parameters and returns mocks.\n- `jest.spyOn(obj, 'method')`: Spies on or overrides existing class/object methods.\n- `jest.mock('./module')`: Mocks exports from an entire file path.\n- `jest.useFakeTimers()`: Controls browser clock loops (`setTimeout`, `setInterval`).\n\n**Coverage**: Run `jest --coverage` to inspect code line metrics; target 80%+ on critical execution paths.",
      codeExample: {
        language: "typescript",
        code: `// utils/formatPrice.test.ts
import { formatPrice } from "./formatPrice";

describe("formatPrice", () => {
  it("formats integer price", () => {
    expect(formatPrice(1000)).toBe("1,000 ₫");
  });

  it("formats decimal price", () => {
    expect(formatPrice(1500.5)).toBe("1,500.5 ₫");
  });

  it("throws for negative price", () => {
    expect(() => formatPrice(-1)).toThrow("Price must be non-negative");
  });
});

// Mocking a module
jest.mock("../api/fetchUser");
import { fetchUser } from "../api/fetchUser";

const mockFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>;

it("loads user data", async () => {
  mockFetchUser.mockResolvedValue({ id: 1, name: "Alice" });
  const result = await loadUser(1);
  expect(result.name).toBe("Alice");
  expect(mockFetchUser).toHaveBeenCalledWith(1);
});`,
      },
    },
    {
      id: "testing-rtl",
      title: "React Testing Library",
      summary: "Testing React components based on user interactions — querying elements by accessibility roles rather than CSS selectors.",
      tags: ["RTL", "react-testing-library", "getByRole", "userEvent", "fireEvent", "queries", "accessibility"],
      body: "**React Testing Library (RTL)** mounts components inside virtual DOM boundaries (jsdom) and provides selector APIs designed around screen-reader and accessibility traits.\n\n**Philosophy**: *The more your tests resemble the way your software is used, the more confidence they give you.*\n\n**Query Priority** (prefer in this order):\n1. `getByRole`: Selects elements by ARIA roles (e.g. `button`, `textbox`, `heading`) — **highly recommended**.\n2. `getByLabelText`: Selects inputs linked to visible labels.\n3. `getByPlaceholderText`.\n4. `getByText`: Selects by text string content.\n5. `getByDisplayValue`: Selects form inputs by current value.\n6. `getByAltText`: Selects image assets via alt tag text.\n7. `getByTitle`.\n8. `getByTestId`: **Use only as an escape hatch when accessibility hooks are unavailable**.\n\n**Query Variants**: `getBy` (fails if missing), `queryBy` (returns null if missing), and `findBy` (async, returns a Promise).\n\n**userEvent vs fireEvent**: Favor `@testing-library/user-event` methods (`userEvent.click`, `userEvent.type`) over `fireEvent` because they trigger full browser event lifecycles.",
      codeExample: {
        language: "tsx",
        code: `import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("submits with correct credentials", async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    // Query by role — independent of class names or IDs
    await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    });
  });

  it("shows error when email is empty", async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/email is required/i);
  });
});`,
      },
    },
    {
      id: "testing-async",
      title: "Testing Async & Hooks",
      summary: "waitFor, act, and renderHook — managing asynchronous assertions and custom hook testing.",
      tags: ["waitFor", "act", "renderHook", "async", "Promise", "useEffect", "custom hook"],
      body: "**Asynchronous Testing in RTL**:\n- `findBy*` Queries: Automatically run `waitFor` checks under the hood with a default 1,000ms timeout.\n- `waitFor(callback)`: Repeatedly executes a callback block until assertions pass, useful for checking complex UI shifts.\n- `waitForElementToBeRemoved`: Suspends tests until a spinner or skeleton disappears from the DOM tree.\n\n**`act()`**: Ensures all state updates and side effects finish rendering before assertions run. RTL wraps user interactions in `act()` calls automatically; manual `act()` calls are only required when calling setter hooks from outside React components.\n\n**`renderHook`**: Mounts and asserts custom hooks inside a simulated component wrapper.\n\n**MSW Testing**: Utilize Mock Service Worker (MSW) to intercept outgoing network calls rather than mocking fetch/axios directly.",
      codeExample: {
        language: "tsx",
        code: `import { renderHook, act, waitFor } from "@testing-library/react";
import { useCounter } from "./useCounter";
import { useFetchUser } from "./useFetchUser";

// Test custom hook
it("increments counter", () => {
  const { result } = renderHook(() => useCounter(0));
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});

// Test async hook
it("fetches user data", async () => {
  const { result } = renderHook(() => useFetchUser(1));

  // Initially loading
  expect(result.current.loading).toBe(true);

  // Wait for fetch to resolve
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.user?.name).toBe("Alice");
  expect(result.current.error).toBeNull();
});

// waitFor for complex conditions
it("shows success message after form submit", async () => {
  render(<ContactForm />);
  await userEvent.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(/sent successfully/i);
  });
});`,
      },
    },
    {
      id: "testing-playwright",
      title: "Playwright: E2E Testing",
      summary: "End-to-End testing using Playwright — real browsers, locators, fixtures, and the Page Object Model.",
      tags: ["playwright", "e2e", "page", "locator", "fixture", "screenshot", "page-object-model"],
      body: "**Playwright** executes tests inside actual browsers (Chromium, Firefox, WebKit). It is configured under the `e2e/` directory in this workspace.\n\n**Locators** (robust selector wrappers):\n- `page.getByRole('button', { name: /submit/i })` — **preferred**, matches RTL accessibility queries.\n- `page.getByLabel('Email')` — locates form input fields.\n- `page.getByText('Hello')` — queries by text string content.\n- `page.getByTestId('submit-btn')` — maps data-testid flags.\n- `page.locator('.selector')` — CSS class matching — **avoid in favor of accessibility queries**.\n\n**Auto-Waiting**: Playwright verifies element states (e.g. visible, interactive) automatically before executing actions, preventing timed-sleep statements.\n\n**Page Object Model (POM)**: Structuring page queries and operations into isolated class definitions to keep test suites DRY.\n\n**Fixtures**: Shares setup and teardown scenarios (like authentication states or database seeding) across execution instances.\n\n**Trace Viewer**: Run `playwright show-report` to view step execution timelines, DOM states, and network request snapshots.",
      codeExample: {
        language: "typescript",
        code: `// e2e/pages/LoginPage.ts — Page Object Model
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/auth");
  }

  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.getByRole("alert")).toContainText(message);
  }
}

// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test("user can login with correct credentials", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "secret123");
  await expect(page).toHaveURL("/dashboard");
});

test("shows error for invalid credentials", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("wrong@email.com", "badpass");
  await loginPage.expectErrorMessage("Invalid credentials");
});`,
      },
    },
    {
      id: "testing-storybook",
      title: "Storybook: Component Isolation",
      summary: "Developing and documenting UI components in isolation using stories, args, play functions, and accessibility addons.",
      tags: ["storybook", "stories", "args", "decorators", "play function", "a11y", "component isolation"],
      body: "**Storybook** is an isolated development workshop environment designed to build, document, and test UI components in isolation.\n\n**Stories**: Capture a single visual variant state of a component. Each story exports a render configuration.\n\n**Args**: Represent components props, interactive through Storybook's control dashboard panels.\n\n**Decorators**: Wrap stories in custom layout scaffolding or mock providers (e.g. themes, routing configurations).\n\n**Play Functions**: Programmatic user-interaction hooks executed after rendering, enabling automated testing without separate test files.\n\n**Core Addons**:\n- `@storybook/addon-a11y`: Audits visual states for accessibility violations in real-time.\n- `@storybook/addon-interactions`: Displays play() step execution summaries.\n- `@storybook/test`: Enables assertions directly inside play functions.",
      codeExample: {
        language: "tsx",
        code: `// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, userEvent } from "@storybook/test";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", children: "Click me" },
};

export const WithInteraction: Story = {
  args: { children: "Submit" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /submit/i });

    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-busy", "true");
  },
};`,
      },
    },
    {
      id: "testing-mocking",
      title: "Mocking Strategies",
      summary: "vi.mock, jest.mock, and Mock Service Worker (MSW) — selecting the correct mocking boundary for each test type.",
      tags: ["mock", "vi.mock", "jest.mock", "MSW", "mock service worker", "network intercept", "spy"],
      body: "**Mocking Levels** (ordered from fastest execution to most realistic):\n\n1. **Function Mock** (`jest.fn()` / `vi.fn()`): Mocks a single functional call interface. Fast, low structural confidence.\n2. **Module Mock** (`jest.mock()` / `vi.mock()`): Mocks imported file exports, highly suitable for isolating unit tests.\n3. **Network Mock** (MSW): Intercepts HTTP requests at the fetch/XML level. High confidence since application logic remains unaware it is mocked.\n\n**Mock Service Worker (MSW)**: Set up mock server route handlers to resolve test requests with realistic JSON envelopes.\n\n**When to Use What**:\n- Pure component unit tests → `jest.fn()` / `vi.fn()`.\n- Component integration testing involving API calls → MSW (recommended).\n- Mocking complex third-party library imports → `jest.mock()`.\n- Spy on methods without overriding original behavior → `jest.spyOn()`.\n\n**Rule of Thumb**: Avoid over-mocking. Bloated mock configurations can hide bugs because tests pass against assumptions rather than actual runtime behaviors.",
      codeExample: {
        language: "typescript",
        code: `// MSW handlers file — usable in both browser (Storybook) and node (Jest/Vitest) environments
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "Alice", email: "alice@example.com" });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.password === "wrong") {
      return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    return HttpResponse.json({ token: "mock-jwt-token" });
  }),
];

// test suite setup using MSW
import { setupServer } from "msw/node";
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Overriding default handlers for a specific test case
it("handles server error states", async () => {
  server.use(
    http.get("/api/users/:id", () => HttpResponse.json({ error: "Not Found" }, { status: 404 }))
  );
  // ... execute test asserting error UI render states
});`,
      },
    },
  ],
};

import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const stylingSection: KnowledgeSection = {
  id: "styling",
  title: "Styling",
  icon: "Palette",
  description: "Tailwind CSS, CSS Modules, Sass, and Responsive Design — styling patterns for React applications.",
  style: {
    iconColor: "text-rose-500",
    headerBg: "bg-rose-500/10 dark:bg-rose-500/[0.08]",
    headerBorder: "border-rose-500/20 dark:border-rose-500/30",
    accentBorder: "border-rose-500/50 dark:border-rose-500/30",
    sidebarBg: "bg-rose-500/10",
    sidebarText: "text-rose-700 dark:text-rose-300",
  },
  items: [
    {
      id: "style-tailwind",
      title: "Tailwind CSS",
      summary: "Utility-first CSS framework — JIT compiler, arbitrary values, dark mode, and responsive prefixes.",
      tags: ["tailwind", "utility-first", "JIT", "arbitrary values", "responsive", "dark mode", "purge"],
      body: "**Tailwind CSS** is a utility-first CSS framework — instead of writing custom CSS stylesheets, you compose designs by applying pre-defined utility classes directly within your JSX templates.\n\n**JIT (Just-In-Time) Compiler**: Scans your source files at build time and generates only the exact CSS rules utilized, yielding exceptionally small production CSS bundles.\n\n**Responsive Prefixes**: Mobile-first design breakpoints like `sm:`, `md:`, `lg:`, `xl:`, and `2xl:` are applied progressively from the targeted width upwards.\n\n**State Variants**: Interactive state styling prefixes such as `hover:`, `focus:`, `active:`, `disabled:`, `group-hover:`, and `peer-focus:`.\n\n**Dark Mode**: Configured with `darkMode: 'class'` which applies `dark:` variants when an ancestor element carries the `dark` class.\n\n**Arbitrary Values**: Escape hatches like `w-[347px]`, `bg-[#1a2b3c]`, or `grid-cols-[1fr_2fr_1fr]` to handle design requirements that fall outside standard design tokens.\n\n**`@apply` Directive**: Allows extracting utility classes into custom component CSS classes, though it should be used sparingly in favor of composition in JSX.",
      codeExample: {
        language: "tsx",
        code: `// Responsive, dark mode, and interactive state variants
function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="
      rounded-lg border border-border bg-card p-4
      shadow-sm hover:shadow-md transition-shadow
      dark:bg-card dark:border-border
      sm:p-6 md:p-8
    ">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// Arbitrary values — when the design system falls short
function HeroSection() {
  return (
    <section className="
      h-[calc(100vh-64px)]
      bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]
      from-primary/20 via-background to-background
      grid place-items-center
    ">
      <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold">Hello</h1>
    </section>
  );
}

// tailwind.config.ts — extending design tokens
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: { brand: "hsl(var(--brand))" },
      fontFamily: { sans: ["var(--font-geist-sans)", "system-ui"] },
    },
  },
};`,
      },
    },
    {
      id: "style-tailwind-patterns",
      title: "Tailwind Patterns & Best Practices",
      summary: "The cn() utility, CVA for component variants, and tailwind-merge for conflict resolution.",
      tags: ["cn", "clsx", "tailwind-merge", "CVA", "class-variance-authority", "component variants", "pattern"],
      body: "**`cn()` Utility**: Combines `clsx` (for conditional class lists) with `tailwind-merge` (to resolve class rule conflicts). This is the standard pattern across Tailwind and shadcn/ui projects.\n\n**Conflict Resolution via tailwind-merge**: Passing `cn('p-4', 'p-8')` correctly compiles to `'p-8'` rather than appending both rules. Similarly, resolving `text-red-500 text-blue-500` yields `text-blue-500`. Without this step, conflicting styles depend on CSS cascade order.\n\n**`cva` (class-variance-authority)**: Type-safe component variant builder that lets you declare base styling rules and variant properties in a single structure.\n\n**Best Practice**: Define variant logic inside the component definition file rather than using nested ternary statements inside the JSX block.",
      codeExample: {
        language: "tsx",
        code: `// lib/utils.ts — cn() utility setup
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ cn() — merges conflicting utility classes correctly
cn("p-4 text-red-500", "p-8 text-blue-500")
// → "p-8 text-blue-500" (conflicts resolved)

// ✅ Conditional utility classes
cn("base-class", isActive && "active-class", { "error-class": hasError })

// CVA — type-safe button variants configuration
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}`,
      },
    },
    {
      id: "style-css-modules",
      title: "CSS Modules",
      summary: "Scoped CSS — class names are hashed automatically, preventing style conflicts across components.",
      tags: ["css modules", "scoped css", ":local", "composes", "TypeScript", "camelCase"],
      body: "**CSS Modules** compile raw CSS files into locally scoped JavaScript modules — each class name is hashed into a unique string to prevent stylesheet bleeding.\n\n**Usage**: Import a `.module.css` stylesheet to obtain a scoped mapper object.\n\n**`composes` Key**: Inherits declarations from other CSS classes — similar to Sass's `@extend` directive but without nesting specificity issues.\n\n**TypeScript Integration**: Frameworks like Next.js and Vite support CSS Modules natively. Plugins like `typescript-plugin-css-modules` provide auto-complete declarations.\n\n**`:global` Selector**: Escape hatch to define global CSS rules within a scoped module.\n\n**When to choose CSS Modules**:\n- Building standalone component libraries requiring zero-dependency styles.\n- Writing complex CSS layouts, keyframe animations, or pseudo-elements.\n- Working with developers comfortable with traditional, structured stylesheets.",
      codeExample: {
        language: "typescript",
        code: `/* Button.module.css */
.base {
  display: inline-flex;
  align-items: center;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.primary {
  composes: base; /* inherits styles from .base */
  background-color: var(--color-primary);
  color: white;
}

.primary:hover {
  opacity: 0.9;
}

/* Custom animation styles mapped to the module */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* :global escape hatch — styling global elements */
:global(.tippy-box) {
  border-radius: 0.5rem;
}`,
      },
      subtopics: [
        {
          title: "Importing in React",
          body: "Hashed class names are resolved dynamically. Use the `cn()` utility to compose them with conditional props.",
          codeExample: {
            language: "tsx",
            code: `import styles from "./Button.module.css";
import { cn } from "@/lib/utils";

function Button({ isPrimary }: { isPrimary: boolean }) {
  return (
    <button className={cn(styles.base, isPrimary && styles.primary)}>
      Click me
    </button>
  );
}`,
          },
        },
      ],
    },
    {
      id: "style-sass",
      title: "Sass/LESS",
      summary: "CSS preprocessors — variables, nesting, mixins, @extend, and BEM methodology.",
      tags: ["sass", "scss", "less", "variables", "nesting", "mixins", "extend", "BEM", "preprocessor"],
      body: "**Sass (SCSS)** extends native CSS structures by supporting variables, selector nesting, reusable mixins, and mathematical functions.\n\n**Sass vs CSS Custom Properties**: Sass variables (`$var`) compile at build time, while CSS variables (`--var`) resolve dynamically at runtime. Prefer CSS variables for theming, and Sass variables for design tokens.\n\n**Core Features**:\n- **Variables**: `$primary: #3b82f6;`\n- **Selector Nesting**: Group stylesheets logically, but limit nesting depth to 3 levels.\n- **Mixins**: Declare parameterized CSS codeblocks designed for structural reuse.\n- **`@extend`**: Shares CSS rules between selectors, but watch out for bloated compiled output.\n- **`@use` / `@forward`**: The modern Sass module system replacing the deprecated `@import` syntax.\n\n**BEM (Block Element Modifier)**: Naming architecture matching BEM (`.block__element--modifier`) that works well with selector nesting.",
      codeExample: {
        language: "typescript",
        code: `// _variables.scss
$spacing-base: 8px;
$color-primary: #3b82f6;
$color-primary-dark: darken($color-primary, 10%);
$breakpoint-md: 768px;

// _mixins.scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin respond-to($breakpoint) {
  @if $breakpoint == md {
    @media (min-width: $breakpoint-md) { @content; }
  }
}

// Card.scss — composing with BEM nesting
@use "./variables" as *;
@use "./mixins" as *;

.card {
  border-radius: $spacing-base;
  padding: $spacing-base * 2;

  &__header {
    @include flex-center;
    margin-bottom: $spacing-base;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 600;

    @include respond-to(md) {
      font-size: 1.5rem;
    }
  }

  &--highlighted {
    border: 2px solid $color-primary;
    background: rgba($color-primary, 0.05);
  }
}`,
      },
    },
    {
      id: "style-responsive",
      title: "Responsive Design & Container Queries",
      summary: "Mobile-first design, breakpoints, fluid typography, and modern Container Queries.",
      tags: ["responsive", "mobile-first", "breakpoints", "container queries", "fluid typography", "viewport", "clamp"],
      body: "**Mobile-First**: Declare mobile styles as the default, and use `min-width` media queries to layer layout extensions for larger displays. This is the opposite of `max-width` (desktop-first).\n\n**Tailwind Breakpoints**: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), and `2xl` (1536px).\n\n**Fluid Typography with `clamp()`**: Automatically scales sizes linearly between minimum and maximum bounds based on viewport width, reducing breakpoint queries.\n\n**Container Queries (`@container`)**: Formulates responsive rules based on the parent container's width rather than the browser viewport — perfect for widgets rendered in multiple contexts.\n\n**`dvh`/`svh`/`lvh` Viewport Units**: Resolves mobile layout issues where address bars shift the calculated layout viewport.",
      codeExample: {
        language: "tsx",
        code: `// Fluid typography using clamp()
// Tailwind: text-[clamp(1rem,2.5vw,1.5rem)]
// Raw CSS:
.hero-title {
  font-size: clamp(1.5rem, 4vw + 1rem, 4rem);
  /* min: 1.5rem, preferred scaling: 4vw+1rem, max: 4rem */
}

// Container Queries — responsive based on parent container width
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}

// Mobile viewport height — avoid using h-screen on mobile layouts
// Dùng min-h-dvh (dynamic viewport height) to account for shifting address bars
function FullHeightLayout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-16 shrink-0">...</header>
      <main className="flex-1 overflow-auto">...</main>
    </div>
  );
}`,
      },
    },
    {
      id: "style-a11y",
      title: "Accessibility (A11Y)",
      summary: "ARIA roles, semantic HTML, keyboard navigation, and focus management for React applications.",
      tags: ["accessibility", "a11y", "ARIA", "semantic HTML", "focus", "keyboard", "screen reader", "WCAG", "role"],
      body: '**Accessibility (A11Y)** ensures applications remain usable by individuals using screen readers, keyboard-only interfaces, or experiencing sensory impairments.\n\n**Semantic HTML First**: Prefer elements like `<button>` over `<div onClick>`, `<nav>` over `<div className="nav">`, and actual `<h1>`-`<h6>` tags over sized paragraph tags.\n\n**ARIA Attributes**: Use ARIA attributes only when semantic elements fall short:\n- `aria-label`: Text descriptions for interactive components without visible headers.\n- `aria-labelledby`: Refers to other visual headings to serve as the label.\n- `aria-describedby`: References descriptive text paragraphs.\n- `aria-hidden="true"`: Hides decorative icons from screen reader pipelines.\n- `aria-live`: Programmatically announces dynamic UI alerts.\n- `role`: Overrides the default semantic role of an element.\n\n**Focus Management**: Direct focus to modal shells upon mounting, and return it to the trigger button when dismissed. Consider using libraries like `focus-trap`.\n\n**Keyboard Navigation**: Interactive components must support tabs for navigation, Enter/Space for activation, and Escape for cancellation.\n\n**Contrast Ratios**: WCAG AA standards require a contrast ratio of 4.5:1 for normal body copy, and 3:1 for headers. Audit via Storybook a11y panels or axe DevTools.',
      subtopics: [
        {
          title: "Testing Accessibility",
          body: "Perform tests in multiple stages:\n- **Automated**: Integrate `jest-axe` in unit test environments, `@storybook/addon-a11y` in dev loops, or `axe-playwright` in E2E checks.\n- **Manual**: Test navigation with Tab and Arrow keys, run VoiceOver or NVDA, and review the browser Accessibility Panel.\n- **RTL Integration**: Testing-library `getByRole` queries ensure elements carry correct ARIA roles.",
          codeExample: {
            language: "tsx",
            code: `import { axe, toHaveNoViolations } from "jest-axe";
import { render } from "@testing-library/react";

expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});`,
          },
        },
      ],
      codeExample: {
        language: "tsx",
        code: `// ❌ Non-semantic div closure icon
<div onClick={handleClose} className="close-icon">×</div>

// ✅ Accessible button wrapper
<button onClick={handleClose} aria-label="Close dialog" type="button">
  <XIcon aria-hidden="true" />
</button>

// Modal with custom focus management
function Modal({ isOpen, onClose, children }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus(); // autofocus when open
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="bg-background rounded-lg p-6 shadow-xl max-w-md w-full">
        <h2 id="modal-title" className="text-xl font-semibold">Confirm Action</h2>
        <p id="modal-desc" className="mt-2 text-muted-foreground">{children}</p>
        <div className="mt-4 flex gap-3">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button onClick={onClose} className="btn-primary">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// Live regions for status updates
function SearchResults({ count }: { count: number }) {
  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {count} results found
      </div>
      {/* ... results */}
    </>
  );
}`,
      },
    },
  ],
};

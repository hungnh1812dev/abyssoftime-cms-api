import { Binary, BookOpen, Code2, FileText, Home, Layers, type LucideIcon, Syringe } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "CV", href: "/cv-2", icon: FileText },
  { label: "EN Vocabulary", href: "/learning/english", icon: BookOpen },
  { label: "Vaccine", href: "/vaccine", icon: Syringe },
  { label: "React Knowledge", href: "/learning/develop/react", icon: Code2 },
  { label: "Architecture", href: "/learning/develop/architecture", icon: Layers },
  { label: "Go Knowledge", href: "/learning/develop/go", icon: Binary },
];

export { NAV_ITEMS };
export type { NavItem };

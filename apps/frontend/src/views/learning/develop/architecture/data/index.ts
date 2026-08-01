import type { ArchitectureSection } from "./types";
import { viSections } from "./vi";

export function getArchitectureSections(locale: string): ArchitectureSection[] {
  switch (locale) {
    case "vi":
      return viSections;
    default:
      return viSections;
  }
}

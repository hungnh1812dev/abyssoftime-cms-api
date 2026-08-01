import type { ArchitectureSection } from "../types";

import { behavioralSection } from "./behavioral";
import { creationalSection } from "./creational";
import { decisionSection } from "./decision";
import { softwareArchSection } from "./software-arch";
import { solidSection } from "./solid";
import { structuralSection } from "./structural";
import { systemArchSection } from "./system-arch";

export const viSections: ArchitectureSection[] = [systemArchSection, softwareArchSection, solidSection, creationalSection, structuralSection, behavioralSection, decisionSection];

import type { SectionStyle } from "@/views/learning/develop/react/react-knowledge.types";

export type BadgeColor = "green" | "blue" | "purple" | "orange" | "teal" | "red" | "yellow";

export type InfoBoxType = "tip" | "warning" | "note";

export interface FlowStep {
  label: string;
}

export interface ListBlock {
  title: string;
  items: string[];
}

export interface ArchCodeBlock {
  language: "typescript" | "javascript";
  code: string;
  caption?: string;
}

export interface Badge {
  label: string;
  color: BadgeColor;
}

export interface InfoBox {
  type: InfoBoxType;
  title: string;
  content: string;
}

export interface TableData {
  headers: string[];
  rows: TableCell[][];
}

export type TableCell = string | { badge: string; color: BadgeColor };

export interface ProsCons {
  pros: string[];
  cons: string[];
}

export interface CardContent {
  description?: string;
  flowSteps?: FlowStep[];
  useWhen?: ListBlock;
  dontUseWhen?: ListBlock;
  prosCons?: ProsCons;
  codeBlock?: ArchCodeBlock;
  badges?: Badge[];
  infoBoxes?: InfoBox[];
  table?: TableData;
  orderedList?: string[];
  unorderedList?: string[];
}

export interface CardTab {
  label: string;
  content: CardContent;
}

export interface ArchitectureCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  isWide?: boolean;
  tabs?: CardTab[];
  content?: CardContent;
}

export interface ArchitectureSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  style?: SectionStyle;
  cards: ArchitectureCard[];
}

export interface ArchitectureSectionMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  style?: SectionStyle;
  itemCount: number;
}

export interface ArchitecturePageMetaData {
  sections: ArchitectureSectionMeta[];
}

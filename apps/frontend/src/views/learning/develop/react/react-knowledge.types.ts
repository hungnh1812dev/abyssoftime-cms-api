export interface SectionStyle {
  iconColor: string;
  headerBg: string;
  headerBorder: string;
  accentBorder: string;
  sidebarBg: string;
  sidebarText: string;
}

export type RenderPhase = "render" | "commit" | "post-commit" | "lazy";

export interface RenderPhaseInfo {
  phase: RenderPhase;
  label: string;
  timing: string;
}

export interface CodeExample {
  language: "typescript" | "javascript" | "tsx" | "bash" | "json";
  code: string;
  caption?: string;
  runnable?: boolean;
}

export interface Subtopic {
  title: string;
  body: string;
  codeExample?: CodeExample;
}

export interface SectionItem {
  id: string;
  title: string;
  summary: string;
  tags?: string[];
  body: string;
  codeExample?: CodeExample;
  subtopics?: Subtopic[];
  hookSignature?: string;
  renderPhase?: RenderPhaseInfo;
  whenToUse?: string;
  caveats?: string[];
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  iconColor: "text-primary",
  headerBg: "bg-primary/10",
  headerBorder: "border-primary/20",
  accentBorder: "border-primary/30",
  sidebarBg: "bg-accent",
  sidebarText: "text-accent-foreground",
};

export interface KnowledgeSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  style?: SectionStyle;
  items: SectionItem[];
}

export interface ReactKnowledgePageData {
  sections: KnowledgeSection[];
}

export interface KnowledgeSectionMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  style?: SectionStyle;
  itemCount: number;
}

export interface ReactKnowledgePageMetaData {
  sections: KnowledgeSectionMeta[];
}

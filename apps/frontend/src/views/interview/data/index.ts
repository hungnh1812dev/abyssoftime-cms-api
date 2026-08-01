import { apiNetworkingSection, frontendArchSection, ssrRenderingSection, testingSection, toolingSection, webviewSection } from "./sections/arch-tooling";
import { htmlCssSection, webPerfSection } from "./sections/css-perf";
import { behavioralSection, cvGapSection } from "./sections/gap-behavioral";
import { hrSection } from "./sections/hr";
import { cicdLeadSection, codeReviewSection, mentoringSection, systemDesignSection, techDecisionsSection } from "./sections/leadership";
import { reactProblemsSection, reactSection } from "./sections/react";
import { functionalProgSection, javascriptSection, stateMgmtSection } from "./sections/state-js";

export const ALL_SECTIONS = [
  // I. HR / Recruitment
  hrSection,
  // II-A. ReactJS
  reactSection,
  reactProblemsSection,
  // II-B/C/D. State, FP, JS
  stateMgmtSection,
  functionalProgSection,
  javascriptSection,
  // II-E/F. CSS, Performance
  htmlCssSection,
  webPerfSection,
  // II-G/H/I/J/K/L. Architecture, SSR, Tooling, API, Testing, WebView
  frontendArchSection,
  ssrRenderingSection,
  toolingSection,
  apiNetworkingSection,
  testingSection,
  webviewSection,
  // III. Leadership
  systemDesignSection,
  techDecisionsSection,
  codeReviewSection,
  cicdLeadSection,
  mentoringSection,
  // IV/V. Gap & Behavioral
  cvGapSection,
  behavioralSection,
];

import type { CommonTextType, CvPageDataType } from "../CvPage";
import { ExternalLink } from "lucide-react";

import { HTMLParser } from "@/lib/html-parser";

import styles from "./CvSectionProjects.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionProjectsProps {
  projects: CvPageDataType["projects"];
  commonText: CommonTextType;
}

export const CvSectionProjects = ({ projects, commonText }: CvSectionProjectsProps) => {
  return (
    <section id="projects" className={`mb-7 ${styles.section}`}>
      <h3 className={sectionHeadingClass}>{projects.name}</h3>
      <div>
        {projects.items.map((project, index) => (
          <div key={`project-${index}`} className={`pt-5 first:pt-0 ${styles.item}`}>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h4 className="text-sm font-bold">{project.name}</h4>
                {project.link && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={project.link}
                    className="inline-flex items-center gap-0.5 text-[10px] text-blue-600/70 hover:text-blue-600 hover:underline dark:text-blue-400/70 print:hidden">
                    Live <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                )}
                {project.responsitoryLink && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={project.responsitoryLink}
                    className="inline-flex items-center gap-0.5 text-[10px] text-foreground/45 hover:text-foreground hover:underline print:hidden">
                    GitHub <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                )}
              </div>
              {(project.role || (project.teamSize && project.teamSize > 1)) && (
                <span className="shrink-0 text-xs text-foreground/50">
                  {[project.role, project.teamSize && project.teamSize > 1 ? `Team of ${project.teamSize}` : null].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {/* {project.techStack.map((tech) => (
                <span key={tech} className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-xs text-foreground/55">
                  {tech}
                </span>
              ))} */}
              <span className="top-1 mr-1 inline-block text-xs font-semibold tracking-widest text-blue-600/70 dark:text-blue-400/70">{commonText.text["technologies"]}:</span>
              <div className="flex flex-1 flex-wrap gap-1">
                {project.techStack.map((tech) => (
                  <span key={tech} className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-xs text-foreground/55">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <p className="mb-0 mt-1 text-xs font-semibold text-blue-600/70 dark:text-blue-400/70">{commonText.text["responsibilities-contributions"]}:</p>
            <HTMLParser content={project.description} className="text-sm text-foreground/75 [&>li]:pb-0.5 [&>p]:m-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:pt-0.5" />
            {(project.link || project.responsitoryLink) && (
              <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 print:flex">
                {project.link && (
                  <span className="text-[10px] text-foreground/60">
                    <span className="font-semibold text-blue-600/70">Live:</span> {project.link}
                  </span>
                )}
                {project.responsitoryLink && (
                  <span className="text-[10px] text-foreground/60">
                    <span className="font-semibold">GitHub:</span> {project.responsitoryLink}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

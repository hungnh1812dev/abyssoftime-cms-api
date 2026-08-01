import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import { HTMLParser } from "@/lib/html-parser";
import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantProjectsProps {
  projects: CvElegantPageDataType["projects"];
  commonText: CommonTextType;
}

export const CvElegantProjects = ({ projects, commonText }: CvElegantProjectsProps) => {
  return (
    <CvElegantSection title={commonText.text["projects"] ?? "Projects"} id="projects">
      <div className="space-y-5">
        {projects.map((project, idx) => (
          <div key={idx} className="print:break-inside-avoid">
            <h4 className="text-sm font-bold">{project.name}</h4>
            {(project.role || (project.teamSize && project.teamSize > 1)) && (
              <p className="mt-0.5 text-xs text-foreground/50">{[project.role, project.teamSize > 1 ? `Team of ${project.teamSize}` : null].filter(Boolean).join(" · ")}</p>
            )}
            <HTMLParser content={project.responsibilities} className="mt-1 text-sm text-foreground/75 [&>li]:pb-0.5 [&>p]:m-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:pt-0.5" />
            {project.techStack && project.techStack.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-start gap-x-2">
                <span className="text-xs font-semibold text-foreground/50">{commonText.text["technologies"] ?? "Technologies"}:</span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {project.techStack.map((tech) => (
                    <span key={tech} className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-xs text-foreground/55">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(project.liveLink || project.responsitoryLink) && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {project.liveLink && (
                  <span className="text-xs text-foreground/60">
                    <span className="text-xs font-semibold text-foreground/50">{commonText.text["live"] ?? "Live"}:</span> {project.liveLink}
                  </span>
                )}
                {project.responsitoryLink && (
                  <span className="text-xs text-foreground/60">
                    <span className="text-xs font-semibold text-foreground/50">{commonText.text["github"] ?? "GitHub"}:</span> {project.responsitoryLink}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </CvElegantSection>
  );
};

export interface CvElegantPageDataType {
  documentId: string;
  position: string;
  summary: string;
  educations: {
    degree: string;
    description: string;
    institution: string;
    location: string;
    period: string;
  }[];
  experiences: {
    company: string;
    location: string;
    roles: {
      period: string;
      position: string;
      projects: string;
      responsibilities: string;
      teamSize: number;
      techStack: string[];
    }[];
  }[];
  skills: {
    level: string;
    skill: string;
  }[];
  projects: {
    name: string;
    liveLink: string;
    responsitoryLink: string;
    role: string;
    teamSize: number;
    techStack: string[];
    responsibilities: string;
  }[];
  languages: {
    language: string;
    level: string;
  }[];
  references: {
    name: string;
    role: string;
    phone: string;
  }[];
}

export interface CvElegantListItemType {
  documentId: string;
  companyName: string;
}

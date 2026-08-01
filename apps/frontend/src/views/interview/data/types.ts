export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
}

export interface InterviewSection {
  id: string;
  label: string;
  category: "HR" | "Technical" | "Leadership" | "Gap" | "Behavioral";
  iconName: string;
  color: string;
  bgColor: string;
  questions: InterviewQuestion[];
}

import { BasePageProps } from "@/types/BasicType";
import { InterviewQuestionsPage } from "@/views/interview/InterviewQuestionsPage";

export default async function Page({ params }: BasePageProps) {
  const { locale } = await params;
  return <InterviewQuestionsPage locale={locale ?? "en"} />;
}

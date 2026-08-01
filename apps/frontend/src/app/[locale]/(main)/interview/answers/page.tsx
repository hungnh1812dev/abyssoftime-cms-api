import { BasePageProps } from "@/types/BasicType";
import { InterviewAnswersPage } from "@/views/interview/InterviewAnswersPage";

export default async function Page({ params }: BasePageProps) {
  const { locale } = await params;
  return <InterviewAnswersPage locale={locale ?? "en"} />;
}

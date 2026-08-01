import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCvElegantById } from "@/views/cv-elegant/cv-elegant.service";
import type { CvElegantPageDataType } from "@/views/cv-elegant/CvElegantPage";
import type { CommonTextType, CvContactType } from "@/views/cv-elegant/CvElegantPage";
import { CvElegantPageContent } from "@/views/cv-elegant/CvElegantPageContent";
import { getCommonText } from "@/views/cv/common-text.service";
import { getContact } from "@/views/cv/contact.service";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `CV — ${slug}` };
}

export default async function CvElegantSlugPage({ params }: Props) {
  const { slug } = await params;

  let data: CvElegantPageDataType;
  let contact: CvContactType;
  let commonText: CommonTextType;

  try {
    [data, contact, commonText] = (await Promise.all([getCvElegantById(slug), getContact(), getCommonText()])) as [CvElegantPageDataType, CvContactType, CommonTextType];
  } catch {
    notFound();
  }

  return <CvElegantPageContent data={data!} contact={contact!} commonText={commonText!} />;
}

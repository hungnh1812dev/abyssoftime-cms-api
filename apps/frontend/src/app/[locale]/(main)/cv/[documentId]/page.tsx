import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCommonText } from "@/views/cv/common-text.service";
import { getContact } from "@/views/cv/contact.service";
import { getCvById } from "@/views/cv/cv.service";
import type { CommonTextType, CvCollectionItemType, CvContactType } from "@/views/cv/CvPage";
import { CvPageContent } from "@/views/cv/CvPageContent";

interface Props {
  params: Promise<{ locale: string; documentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { documentId } = await params;
  return { title: `CV — ${documentId}` };
}

export default async function CvChildPage({ params }: Props) {
  const { documentId } = await params;

  let data: CvCollectionItemType;
  let contact: CvContactType;
  let commonText: CommonTextType;

  try {
    [data, contact, commonText] = (await Promise.all([getCvById(documentId), getContact(), getCommonText()])) as [CvCollectionItemType, CvContactType, CommonTextType];
  } catch {
    notFound();
  }

  return <CvPageContent data={data!} contact={contact!} commonText={commonText!} />;
}

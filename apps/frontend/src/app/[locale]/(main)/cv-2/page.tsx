import type { Metadata } from "next";

import CvElegantPage from "@/views/cv-elegant/CvElegantPage";

export const metadata: Metadata = {
  title: "CV",
  description: "CV của Nguyen Huy Hung — Senior React Frontend Developer với 6+ năm kinh nghiệm xây dựng ứng dụng web hiện đại.",
};

export default async function CvElegantIndexPage() {
  return <CvElegantPage />;
}

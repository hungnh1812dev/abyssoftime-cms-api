import type { Metadata } from "next";

import { getVaccinePage } from "@/views/vaccine/vaccine.service";
import VaccinePage from "@/views/vaccine/VaccinePage";

export const metadata: Metadata = {
  title: "Vaccine",
  description: "Tra cứu 39+ loại vắc-xin, lịch tiêm chủng cho trẻ 0–24 tháng và so sánh các gói tiêm chủng VNVC.",
};

export default async function VaccineIndexPage() {
  const data = await getVaccinePage();
  return <VaccinePage data={data!} />;
}

import type { Metadata } from "next";

import Home from "@/views/home/Home";
import { getHomePage } from "@/views/home/home.service";

export const metadata: Metadata = {
  title: "Trang chủ",
  description: "Tổng hợp các công cụ: học từ vựng tiếng Anh, tra cứu vắc-xin và xem CV.",
};

export default async function HomePage() {
  const data = await getHomePage();
  return <Home data={data!} />;
}

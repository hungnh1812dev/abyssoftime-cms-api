import type { Metadata } from "next";
import { Inter } from "next/font/google";

import LayoutRoot from "@/components/layouts/root/LayoutRoot";
import { BaseLayoutProps } from "@/types/BasicType";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Abyssoftime",
    default: "Abyssoftime",
  },
  description: "Abyssoftime — công cụ học từ vựng tiếng Anh, theo dõi tiêm chủng và xem CV.",
};

export default async function RootLayoutIndex(props: BaseLayoutProps) {
  const params = await props.params;
  return (
    <LayoutRoot params={params} className={inter.className}>
      {props.children}
    </LayoutRoot>
  );
}

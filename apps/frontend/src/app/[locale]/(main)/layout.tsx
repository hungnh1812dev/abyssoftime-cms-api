import LayoutMain from "@/components/layouts/main/LayoutMain";
import { BaseLayoutProps } from "@/types/BasicType";

export default function MainLayoutIndex({ children }: BaseLayoutProps) {
  return <LayoutMain>{children}</LayoutMain>;
}

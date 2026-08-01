import LayoutLocale from "@/components/layouts/locale/LayoutLocale";
import { BaseLayoutProps } from "@/types/BasicType";

export default async function LocaleLayoutIndex(props: BaseLayoutProps) {
  return <LayoutLocale>{props.children}</LayoutLocale>;
}

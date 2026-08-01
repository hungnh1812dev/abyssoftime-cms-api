import React from "react";

import { defaultLocale } from "@/utils/Constants";

interface HtmlLocaleProps {
  lang: string;
  children: React.ReactNode;
}

const HtmlLocale: React.FC<HtmlLocaleProps> = ({ lang, children }) => {
  return (
    <html lang={lang || defaultLocale} suppressHydrationWarning>
      {children}
    </html>
  );
};

export default HtmlLocale;

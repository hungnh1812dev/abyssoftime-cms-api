import React from "react";

import HtmlLocale from "@/components/html-locale/HtmlLocale";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import "@/styles/globals.css";
import { ResolvedParams } from "@/types/BasicType";
import { defaultLocale } from "@/utils/Constants";

// Chạy trước React hydration để tránh flash of unstyled content
const FOUC_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

interface LayoutRootProps {
  className?: string;
  params: ResolvedParams;
  children?: React.ReactNode;
}

const LayoutRoot: React.FC<LayoutRootProps> = ({ className, params, children }) => {
  return (
    <HtmlLocale lang={params.locale || defaultLocale}>
      <body className={className}>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
        <ThemeProvider>
          {children}
          <ToasterProvider />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </HtmlLocale>
  );
};

export default LayoutRoot;

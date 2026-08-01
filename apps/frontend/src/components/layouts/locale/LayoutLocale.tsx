import React from "react";

interface LayoutLocaleProps {
  className?: string;
  children?: React.ReactNode;
}

const LayoutLocale: React.FC<LayoutLocaleProps> = ({ children }) => {
  return <>{children}</>;
};

export default LayoutLocale;

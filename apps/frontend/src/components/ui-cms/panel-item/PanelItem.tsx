import React from "react";

import { cn } from "@/lib/utils";

import styles from "./PanelItem.module.css";

export interface PanelItemDataType {}

interface PanelItemProps {
  className?: string;
  children?: React.ReactNode;
}

const PanelItem: React.FC<PanelItemProps> = ({ className, children }) => {
  return <div className={cn("grid w-full gap-4 md:grid-cols-2", className)}>{children}</div>;
};

export default PanelItem;

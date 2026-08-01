"use client";

import { Button } from "@/components/ui/button";

export const PrintButton: React.FC<{ className?: string }> = ({ className }) => (
  <Button variant="outline" size="sm" className={className} onClick={() => window.print()}>
    Print / Save PDF
  </Button>
);

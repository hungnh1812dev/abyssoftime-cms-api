"use client";

import type { ReactNode } from "react";

import { HealthProvider } from "@/context/HealthContext";

export function HealthGate({ children }: { children: ReactNode }) {
  return <HealthProvider>{children}</HealthProvider>;
}

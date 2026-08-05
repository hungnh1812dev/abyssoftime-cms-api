import { NextRequest, NextResponse } from "next/server";

import i18n from "@/i18n";
import { checkApiHealth } from "@/libs/health/checkApiHealth";

export async function proxy(request: NextRequest) {
  const healthy = await checkApiHealth();
  if (!healthy) {
    return NextResponse.rewrite(new URL("/unhealthy", request.url));
  }

  return i18n(request);
}

export const config = {
  matcher: [
    // Skip internal Next.js paths, API routes, and the unhealthy-state page itself
    // (so a direct/rewritten hit on /unhealthy doesn't get re-gated or rewritten by i18n)
    "/((?!_next|api|unhealthy).*)",
  ],
};

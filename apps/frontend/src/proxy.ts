import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

import i18n from "@/i18n";
import { getApiHealth } from "@/lib/health/healthCache";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const healthy = await getApiHealth((promise) => event.waitUntil(promise));
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

import { NextResponse } from "next/server";

import { checkApiHealth } from "@/lib/health/checkApiHealth";

export async function GET() {
  const healthy = await checkApiHealth();
  return NextResponse.json({ healthy });
}

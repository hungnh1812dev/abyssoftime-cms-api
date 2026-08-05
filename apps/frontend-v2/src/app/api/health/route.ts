import { NextResponse } from "next/server";

import { checkApiHealth } from "@/libs/health/checkApiHealth";

export async function GET() {
  const healthy = await checkApiHealth();
  return NextResponse.json({ healthy });
}

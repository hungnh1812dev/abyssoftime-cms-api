import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

async function revalidate(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const tag = searchParams.get("tag");

  if (!process.env.REVALIDATE_SECRET || token !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!tag) {
    return NextResponse.json({ error: "Missing tag" }, { status: 400 });
  }

  const tag2 = searchParams.get("tag2");
  revalidateTag(tag, "max");
  if (tag2 && tag2 !== tag) revalidateTag(tag2, "max");
  return NextResponse.json({ revalidated: true, tag, tag2: tag2 && tag2 !== tag ? tag2 : undefined });
}

export const GET = revalidate;
export const POST = revalidate;

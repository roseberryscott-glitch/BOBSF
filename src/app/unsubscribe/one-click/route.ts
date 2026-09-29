import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/lib/unsubscribe";

// One-click unsubscribe (RFC 8058), used by Gmail and Yahoo's unsubscribe button.
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  await unsubscribe(searchParams.get("token") ?? "", searchParams.get("type") ?? "");
  return new NextResponse(null, { status: 200 });
}

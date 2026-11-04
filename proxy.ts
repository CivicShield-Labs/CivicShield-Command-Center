import { NextResponse, type NextRequest } from "next/server";
import { authorizeCommandCenter } from "@/lib/command-auth";

export function proxy(request: NextRequest) {
  const unauthorized = authorizeCommandCenter(request);
  if (unauthorized) return unauthorized;

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};

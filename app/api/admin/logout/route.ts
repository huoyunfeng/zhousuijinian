import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL("/admin/login", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

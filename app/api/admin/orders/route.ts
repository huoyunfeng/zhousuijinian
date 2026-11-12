import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminGuard, apiError, apiOk } from "@/lib/api";
import { API_ERRORS, VALIDATION } from "@/lib/copy";
import { createOrder, listOrders } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) return denied;

  const status = request.nextUrl.searchParams.get("status");
  const orders = await listOrders();
  return apiOk(status ? orders.filter((order) => order.status === status) : orders);
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error(VALIDATION.missingField);
    body = parsed as Record<string, unknown>;
  } catch {
    return apiError("SCHEMA_INVALID", VALIDATION.missingField, 422);
  }

  const babyName = typeof body.babyName === "string" ? body.babyName : "";
  const birthday = typeof body.birthday === "string" ? body.birthday : "";

  try {
    const order = await createOrder({
      babyName,
      birthday,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      theme: typeof body.theme === "string" ? body.theme : undefined,
      tier: typeof body.tier === "string" ? body.tier : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      deposit: typeof body.deposit === "number" ? body.deposit : 0,
    });
    return apiOk(order, { status: 201 });
  } catch (error) {
    return apiError(
      "SCHEMA_INVALID",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      422,
    );
  }
}

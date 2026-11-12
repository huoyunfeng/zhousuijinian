import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminGuard, apiError, apiOk } from "@/lib/api";
import { API_ERRORS, VALIDATION } from "@/lib/copy";
import {
  findOrder,
  patchOrder,
  resetStoryPassword,
  saveStoryJson,
  setStoryTheme,
  type OrderPatch,
} from "@/lib/orders";
import { isOrderStatus, transitionReason } from "@/lib/orderStatus";
import { isThemeKey } from "@/lib/theme";
import { archiveOrder } from "@/lib/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) return denied;

  const { slug } = await context.params;
  const order = await findOrder(slug);
  if (!order) return apiError("NOT_FOUND", API_ERRORS.NOT_FOUND, 404);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error(VALIDATION.missingField);
    body = parsed as Record<string, unknown>;
  } catch {
    return apiError("SCHEMA_INVALID", VALIDATION.missingField, 422);
  }

  try {
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !isOrderStatus(body.status)) {
        return apiError("SCHEMA_INVALID", VALIDATION.missingField, 422);
      }
      if (body.status !== order.status) {
        const reason = transitionReason(order.status, body.status);
        if (reason) return apiError("SCHEMA_INVALID", reason, 422);
        if (body.status === "archived") {
          await archiveOrder(slug);
        } else {
          const statusPatch: OrderPatch = { status: body.status };
          // review → building 表示客户要求修改一轮（DEV_SPEC 2.2）
          if (order.status === "review" && body.status === "building") {
            statusPatch.revisions = order.revisions + 1;
          }
          await patchOrder(slug, statusPatch);
        }
      }
    }

    const patch: OrderPatch = {};
    if (typeof body.amount === "number") patch.amount = body.amount;
    if (typeof body.depositPaid === "number") patch.depositPaid = body.depositPaid;
    if (typeof body.finalPaid === "number") patch.finalPaid = body.finalPaid;
    if (typeof body.note === "string") patch.note = body.note;
    if (typeof body.contact === "string") patch.contact = body.contact;
    if (Object.keys(patch).length > 0) await patchOrder(slug, patch);

    if (body.theme !== undefined) {
      if (typeof body.theme !== "string" || !isThemeKey(body.theme)) {
        return apiError("SCHEMA_INVALID", VALIDATION.missingField, 422);
      }
      await patchOrder(slug, { theme: body.theme });
      await setStoryTheme(slug, body.theme);
    }

    if (body.password !== undefined) {
      if (typeof body.password !== "string") {
        return apiError("SCHEMA_INVALID", VALIDATION.password, 422);
      }
      await resetStoryPassword(slug, body.password);
    }

    if (body.story !== undefined) {
      await saveStoryJson(slug, body.story);
    }

    const updated = await findOrder(slug);
    return apiOk(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      const detail = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      return apiError("SCHEMA_INVALID", VALIDATION.schemaFailed, 422, detail);
    }
    return apiError(
      "SCHEMA_INVALID",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      422,
    );
  }
}

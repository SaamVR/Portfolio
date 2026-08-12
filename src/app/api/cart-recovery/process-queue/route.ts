import { NextResponse } from "next/server";
import { processDueRecoveryMessages } from "@/lib/cart-recovery/recovery-message-processor";

export const cartRecoveryProcessQueueRouteDeps = {
  getSecret: () => process.env.CART_RECOVERY_PROCESSOR_SECRET?.trim() ?? "",
};

function isAuthorized(req: Request) {
  const expected = cartRecoveryProcessQueueRouteDeps.getSecret();
  const provided = req.headers.get("x-cart-recovery-queue-secret")?.trim() ?? "";

  return Boolean(expected) && expected === provided;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body?.limit === "number" ? Math.max(1, Math.min(100, Math.round(body.limit))) : 25;
    const leaseMinutes = typeof body?.leaseMinutes === "number" ? Math.max(1, Math.min(60, Math.round(body.leaseMinutes))) : 10;

    const result = await processDueRecoveryMessages(limit, leaseMinutes);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cart recovery queue processor error:", error);
    return NextResponse.json({ error: "Failed to process cart recovery queue" }, { status: 500 });
  }
}

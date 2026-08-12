import { NextResponse } from "next/server";
import { processDueNotificationEvents } from "@/lib/notifications/notification-delivery-queue";

export const notificationProcessQueueRouteDeps = {
  getSecret: () => process.env.NOTIFICATION_PROCESSOR_SECRET?.trim() ?? "",
};

function isAuthorized(req: Request) {
  const expected = notificationProcessQueueRouteDeps.getSecret();
  const provided = req.headers.get("x-notification-queue-secret")?.trim() ?? "";

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

    const result = await processDueNotificationEvents(limit, leaseMinutes);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Notification queue processor error:", error);
    return NextResponse.json({ error: "Failed to process notification queue" }, { status: 500 });
  }
}

export type StorefrontInquiryIntent =
  | "quote"
  | "service_booking"
  | "hotel_availability"
  | "property_contact"
  | "property_visit";

export type StorefrontInquiryContext = {
  intent: StorefrontInquiryIntent;
  itemId: string;
  itemName: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
};

const inquiryIntents = new Set<StorefrontInquiryIntent>([
  "quote",
  "service_booking",
  "hotel_availability",
  "property_contact",
  "property_visit",
]);

function compactText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function normalizeDate(value: unknown) {
  const candidate = compactText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : undefined;
}

function normalizeCount(value: unknown, max: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.trunc(parsed);
  return rounded >= 1 && rounded <= max ? rounded : undefined;
}

export function buildStorefrontInquiryHref(
  contactHref: string,
  context: StorefrontInquiryContext,
) {
  const params = new URLSearchParams();
  params.set("inquiry", context.intent);
  params.set("item_id", compactText(context.itemId, 100));
  params.set("item_name", compactText(context.itemName, 160));

  if (context.intent === "hotel_availability") {
    const checkIn = normalizeDate(context.checkIn);
    const checkOut = normalizeDate(context.checkOut);
    const guests = normalizeCount(context.guests, 20);
    const rooms = normalizeCount(context.rooms, 20);
    if (checkIn) params.set("check_in", checkIn);
    if (checkOut) params.set("check_out", checkOut);
    if (guests) params.set("guests", String(guests));
    if (rooms) params.set("rooms", String(rooms));
  }

  const separator = contactHref.includes("?") ? "&" : "?";
  return `${contactHref}${separator}${params.toString()}`;
}

export function parseStorefrontInquiryContext(
  params: Pick<URLSearchParams, "get">,
): StorefrontInquiryContext | null {
  const rawIntent = compactText(params.get("inquiry"), 40) as StorefrontInquiryIntent;
  if (!inquiryIntents.has(rawIntent)) return null;

  const itemId = compactText(params.get("item_id"), 100);
  const itemName = compactText(params.get("item_name"), 160);
  if (!itemId || !itemName) return null;

  const context: StorefrontInquiryContext = {
    intent: rawIntent,
    itemId,
    itemName,
  };

  if (rawIntent === "hotel_availability") {
    context.checkIn = normalizeDate(params.get("check_in"));
    context.checkOut = normalizeDate(params.get("check_out"));
    context.guests = normalizeCount(params.get("guests"), 20);
    context.rooms = normalizeCount(params.get("rooms"), 20);
  }

  return context;
}

export function getStorefrontInquiryHeading(context: StorefrontInquiryContext) {
  switch (context.intent) {
    case "quote":
      return "Quote request";
    case "service_booking":
      return "Booking request";
    case "hotel_availability":
      return "Availability request";
    case "property_contact":
      return "Property inquiry";
    case "property_visit":
      return "Visit request";
  }
}

export function formatStorefrontInquiryMessage(context: StorefrontInquiryContext) {
  const reference = `Reference: ${context.itemId}`;

  switch (context.intent) {
    case "quote":
      return `I'm interested in a quote for ${context.itemName}.\n${reference}`;
    case "service_booking":
      return `I'd like to book ${context.itemName}. Please confirm availability and next steps.\n${reference}`;
    case "hotel_availability": {
      const details = [
        context.checkIn ? `Check-in: ${context.checkIn}` : null,
        context.checkOut ? `Check-out: ${context.checkOut}` : null,
        context.guests ? `Guests: ${context.guests}` : null,
        context.rooms ? `Rooms: ${context.rooms}` : null,
      ].filter(Boolean);
      return [
        `I'd like to check availability for ${context.itemName}.`,
        ...details,
        reference,
      ].join("\n");
    }
    case "property_contact":
      return `I'm interested in ${context.itemName} and would like more information.\n${reference}`;
    case "property_visit":
      return `I'd like to schedule a visit for ${context.itemName}. Please share available times.\n${reference}`;
  }
}

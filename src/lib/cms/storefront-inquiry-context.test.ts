import { describe, expect, it } from "@/test/test-utils";
import {
  buildStorefrontInquiryHref,
  formatStorefrontInquiryMessage,
  getStorefrontInquiryHeading,
  parseStorefrontInquiryContext,
} from "@/lib/cms/storefront-inquiry-context";

describe("storefront inquiry context", () => {
  it("preserves hotel dates, guests and rooms through the contact URL", () => {
    const href = buildStorefrontInquiryHref("/stores/demo/contact", {
      intent: "hotel_availability",
      itemId: "room-101",
      itemName: "River View Suite",
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      guests: 3,
      rooms: 2,
    });
    const url = new URL(href, "https://ezcomo.shop");
    const context = parseStorefrontInquiryContext(url.searchParams);

    expect(context?.intent).toBe("hotel_availability");
    expect(context?.itemName).toBe("River View Suite");
    expect(context?.checkIn).toBe("2026-09-10");
    expect(context?.checkOut).toBe("2026-09-12");
    expect(context?.guests).toBe(3);
    expect(context?.rooms).toBe(2);
    expect(formatStorefrontInquiryMessage(context!)).toBe(
      "I'd like to check availability for River View Suite.\nCheck-in: 2026-09-10\nCheck-out: 2026-09-12\nGuests: 3\nRooms: 2\nReference: room-101",
    );
  });

  it("keeps contact-agent and schedule-visit intents distinct for one property", () => {
    const contact = parseStorefrontInquiryContext(
      new URL(buildStorefrontInquiryHref("/contact", {
        intent: "property_contact",
        itemId: "property-7",
        itemName: "Lake Road Apartment",
      }), "https://ezcomo.shop").searchParams,
    );
    const visit = parseStorefrontInquiryContext(
      new URL(buildStorefrontInquiryHref("/contact", {
        intent: "property_visit",
        itemId: "property-7",
        itemName: "Lake Road Apartment",
      }), "https://ezcomo.shop").searchParams,
    );

    expect(getStorefrontInquiryHeading(contact!)).toBe("Property inquiry");
    expect(getStorefrontInquiryHeading(visit!)).toBe("Visit request");
    expect(formatStorefrontInquiryMessage(contact!)).toBe(
      "I'm interested in Lake Road Apartment and would like more information.\nReference: property-7",
    );
    expect(formatStorefrontInquiryMessage(visit!)).toBe(
      "I'd like to schedule a visit for Lake Road Apartment. Please share available times.\nReference: property-7",
    );
  });

  it("rejects malformed or incomplete public query data", () => {
    expect(parseStorefrontInquiryContext(new URLSearchParams("inquiry=unknown&item_id=x&item_name=Test"))).toBe(null);
    expect(parseStorefrontInquiryContext(new URLSearchParams("inquiry=quote&item_id=x"))).toBe(null);

    const context = parseStorefrontInquiryContext(new URLSearchParams(
      "inquiry=hotel_availability&item_id=x&item_name=Suite&check_in=not-a-date&guests=999&rooms=0",
    ));
    expect(context?.checkIn).toBe(undefined);
    expect(context?.guests).toBe(undefined);
    expect(context?.rooms).toBe(undefined);
  });
});

import { describe, expect, it } from "vitest";
import { getCourierBookingClaimResponse, type CourierBookingClaim } from "./route";

function claim(overrides: Partial<CourierBookingClaim> = {}): CourierBookingClaim {
  return {
    shipment_id: "shipment-1",
    status: "booking",
    claimed: false,
    attempt_token: "attempt-1",
    tracking_number: null,
    consignment_id: null,
    ...overrides,
  };
}

describe("courier booking claim handling", () => {
  it("allows exactly the newly claimed reservation to proceed to the provider", () => {
    expect(getCourierBookingClaimResponse(claim({ claimed: true }))).toBeNull();
  });

  it("reuses a durable booked shipment without another provider booking", () => {
    const result = getCourierBookingClaimResponse(claim({
      status: "booked",
      tracking_number: "TRACK-1",
      consignment_id: "CON-1",
    }));

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        reused: true,
        shipment: {
          id: "shipment-1",
          status: "booked",
          tracking_number: "TRACK-1",
          consignment_id: "CON-1",
        },
      },
    });
  });

  it("blocks a concurrent duplicate while booking is in progress", () => {
    const result = getCourierBookingClaimResponse(claim({ status: "booking" }));
    expect(result?.status).toBe(409);
    expect(result?.body.error).toMatch(/already in progress/i);
  });

  it("blocks blind retry when provider outcome requires reconciliation", () => {
    const result = getCourierBookingClaimResponse(claim({ status: "reconciliation_required" }));
    expect(result?.status).toBe(409);
    expect(result?.body.error).toMatch(/reconciliation/i);
  });

  it("requires an explicit rebook workflow after a failed or terminal local booking", () => {
    const result = getCourierBookingClaimResponse(claim({ status: "failed" }));
    expect(result?.status).toBe(409);
    expect(result?.body.error).toMatch(/explicit rebook/i);
  });
});

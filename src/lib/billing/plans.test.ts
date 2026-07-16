import { describe, expect, it } from "@/test/test-utils";
import {
  getEffectiveSubscriptionStatus,
  getRemainingTrialDays,
  isSubscriptionLive,
  resolveSignupPlanId,
} from "@/lib/billing/plans";

describe("billing plan helpers", () => {
  it("keeps a subscription in trialing while trial_ends_at is still in the future", () => {
    expect(
      getEffectiveSubscriptionStatus({
        status: "past_due",
        trial_ends_at: "2026-07-20T00:00:00.000Z",
      }, new Date("2026-07-16T00:00:00.000Z")),
    ).toBe("trialing");
  });

  it("moves an expired trial into past_due", () => {
    expect(
      getEffectiveSubscriptionStatus({
        status: "trialing",
        trial_ends_at: "2026-07-10T00:00:00.000Z",
      }, new Date("2026-07-16T00:00:00.000Z")),
    ).toBe("past_due");
    expect(
      isSubscriptionLive({
        status: "trialing",
        trial_ends_at: "2026-07-10T00:00:00.000Z",
      }, new Date("2026-07-16T00:00:00.000Z")),
    ).toBe(false);
  });

  it("returns remaining whole trial days", () => {
    expect(
      getRemainingTrialDays("2026-07-18T12:00:00.000Z", new Date("2026-07-16T12:00:00.000Z")),
    ).toBe(2);
  });

  it("skips contact-only plans during signup selection", () => {
    expect(
      resolveSignupPlanId(
        [
          { id: "basic", name: "Basic", description: null, monthly_price: 990, contact_only: false },
          { id: "pro", name: "Pro", description: null, monthly_price: 3990, contact_only: true },
        ],
        "pro",
      ),
    ).toBe("basic");
  });
});

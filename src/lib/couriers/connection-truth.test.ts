import assert from "node:assert/strict";
import { describe, it } from "@/test/test-utils";
import {
  isCourierOperationallyConfigured,
  normalizeCourierConnectionStatus,
} from "@/lib/couriers/shared";
import { pathaoCourierPlugin } from "@/lib/couriers/providers/pathao";

describe("courier connection truth", () => {
  it("requires configured operational state for booking while tolerating legacy connected during rollout", () => {
    assert.equal(normalizeCourierConnectionStatus("connected"), "configured");
    assert.equal(isCourierOperationallyConfigured("connected"), true);
    assert.equal(isCourierOperationallyConfigured("configured"), true);
    assert.equal(isCourierOperationallyConfigured("draft"), false);
    assert.equal(isCourierOperationallyConfigured("disabled"), false);
  });

  it("derives Pathao configuration from normalized persisted settings and secrets", () => {
    const publicSettings = {
      zone_label: "Dhaka",
      service_area_name: "Metro",
      pickup_contact_name: "Pickup",
      pickup_contact_phone: "01700000000",
      pickup_address: "Pickup address",
      return_contact_name: "Return",
      return_contact_phone: "01800000000",
      return_address: "Return address",
      base_url: "https://merchant.pathao.com/aladdin/api/v1",
      merchant_store_id: 123,
    };

    assert.equal(
      pathaoCourierPlugin.adapter.isConfigurationComplete?.(publicSettings, { access_token: "token" }),
      true,
    );
    assert.equal(
      pathaoCourierPlugin.adapter.isConfigurationComplete?.(publicSettings, {}),
      false,
    );
    assert.equal(pathaoCourierPlugin.adapter.verifyConnection, undefined);
  });
});

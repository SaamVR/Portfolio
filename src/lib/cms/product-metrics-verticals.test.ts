import test from "node:test";
import assert from "node:assert/strict";
import {
  getTemplateDefaultProductMetrics,
  normalizePresentationMetricSpecs,
  resolveProductMetricDefinitions,
} from "@/lib/cms/product-metrics";

test("hotel template defaults expose room fields instead of generic size and color", () => {
  const metrics = getTemplateDefaultProductMetrics("hotel");
  assert.deepEqual(metrics.map((metric) => metric.key), [
    "occupancy",
    "room_size",
    "bed_type",
    "amenities",
  ]);
});

test("real-estate template defaults expose listing fields", () => {
  const metrics = getTemplateDefaultProductMetrics("real-estate");
  assert.deepEqual(metrics.map((metric) => metric.key), [
    "address",
    "listing_type",
    "property_area",
    "bedrooms",
    "bathrooms",
  ]);
});

test("empty type schema falls back to template defaults while a real type schema still overrides", () => {
  const hotelDefaults = getTemplateDefaultProductMetrics("hotel");
  assert.deepEqual(
    resolveProductMetricDefinitions(hotelDefaults, []).map((metric) => metric.key),
    ["occupancy", "room_size", "bed_type", "amenities"],
  );

  assert.deepEqual(
    resolveProductMetricDefinitions(hotelDefaults, [{ key: "view", label: "View" }]).map((metric) => metric.key),
    ["view"],
  );
});

test("static vertical metrics become scalar presentation specs but amenities remain a list", () => {
  const normalized = normalizePresentationMetricSpecs({
    occupancy: ["3"],
    room_size: ["42 sqm"],
    bed_type: ["King"],
    amenities: ["Wi-Fi", "Breakfast"],
    address: ["Gulshan, Dhaka"],
    listing_type: ["For Rent"],
    property_area: ["1650 sqft"],
    bedrooms: ["3"],
    bathrooms: ["2"],
  });

  assert.equal(normalized.occupancy, "3");
  assert.equal(normalized.room_size, "42 sqm");
  assert.equal(normalized.bed_type, "King");
  assert.deepEqual(normalized.amenities, ["Wi-Fi", "Breakfast"]);
  assert.equal(normalized.address, "Gulshan, Dhaka");
  assert.equal(normalized.listing_type, "For Rent");
  assert.equal(normalized.property_area, "1650 sqft");
  assert.equal(normalized.bedrooms, "3");
  assert.equal(normalized.bathrooms, "2");
});

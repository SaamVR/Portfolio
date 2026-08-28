import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Product } from "@/data/products";
import { getExplicitFactNumber, getExplicitFactText, getExplicitFactValues } from "@/lib/storefront/storefront-fact-truth";

const synthetic-lookingProduct: Product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Luxury King Suite For Rent",
  price: 2500,
  image: "room.jpg",
  images: ["room.jpg"],
  description: "Prime Gulshan location. Three bedrooms. Fast delivery.",
  sizes: [],
  colors: [],
  category: "Private suite for eight guests",
  type: "Booking space",
  stock: 99,
  featured: true,
};

const cases = [
  ["duration", ["duration", "duration_minutes"]],
  ["capacity", ["capacity", "guest_capacity", "guests", "occupancy"]],
  ["turnaround", ["turnaround", "turnaround_time", "lead_time"]],
  ["bed type", ["bed_type", "bed", "bedding"]],
  ["room size", ["room_size", "room_size_sqm", "room_size_sqft"]],
  ["listing mode", ["listing_type", "listing_mode", "status"]],
  ["address", ["address", "location", "city"]],
  ["beds", ["beds", "bedrooms"]],
  ["baths", ["baths", "bathrooms"]],
  ["area", ["area_sqft", "sqft", "property_area", "area"]],
] as const;

test("service and hospitality facts are never inferred from copy, stock, type, category, or featured", () => {
  for (const [label, keys] of cases) {
    assert.equal(getExplicitFactText(synthetic-lookingProduct, [...keys]), "", label);
    assert.deepEqual(getExplicitFactValues(synthetic-lookingProduct, [...keys]), [], label);
  }
  assert.equal(getExplicitFactNumber(synthetic-lookingProduct, ["duration", "duration_minutes"]), null);
});

test("merchant metrics remain authoritative", () => {
  const configured: Product = {
    ...synthetic-lookingProduct,
    metricValues: {
      duration_minutes: ["75"],
      capacity: ["4 guests"],
      bed_type: ["Twin beds"],
      room_size: ["42 m²"],
      listing_type: ["For Rent"],
      address: ["Gulshan, Dhaka"],
      bedrooms: ["3"],
      bathrooms: ["2"],
      property_area: ["1450 sqft"],
      billing_period: ["per month"],
    },
  };
  assert.equal(getExplicitFactNumber(configured, ["duration_minutes"]), 75);
  assert.equal(getExplicitFactText(configured, ["capacity"]), "4 guests");
  assert.equal(getExplicitFactText(configured, ["bed_type"]), "Twin beds");
  assert.equal(getExplicitFactText(configured, ["room_size"]), "42 m²");
  assert.equal(getExplicitFactText(configured, ["listing_type"]), "For Rent");
  assert.equal(getExplicitFactText(configured, ["address"]), "Gulshan, Dhaka");
  assert.equal(getExplicitFactText(configured, ["billing_period"]), "per month");
});

test("preview source is optional and never consulted implicitly", () => {
  const preview = { duration_minutes: 45, capacity: "8 guests", listing_type: "For Rent" };
  assert.equal(getExplicitFactNumber(synthetic-lookingProduct, ["duration_minutes"], preview), 45);
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["capacity"], preview), "8 guests");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["listing_type"], preview), "For Rent");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["listing_type"]), "");
});

test("specialized cards contain no known synthetic-fact fallbacks", () => {
  const files = [
    "../../components/storefront/booking/BookingServiceCard.tsx",
    "../../components/storefront/service/ServiceProductCard.tsx",
    "../../components/storefront/hotel/RoomProductCard.tsx",
    "../../components/storefront/real-estate/PropertyListingCard.tsx",
  ];
  const source = files.map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(source, /4\.9|4\.8|3-5 day turnaround|5-7 day turnaround|Custom timeline available|Prime location|Guest Favorite|Top Rated/);
  assert.doesNotMatch(source, /product\.stock[^\n]*(duration|turnaround|room|area|bed|bath)|description\.split\("\."\)|includes\("suite"\)|includes\("space"\)/i);
  assert.doesNotMatch(source, /\$\{?product\.price|\/ night|\/mo/);
  assert.match(source, /isPreviewCatalogStore/);
});

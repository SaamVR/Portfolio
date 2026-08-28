import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Product } from "@/data/products";
import { getExplicitFactNumber, getExplicitFactText, getExplicitFactValues } from "@/lib/storefront/storefront-fact-truth";

const synthetic-lookingProduct: Product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Luxury King Suite For Rent Bestseller BBQ Express",
  price: 2500,
  image: "room.jpg",
  images: ["room.jpg"],
  description: "Prime Gulshan location. Three bedrooms. Fast delivery. Fresh handmade roast with warranty.",
  sizes: [],
  colors: [],
  category: "Private suite for eight guests electronics artisan food",
  type: "Booking space handmade electronics",
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
  ["preparation time", ["preparation_time", "prep_time", "fulfillment_time"]],
  ["origin", ["origin", "made_in", "location", "craft_origin"]],
  ["warranty", ["warranty", "warranty_status"]],
  ["delivery", ["delivery_time", "delivery", "fulfillment_time"]],
  ["technical specs", ["technical_specs", "specifications", "features"]],
] as const;

test("specialized storefront facts are never inferred from copy, stock, type, category, or featured", () => {
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
      preparation_time: ["20 minutes"],
      origin: ["Rajshahi"],
      warranty: ["2 years"],
      delivery_time: ["2-3 business days"],
      technical_specs: ["16 GB RAM", "512 GB SSD"],
    },
  };
  assert.equal(getExplicitFactNumber(configured, ["duration_minutes"]), 75);
  assert.equal(getExplicitFactText(configured, ["capacity"]), "4 guests");
  assert.equal(getExplicitFactText(configured, ["bed_type"]), "Twin beds");
  assert.equal(getExplicitFactText(configured, ["room_size"]), "42 m²");
  assert.equal(getExplicitFactText(configured, ["listing_type"]), "For Rent");
  assert.equal(getExplicitFactText(configured, ["address"]), "Gulshan, Dhaka");
  assert.equal(getExplicitFactText(configured, ["billing_period"]), "per month");
  assert.equal(getExplicitFactText(configured, ["preparation_time"]), "20 minutes");
  assert.equal(getExplicitFactText(configured, ["origin"]), "Rajshahi");
  assert.equal(getExplicitFactText(configured, ["warranty"]), "2 years");
  assert.equal(getExplicitFactText(configured, ["delivery_time"]), "2-3 business days");
  assert.deepEqual(getExplicitFactValues(configured, ["technical_specs"]), ["16 GB RAM", "512 GB SSD"]);
});

test("preview source is optional and never consulted implicitly", () => {
  const preview = { duration_minutes: 45, capacity: "8 guests", listing_type: "For Rent", preparation_time: "25 min", origin: "Dhaka" };
  assert.equal(getExplicitFactNumber(synthetic-lookingProduct, ["duration_minutes"], preview), 45);
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["capacity"], preview), "8 guests");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["listing_type"], preview), "For Rent");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["preparation_time"], preview), "25 min");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["origin"], preview), "Dhaka");
  assert.equal(getExplicitFactText(synthetic-lookingProduct, ["listing_type"]), "");
});

test("service and hospitality cards contain no known synthetic-fact fallbacks", () => {
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

test("catalog cards contain no fabricated merchandising or operational fallbacks", () => {
  const files = [
    "../../components/storefront/electronics/ElectronicsProductCard.tsx",
    "../../components/storefront/beauty/BeautyProductCard.tsx",
    "../../components/storefront/food/FoodMenuCard.tsx",
    "../../components/storefront/crafts/CraftProductCard.tsx",
  ];
  const source = files.map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(source, /4\.7|4\.8|4\.9|Top Rated|Bestseller|Chef Pick|Handmade|Warranty Verified|Express Delivery Available|prepared fresh|Artisan made/);
  assert.doesNotMatch(source, /15-20 min|25-35 min|30-40 min|product\.stock[^\n]*(spec|delivery|prep)|product\.featured[^\n]*(Top Rated|Bestseller|Handmade)/i);
  assert.doesNotMatch(source, /description[^\n]*(technicalSpecs|preparation|origin)|category[^\n]*Origin|type[^\n]*Origin/i);
  assert.match(source, /getExplicitFact(Text|Values)/);
});

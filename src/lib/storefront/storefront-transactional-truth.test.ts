import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getDigitalCompatibility,
  getDigitalFileSize,
  getDigitalFormats,
  getDigitalLicenses,
  getIncludedFileCount,
  getInstantDownloadInfo,
} from "@/components/storefront/digital-downloads/digital-download-utils";
import { encodeDigitalCartVariant, getCartVariantDisplayLabel, parseDigitalCartVariant } from "@/lib/digital-cart";
import {
  hasAuthoritativeDigitalDetailData,
  shouldUseTransactionalDetailVariant,
} from "@/lib/storefront/storefront-transactional-truth";
import type { Product } from "@/data/products";

const product: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Premium Photoshop Template Bundle 500 MB",
  price: 1000,
  image: "image.jpg",
  images: ["image.jpg", "image-2.jpg"],
  description: "Commercial-ready assets with instant access",
  sizes: [],
  colors: [],
  category: "Templates",
  type: "Digital",
  stock: 100,
};

test("digital facts are not inferred from product copy, stock, or image count", () => {
  assert.deepEqual(getDigitalFormats(product), []);
  assert.deepEqual(getDigitalCompatibility(product), []);
  assert.equal(getDigitalFileSize(product), "");
  assert.equal(getIncludedFileCount(product), null);
  assert.deepEqual(getDigitalLicenses(product), []);
  assert.equal(getInstantDownloadInfo(product), "");
  assert.equal(hasAuthoritativeDigitalDetailData(product), false);
});

test("merchant-configured digital metrics remain displayable without price fabrication", () => {
  const configured: Product = {
    ...product,
    metricValues: {
      formats: ["PSD", "PNG"],
      software_compatibility: ["Photoshop"],
      file_size: ["42 MB"],
      included_files: ["8"],
      licenses: ["Commercial"],
      delivery_time: ["Access after payment confirmation"],
    },
  };

  assert.deepEqual(getDigitalFormats(configured), ["PSD", "PNG"]);
  assert.deepEqual(getDigitalCompatibility(configured), ["Photoshop"]);
  assert.equal(getDigitalFileSize(configured), "42 MB");
  assert.equal(getIncludedFileCount(configured), 8);
  assert.deepEqual(getDigitalLicenses(configured).map(({ label, price }) => ({ label, price })), [{ label: "Commercial", price: 1000 }]);
  assert.equal(getInstantDownloadInfo(configured), "Access after payment confirmation");
  assert.equal(hasAuthoritativeDigitalDetailData(configured), true);
});

test("real transactional detail degrades to generic until authoritative data exists", () => {
  assert.equal(shouldUseTransactionalDetailVariant({ variant: "digital", product, storeId: product.id }), false);
  assert.equal(shouldUseTransactionalDetailVariant({ variant: "subscription", product, storeId: product.id }), false);
  assert.equal(shouldUseTransactionalDetailVariant({ variant: "digital", product, storeId: "preview-digital" }), true);
  assert.equal(shouldUseTransactionalDetailVariant({ variant: "subscription", product, storeId: "preview-subscription" }), true);
});

test("digital cart encoding has no implicit Personal license", () => {
  const encoded = encodeDigitalCartVariant({ formats: ["PSD"] });
  assert.equal(parseDigitalCartVariant(encoded)?.license, "");
  assert.equal(getCartVariantDisplayLabel(encoded), "PSD");
  assert.doesNotMatch(encoded, /personal/i);
});

test("subscription card contains no generated fallback plans or 10x yearly price", () => {
  const source = readFileSync(new URL("../../components/storefront/subscriptions/SubscriptionProductCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Individual|Family|Shared|Custom tailored access/);
  assert.doesNotMatch(source, /product\.price\s*\*\s*10/);
  assert.doesNotMatch(source, /Instant delivery|Within 30 minutes|Web & mobile supported/);
  assert.match(source, /isPreviewCatalogStore/);
  assert.doesNotMatch(source, /variantLabel \|\| "Subscription"/);
  assert.match(source, /Subscription pricing is not configured for this item yet\./);
});

test("digital card contains no implicit Personal license fallback and gates seed metadata to preview", () => {
  const source = readFileSync(new URL("../../components/storefront/digital-downloads/DigitalProductCard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\|\|\s*"Personal"|\?\?\s*"Personal"/);
  assert.match(source, /isPreviewCatalogStore/);
  assert.match(source, /trustedMetadata = isPreview \? metadata : undefined/);
});

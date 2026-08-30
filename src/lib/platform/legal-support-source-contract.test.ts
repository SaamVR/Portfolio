import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("public legal routes are versioned review disclosures instead of invented final terms", () => {
  const shared = source("../../components/platform/PublicPolicyPage.tsx");
  const policy = source("./public-policy.ts");
  const terms = source("../../app/terms/page.tsx");
  const privacy = source("../../app/privacy/page.tsx");
  const billing = source("../../app/billing-policy/page.tsx");

  assert.match(policy, /2026-08-31-review-1/);
  assert.match(policy, /Owner\/legal review pending/);
  assert.match(shared, /PUBLIC_POLICY_VERSION/);
  assert.match(shared, /PUBLIC_POLICY_REVIEW_STATUS/);
  assert.match(terms, /Legal provisions still awaiting approval/);
  assert.match(privacy, /Privacy terms still awaiting approval/);
  assert.match(billing, /loadPublicPlanCatalog/);
  assert.match(billing, /owner-review pending/i);

  const publicLegal = `${terms}\n${privacy}\n${billing}`;
  for (const unsupported of [
    "cancel anytime",
    "24/7 support",
    "refund guaranteed",
    "100% uptime",
    "SOC 2 certified",
    "GDPR compliant",
    "[Company Name]",
    "governed by the laws of Bangladesh",
  ]) {
    assert.equal(publicLegal.toLowerCase().includes(unsupported.toLowerCase()), false, `Unsupported legal claim returned: ${unsupported}`);
  }
});

test("public funnel exposes legal and support routes without reusing storefront contact", () => {
  const root = source("../../app/page.tsx");
  const links = source("../../components/platform/PublicTrustLinks.tsx");
  const plans = source("../../app/plans/page.tsx");
  const signup = source("../../app/signup/page.tsx");
  const supportHelper = source("./support.ts");

  assert.match(root, /PublicTrustLinks/);
  for (const path of ["/terms", "/privacy", "/billing-policy", "/support"]) {
    assert.equal(links.includes(`href=\"${path}\"`), true, `Missing public trust link ${path}`);
  }
  assert.match(plans, /href="\/billing-policy"/);
  assert.match(plans, /href="\/support"/);
  assert.match(signup, /href="\/terms"/);
  assert.match(signup, /href="\/privacy"/);
  assert.match(supportHelper, /\?\? "\/support"/);
  assert.doesNotMatch(supportHelper, /\?\? "\/contact"/);
});

test("platform support intake is abuse-bounded and lands in platform incidents", () => {
  const route = source("../../app/api/platform/support/route.ts");
  const page = source("../../app/support/page.tsx");
  const storefrontContact = source("../../app/api/contact/route.ts");

  assert.match(route, /supportSchema\.safeParse/);
  assert.match(route, /website/);
  assert.match(route, /rateLimit/);
  assert.match(route, /hashSupportLimiterValue/);
  assert.match(route, /recordPlatformIncident/);
  assert.match(route, /source: "public_support"/);
  assert.match(route, /randomUUID/);
  assert.doesNotMatch(route, /contact_messages/);
  assert.match(page, /does not replace a merchant storefront/);

  assert.match(storefrontContact, /storeId: z\.string\(\)\.uuid\(\)/);
  assert.match(storefrontContact, /from\("contact_messages"\)/);
});

test("owner review remains an explicit release gate", () => {
  const checklist = source("../../../docs/legal/public-policy-owner-review-2026-08-31.md");
  assert.match(checklist, /PENDING — blocks paid-beta legal sign-off/);
  assert.match(checklist, /legal\/operator entity/);
  assert.match(checklist, /refund eligibility/);
  assert.match(checklist, /data-retention/);
  assert.match(checklist, /final binding signup consent mechanism/);
});

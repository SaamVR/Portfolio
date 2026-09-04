import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const publicSources = [
  source("../../app/page.tsx"),
  source("../../app/plans/page.tsx"),
  source("../../app/how-it-works/page.tsx"),
  source("../../app/platform-faq/page.tsx"),
  source("../../app/stories/page.tsx"),
  source("../../components/marketing/CommercialTruthLandingPage.tsx"),
  source("../../components/marketing/CmsPricing.tsx"),
];

const joinedPublicSources = publicSources.join("\n");

test("platform root and plans SSR start from the authoritative public plan catalog", () => {
  const root = source("../../app/page.tsx");
  const plans = source("../../app/plans/page.tsx");

  assert.match(root, /await loadPublicPlanCatalog\(\)/);
  assert.match(root, /CommercialTruthLandingPage planCatalog=\{planCatalog\}/);
  assert.doesNotMatch(root, /SleekBentoLandingPage/);

  assert.match(plans, /loadPublicPlanCatalog\(\)/);
  assert.match(plans, /CmsPricing planCatalog=\{planCatalog\}/);
  assert.doesNotMatch(plans, /"use client"/);
});

test("public pricing derives mutable commercial fields from live plan records", () => {
  const pricing = source("../../components/marketing/CmsPricing.tsx");

  assert.match(pricing, /plan\.name/);
  assert.match(pricing, /plan\.description/);
  assert.match(pricing, /plan\.trial_days/);
  assert.match(pricing, /plan\.store_limit/);
  assert.match(pricing, /isContactOnlyPlan\(plan\)/);
  assert.match(pricing, /formatPlanPrice\(plan, billingInterval\)/);
  assert.doesNotMatch(pricing, /marketingPlans/);
  assert.doesNotMatch(pricing, /No credit card required/);
});

test("public sell-ready surfaces do not publish unsupported numeric or fictional proof claims", () => {
  const banned = [
    /<\s*300ms/i,
    /within a day/i,
    /24\/7 support/i,
    /24\/7 platform monitoring/i,
    /0% transaction fee/i,
    /Merchant proof/i,
    /Tariq Ahmed/i,
    /Nusrat Jahan/i,
    /Rahim Chowdhury/i,
    /Sarah Islam/i,
  ];

  for (const pattern of banned) {
    assert.doesNotMatch(joinedPublicSources, pattern);
  }
});

test("stories are explicitly examples and contain no rating or portrait testimonial UI", () => {
  const stories = source("../../app/stories/page.tsx");
  assert.match(stories, /Illustrative examples — not testimonials/);
  assert.doesNotMatch(stories, /Star/);
  assert.doesNotMatch(stories, /next\/image/);
});

test("provider copy preserves configured-versus-verified semantics", () => {
  const home = source("../../components/marketing/CommercialTruthLandingPage.tsx");
  const workflow = source("../../app/how-it-works/page.tsx");
  const faq = source("../../app/platform-faq/page.tsx");
  const providerCopy = `${home}\n${workflow}\n${faq}`;

  assert.match(providerCopy, /not configured/i);
  assert.match(providerCopy, /configured/i);
  assert.match(providerCopy, /verified/i);
  assert.match(providerCopy, /needs?-attention|attention-needed|needs attention/i);
  assert.doesNotMatch(providerCopy, /supported out of box/i);
  assert.doesNotMatch(providerCopy, /verified instantly/i);
  assert.doesNotMatch(providerCopy, /automatic pickup/i);
});

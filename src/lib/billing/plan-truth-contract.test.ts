import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

describe("plan commercial truth contract", () => {
  it("keeps numeric paid-plan fallbacks out of marketing and signup UI", () => {
    const files = [
      "../../components/marketing/CmsPricing.tsx",
      "../../views/MerchantSignupV3.tsx",
    ];
    const source = files.map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
    expect(source).not.toMatch(/\b(990|1490|3990)\b/);
    expect(source).not.toMatch(/BDT\s+(990|1,490|3,990)/);
    expect(source).not.toContain("Save 20%");
    expect(source).toContain("usePublicPlanCatalog");
  });
});

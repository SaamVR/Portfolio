import { describe, expect, it } from "@/test/test-utils";
import {
  getDomainPair,
  getRoutingDnsRecordName,
  normalizeDomainInput,
} from "@/lib/domains";

describe("custom domain helpers", () => {
  it("normalizes an apex vanity domain without forcing www", () => {
    const domain = normalizeDomainInput(" https://ShopBrand.COM/catalog ");

    expect(domain.hostname).toBe("shopbrand.com");
    expect(domain.apexDomain).toBe("shopbrand.com");
    expect(domain.isApexDomain).toBe(true);
    expect(domain.isWwwDomain).toBe(false);
    expect(getRoutingDnsRecordName(domain)).toBe("@");
  });

  it("preserves an explicitly requested www hostname as the single canonical host", () => {
    const domain = normalizeDomainInput("www.shopbrand.com");
    const pair = getDomainPair(domain);

    expect(domain.hostname).toBe("www.shopbrand.com");
    expect(getRoutingDnsRecordName(domain)).toBe("www");
    expect(pair.defaultPrimaryHostname).toBe("www.shopbrand.com");
    expect(pair.redirectHostname).toBeNull();
  });

  it("builds the correct relative DNS name for multi-label public suffixes", () => {
    expect(getRoutingDnsRecordName("brand.com.bd")).toBe("@");
    expect(getRoutingDnsRecordName("www.brand.com.bd")).toBe("www");
    expect(getRoutingDnsRecordName("shop.eu.brand.com.bd")).toBe("shop.eu");
  });

  it("keeps an apex request canonical instead of silently preferring www", () => {
    const pair = getDomainPair("brand.store");
    expect(pair.defaultPrimaryHostname).toBe("brand.store");
    expect(pair.wwwHostname).toBe("www.brand.store");
    expect(pair.redirectHostname).toBeNull();
  });
});
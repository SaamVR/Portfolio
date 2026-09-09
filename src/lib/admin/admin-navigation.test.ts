import { describe, expect, it } from "@/test/test-utils";
import { getAdminNavigationItems, getAdminNavigationSections } from "@/lib/admin/admin-navigation";

const context = {
  activeStoreId: "store-123",
  cmsEnabled: true,
  advancedEditingEnabled: true,
  backupEnabled: true,
  mediaEnabled: true,
  isAdmin: true,
  isOwner: true,
  isPlatformAdmin: false,
  compact: false,
  unreadCount: 2,
  pendingReviewsCount: 1,
  supportUrl: "/contact",
  supportIsExternal: false,
};

describe("admin navigation information architecture", () => {
  it("groups global destinations around merchant jobs", () => {
    const sections = getAdminNavigationSections(context);

    expect(sections.map((section) => section.title)).toEqual(["Operate", "Grow", "Build", "Manage", "Help"]);
    expect(sections.map((section) => section.links.map((link) => link.label))).toEqual([
      ["Dashboard", "Orders", "Products", "Customers"],
      ["Marketing", "Analytics"],
      ["Online Store"],
      ["Settings"],
      ["How-To Guide", "Help & Support"],
    ]);
  });

  it("keeps deeper tools reachable without putting them in global navigation", () => {
    const items = getAdminNavigationItems(context);
    const globalLabels = getAdminNavigationSections(context).flatMap((section) => section.links.map((link) => link.label));

    for (const label of ["Blog", "Blog Performance", "Website editor", "Onboarding", "Billing & Plans"]) {
      expect(items.find((item) => item.label === label)?.show).toBe(true);
      expect(items.find((item) => item.label === label)?.section).toBe("contextual");
      expect(globalLabels).not.toContain(label);
    }
  });

  it("keeps customer attention badges on the single Customers destination", () => {
    const customers = getAdminNavigationItems(context).find((item) => item.label === "Customers");

    expect(customers?.badge).toBe(3);
    expect(customers?.match).toEqual(["/admin/customers", "/admin/messages", "/admin/reviews"]);
  });
});

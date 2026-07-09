export interface StoreReadinessItem {
  label: string;
  done: boolean;
  points: number;
  action: string;
  href: string;
}

export interface StoreReadinessState {
  score: number;
  items: StoreReadinessItem[];
}

export interface StoreReadinessInput {
  storePublished: boolean;
  storeDescription: string;
  logoConfigured: boolean;
  productTotal: number;
  featuredTotal: number;
  paymentConfigured: boolean;
  contactConfigured: boolean;
  customPageTotal: number;
  visibleHomepageBlocks: number;
}

export function buildStoreReadinessScore({
  storePublished,
  storeDescription,
  logoConfigured,
  productTotal,
  featuredTotal,
  paymentConfigured,
  contactConfigured,
  customPageTotal,
  visibleHomepageBlocks,
}: StoreReadinessInput): StoreReadinessState {
  const items: StoreReadinessItem[] = [
    {
      label: "Store is published",
      done: storePublished,
      points: 15,
      action: "Publish your storefront so customers can access it.",
      href: "/admin/onboarding",
    },
    {
      label: "Store description is written",
      done: storeDescription.trim().length >= 40,
      points: 10,
      action: "Add a clearer store description to improve trust and SEO.",
      href: "/admin/onboarding",
    },
    {
      label: "Logo is uploaded",
      done: logoConfigured,
      points: 10,
      action: "Upload a store logo so the storefront and receipts feel branded.",
      href: "/admin/onboarding",
    },
    {
      label: "At least 5 products added",
      done: productTotal >= 5,
      points: 15,
      action: "Add more products so the store feels worth browsing.",
      href: "/admin/products",
    },
    {
      label: "Featured products selected",
      done: featuredTotal >= 1,
      points: 10,
      action: "Mark one or more products as featured for the homepage.",
      href: "/admin/products",
    },
    {
      label: "Payment method configured",
      done: paymentConfigured,
      points: 10,
      action: "Set up bKash, Nagad, or COD so buyers can complete checkout.",
      href: "/admin/site-settings?tab=payment",
    },
    {
      label: "Customer contact is configured",
      done: contactConfigured,
      points: 10,
      action: "Add contact or WhatsApp details so customers can reach you.",
      href: "/admin/site-settings?tab=contact",
    },
    {
      label: "Homepage has enough live sections",
      done: visibleHomepageBlocks >= 3,
      points: 10,
      action: "Add or unhide more homepage sections in the CMS builder.",
      href: "/admin/cms",
    },
    {
      label: "Information page is added",
      done: customPageTotal >= 1,
      points: 10,
      action: "Create at least one page like About, Contact, Returns, or Policy.",
      href: "/admin/cms",
    },
  ];

  return {
    score: items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0),
    items,
  };
}

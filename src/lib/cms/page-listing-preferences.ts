import type { Store, StorePage } from "@/lib/cms/schema";

const PAGE_LISTING_PREFERENCES_KEY = "page_listing_preferences";

export type PageListingPreference = {
  showInNavbar?: boolean;
  navbarLabel?: string;
  navbarGroup?: string;
  showInFooter?: boolean;
  footerSection?: "company" | "extra";
  footerLabel?: string;
};

export type PageListingPreferences = Record<string, PageListingPreference>;

export type AutoNavItem = {
  label: string;
  url: string;
  children?: Array<{ label: string; url: string }>;
};

type FooterLink = {
  label: string;
  url: string;
};

function normalizePageListingPreferences(value: unknown): PageListingPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as PageListingPreferences;
}

function getPageListingPreference(store: Store | null | undefined, page: Pick<StorePage, "slug"> | null | undefined): PageListingPreference {
  if (!store || !page) return {};
  const preferences = normalizePageListingPreferences(store.siteSettings?.[PAGE_LISTING_PREFERENCES_KEY]);
  return preferences[page.slug] ?? {};
}

function updatePageListingPreference(
  store: Store,
  pageSlug: string,
  patch: Partial<PageListingPreference>,
): Store {
  const preferences = normalizePageListingPreferences(store.siteSettings?.[PAGE_LISTING_PREFERENCES_KEY]);
  const nextPreferences: PageListingPreferences = {
    ...preferences,
    [pageSlug]: {
      ...(preferences[pageSlug] ?? {}),
      ...patch,
    },
  };

  return {
    ...store,
    siteSettings: {
      ...(store.siteSettings ?? {}),
      [PAGE_LISTING_PREFERENCES_KEY]: nextPreferences,
    },
  };
}

export function buildAutoNavbarItems(store: Store | null | undefined): AutoNavItem[] {
  if (!store) return [];

  const preferences = normalizePageListingPreferences(store.siteSettings?.[PAGE_LISTING_PREFERENCES_KEY]);
  const eligiblePages = store.pages.filter((page) => {
    const preference = preferences[page.slug];
    return Boolean(preference?.showInNavbar) && page.slug !== "/";
  });

  const grouped = new Map<string, Array<{ label: string; url: string }>>();
  const direct: AutoNavItem[] = [];

  for (const page of eligiblePages) {
    const preference = preferences[page.slug] ?? {};
    const label = preference.navbarLabel?.trim() || page.title;
    const url = page.slug;
    const group = preference.navbarGroup?.trim();

    if (group) {
      const current = grouped.get(group) ?? [];
      current.push({ label, url });
      grouped.set(group, current);
      continue;
    }

    direct.push({ label, url });
  }

  const groupedItems = Array.from(grouped.entries()).map(([group, children]) => (
    children.length === 1
      ? { label: children[0].label, url: children[0].url }
      : {
          label: group,
          url: children[0]?.url ?? "/",
          children: children.sort((left, right) => left.label.localeCompare(right.label)),
        }
  ));

  return [...direct, ...groupedItems].sort((left, right) => left.label.localeCompare(right.label));
}

export function buildAutoFooterLinks(store: Store | null | undefined): {
  company: FooterLink[];
  extra: FooterLink[];
} {
  if (!store) {
    return { company: [], extra: [] };
  }

  const preferences = normalizePageListingPreferences(store.siteSettings?.[PAGE_LISTING_PREFERENCES_KEY]);
  const company: FooterLink[] = [];
  const extra: FooterLink[] = [];

  for (const page of store.pages) {
    if (page.slug === "/") continue;
    const preference = preferences[page.slug];
    if (!preference?.showInFooter) continue;

    const link = {
      label: preference.footerLabel?.trim() || page.title,
      url: page.slug,
    };

    if (preference.footerSection === "extra") {
      extra.push(link);
    } else {
      company.push(link);
    }
  }

  return {
    company: company.sort((left, right) => left.label.localeCompare(right.label)),
    extra: extra.sort((left, right) => left.label.localeCompare(right.label)),
  };
}

"use client";

import { useMemo, useState } from "react";
import { PropertySearchBar, type PropertyFilterState } from "@/components/storefront/real-estate/PropertySearchBar";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { storefrontPath } from "@/lib/slug";

const initialFilters: PropertyFilterState = {
  listingMode: "buy",
  location: "",
  propertyType: "all",
  minPrice: "",
  maxPrice: "",
  beds: "any",
  baths: "any",
};

function readSpecString(specs: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function RealEstatePropertySearchSection() {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const { data: catalogMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", store?.id);
  const [filters, setFilters] = useState<PropertyFilterState>(initialFilters);

  const propertyTypes = useMemo(() => {
    const values = products.flatMap((product) => {
      const specs = catalogMetadata?.products?.[product.id]?.specs as Record<string, unknown> | undefined;
      const explicitType = readSpecString(specs, "property_type");
      return [explicitType, product.type, product.category].filter((value): value is string => Boolean(value?.trim()));
    });
    return Array.from(new Set(values)).slice(0, 20);
  }, [catalogMetadata, products]);

  const submit = () => {
    const params = new URLSearchParams();
    if (filters.listingMode === "buy") params.set("listing_type", "sale");
    if (filters.listingMode === "rent") params.set("listing_type", "rent");
    if (filters.listingMode === "sold") params.set("listing_type", "sold");
    if (filters.location.trim()) params.set("location", filters.location.trim());
    if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
    if (filters.minPrice.trim()) params.set("min", filters.minPrice.trim());
    if (filters.maxPrice.trim()) params.set("max", filters.maxPrice.trim());
    if (filters.beds !== "any") params.set("bedrooms", filters.beds);
    if (filters.baths !== "any") params.set("bathrooms", filters.baths);

    const query = params.toString();
    const target = storefrontPath(`/shop${query ? `?${query}` : ""}`, store?.slug);
    window.location.assign(target);
  };

  return (
    <section className="relative z-20 -mt-5 pb-6 md:-mt-8 md:pb-10" aria-label="Property search">
      <div className="container mx-auto px-4">
        <PropertySearchBar
          filters={filters}
          propertyTypes={propertyTypes}
          onChange={setFilters}
          onSubmit={submit}
        />
      </div>
    </section>
  );
}

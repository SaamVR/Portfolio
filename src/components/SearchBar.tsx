import { useState, useEffect, useCallback, useId, useRef } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { ArrowRight, Clock, Search, SearchX, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useProductCategories } from "@/hooks/useProductCategories";
import { Badge } from "@/components/ui/badge";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { productUrl, storefrontPath } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

interface SearchBarProps {
  className?: string;
  onClose?: () => void;
  expanded?: boolean;
}

type BrowseChip = {
  label: string;
  value: string;
  kind: "type" | "category";
};

const MAX_HISTORY = 5;
const MAX_BROWSE_CHIPS = 6;

function getSearchHistory(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(storageKey: string, query: string) {
  const history = getSearchHistory(storageKey).filter((h) => h !== query);
  history.unshift(query);
  localStorage.setItem(storageKey, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function removeHistoryItem(storageKey: string, query: string) {
  const history = getSearchHistory(storageKey).filter((h) => h !== query);
  localStorage.setItem(storageKey, JSON.stringify(history));
}

const SearchBar = ({ className, onClose, expanded = true }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const currentStore = useOptionalStore();
  const { trackEvent } = useStorefrontAnalytics();
  const storeId = currentStore?.id;
  const historyKey = getScopedStorefrontStorageKey("search-history", storeId);
  const [history, setHistory] = useState<string[]>(() => getSearchHistory(historyKey));
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const statusId = useId();

  const { data: products = [] } = useProducts(storeId);
  const { data: searchResults = null } = useProductSearch({
    query: debouncedQuery,
    perPage: 6,
  }, storeId);
  const { data: dynamicProductTypes = [] } = useProductTypes(storeId);
  const { data: dynamicProductCategories = [] } = useProductCategories(storeId);

  const browseChips: BrowseChip[] = [
    ...dynamicProductCategories.slice(0, 3).map((category: any) => ({
      label: category.name,
      value: category.name,
      kind: "category" as const,
    })),
    ...dynamicProductTypes.slice(0, 3).map((type: any) => ({
      label: type.name,
      value: type.name,
      kind: "type" as const,
    })),
  ]
    .filter((chip, index, chips) => chip.label && chips.findIndex((candidate) => candidate.label.toLowerCase() === chip.label.toLowerCase()) === index)
    .slice(0, MAX_BROWSE_CHIPS);

  useEffect(() => {
    setHistory(getSearchHistory(historyKey));
  }, [historyKey]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  const filtered = debouncedQuery.trim()
    ? (searchResults ?? products
        .filter((p) => {
          const q = debouncedQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.type.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }))
        .slice(0, 6)
    : [];

  const isEmptyState = query.trim() === "";
  const hasContent = !isEmptyState ? true : history.length > 0 || browseChips.length > 0;
  const showDropdown = open && hasContent;
  const suggestionListOpen = showDropdown && !isEmptyState && filtered.length > 0;
  const resultStatus = debouncedQuery.trim()
    ? filtered.length > 0
      ? `${filtered.length} search suggestion${filtered.length === 1 ? "" : "s"} available.`
      : `No search suggestions found for ${debouncedQuery.trim()}.`
    : "";

  const closeSearch = useCallback(() => {
    setOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  }, [onClose]);

  const goToSearchResults = useCallback((searchTerm: string, source: string) => {
    const cleanQuery = searchTerm.trim();
    if (!cleanQuery) return;
    saveSearchHistory(historyKey, cleanQuery);
    setHistory(getSearchHistory(historyKey));
    trackEvent({
      eventName: "search",
      eventCategory: "discovery",
      searchQuery: cleanQuery,
      metadata: {
        resultsCount: filtered.length,
        source,
      },
    });
    navigate(storefrontPath(`/shop?q=${encodeURIComponent(cleanQuery)}`, currentStore?.slug));
    setQuery("");
    setDebouncedQuery("");
    closeSearch();
  }, [closeSearch, currentStore?.slug, filtered.length, historyKey, navigate, trackEvent]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    goToSearchResults(query, "search_bar_submit");
  }, [goToSearchResults, query]);

  const handleSelect = (product: { id: string; name: string }) => {
    if (query.trim()) {
      trackEvent({
        eventName: "search_result_click",
        eventCategory: "discovery",
        searchQuery: query.trim(),
        productId: product.id,
        metadata: {
          productName: product.name,
          source: "search_bar_results",
        },
      });
      saveSearchHistory(historyKey, query.trim());
      setHistory(getSearchHistory(historyKey));
    }
    navigate(productUrl(product.id, product.name, currentStore?.slug));
    setQuery("");
    setDebouncedQuery("");
    closeSearch();
  };

  const handleBrowseChipClick = (chip: BrowseChip) => {
    trackEvent({
      eventName: "tag_click",
      eventCategory: "discovery",
      searchQuery: query.trim() || undefined,
      metadata: {
        tag: chip.value,
        tagType: chip.kind === "type" ? "product_type" : "category",
        source: "search_bar_chip",
      },
    });
    navigate(
      storefrontPath(
        chip.kind === "type"
          ? `/shop?type=${encodeURIComponent(chip.value)}`
          : `/shop?category=${encodeURIComponent(chip.value)}`,
        currentStore?.slug,
      ),
    );
    setQuery("");
    setDebouncedQuery("");
    closeSearch();
  };

  const handleHistoryClick = (term: string) => {
    goToSearchResults(term, "search_history");
  };

  const handleRemoveHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeHistoryItem(historyKey, term);
    setHistory(getSearchHistory(historyKey));
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  if (!expanded) return null;

  return (
    <>
      {showDropdown && (
        <div
          className="fixed inset-0 z-[40] bg-background/75 backdrop-blur-sm transition-opacity motion-reduce:transition-none"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div ref={containerRef} className={cn("relative z-[50]", className)}>
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search products"
          className="relative flex items-center"
        >
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            suppressHydrationWarning
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
              setOpen(true);
            }}
            onFocus={() => {
              setHistory(getSearchHistory(historyKey));
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, categories, or types"
            className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-12 text-sm font-medium text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/20"
            role="combobox"
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={suggestionListOpen}
            aria-controls={suggestionListOpen ? listboxId : undefined}
            aria-describedby={statusId}
            aria-activedescendant={selectedIndex >= 0 && filtered[selectedIndex] ? `${listboxId}-option-${filtered[selectedIndex].id}` : undefined}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-0 flex h-12 w-12 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div id={statusId} className="sr-only" aria-live="polite" aria-atomic="true">
          {resultStatus}
        </div>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,34rem)] overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[0_24px_80px_-36px_rgba(15,23,42,0.75)] animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none">
            {!isEmptyState && filtered.length === 0 && (
              <div className="flex flex-col items-start gap-2 rounded-xl px-4 py-5 text-muted-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <SearchX className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="font-semibold text-foreground">No direct matches</p>
                <p className="text-sm leading-6">Try a product name, category, type, or a shorter search phrase.</p>
                <button
                  type="button"
                  onClick={() => goToSearchResults(query, "search_bar_no_suggestion")}
                  className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/5"
                >
                  Search the full catalog
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {filtered.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Suggested products</p>
                  <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
                </div>
                <div id={listboxId} className="space-y-1" role="listbox" aria-label="Search suggestions">
                  {filtered.map((product, index) => (
                    <button
                      key={product.id}
                      id={`${listboxId}-option-${product.id}`}
                      role="option"
                      aria-selected={index === selectedIndex}
                      onClick={() => handleSelect(product)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
                        index === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <SafeStorefrontImage
                        src={product.image}
                        alt=""
                        width={48}
                        height={48}
                        sizes="48px"
                        className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-semibold">{product.name}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          {product.type ? (
                            <Badge variant="secondary" className="max-w-[9rem] truncate px-1.5 py-0 text-[10px]">
                              {product.type}
                            </Badge>
                          ) : null}
                          <span className="shrink-0 text-xs font-semibold text-foreground">
                            BDT {product.price.toLocaleString("en-BD")}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToSearchResults(query, "search_bar_view_all")}
                  className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                >
                  <span className="truncate">View all results for “{query.trim()}”</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </>
            )}

            {isEmptyState && (
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {history.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-background/60 p-1">
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent searches</p>
                    {history.map((term) => (
                      <div key={term} className="flex min-h-11 items-center gap-1 rounded-lg hover:bg-accent hover:text-accent-foreground">
                        <button
                          type="button"
                          onClick={() => handleHistoryClick(term)}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                        >
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1 truncate text-sm">{term}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistory(e, term)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                          aria-label={`Remove ${term} from history`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {browseChips.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Browse the catalog</p>
                    <div className="flex flex-wrap gap-2">
                      {browseChips.map((chip) => (
                        <button
                          key={`${chip.kind}-${chip.value}`}
                          type="button"
                          onClick={() => handleBrowseChipClick(chip)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-secondary/65 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/45 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                        >
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SearchBar;

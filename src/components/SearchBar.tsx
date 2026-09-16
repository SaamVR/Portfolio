import { useState, useEffect, useCallback, useId, useRef } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { Search, X, SearchX, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useProductTypes } from "@/hooks/useProductTypes";
import { Badge } from "@/components/ui/badge";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import { storefrontPath } from "@/lib/slug";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";

interface SearchBarProps {
  className?: string;
  onClose?: () => void;
  expanded?: boolean;
}

const MAX_HISTORY = 5;

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
  const searchId = useId();
  const popupId = `store-search-popup-${searchId}`;
  const listboxId = `store-search-listbox-${searchId}`;

  const { data: products = [] } = useProducts(storeId);
  const { data: searchResults = null } = useProductSearch({
    query: debouncedQuery,
    perPage: 6,
  }, storeId);
  const { data: dynamicProductTypes = [] } = useProductTypes(storeId);
  const categoryChips = dynamicProductTypes.length > 0
    ? dynamicProductTypes.slice(0, 6).map((type: any) => ({
        label: type.name,
        value: type.name,
      }))
    : [
        { label: "Collections", value: "collections" },
        { label: "Popular", value: "popular" },
        { label: "New Arrivals", value: "new" },
      ];

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
        setSelectedIndex(-1);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
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

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(-1);
    }
  }, [filtered.length, selectedIndex]);

  const isEmptyState = query.trim() === "";
  const hasContent = !isEmptyState ? true : history.length > 0 || categoryChips.length > 0;
  const activeOptionId = selectedIndex >= 0 && filtered[selectedIndex]
    ? `${listboxId}-option-${selectedIndex}`
    : undefined;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        const cleanQuery = query.trim();
        saveSearchHistory(historyKey, cleanQuery);
        setHistory(getSearchHistory(historyKey));
        trackEvent({
          eventName: "search",
          eventCategory: "discovery",
          searchQuery: cleanQuery,
          metadata: {
            resultsCount: filtered.length,
            source: "search_bar_submit",
          },
        });
        navigate(storefrontPath(`/shop?q=${encodeURIComponent(cleanQuery)}`, currentStore?.slug));
        setQuery("");
        setOpen(false);
        setSelectedIndex(-1);
        onClose?.();
      }
    },
    [currentStore?.slug, filtered.length, historyKey, navigate, onClose, query, trackEvent],
  );

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
    setOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  };

  const handleCategoryClick = (typeValue: string) => {
    const isDynamicProductType = dynamicProductTypes.some((type: any) => type.name === typeValue);
    trackEvent({
      eventName: "tag_click",
      eventCategory: "discovery",
      searchQuery: query.trim() || undefined,
      metadata: {
        tag: typeValue,
        tagType: isDynamicProductType ? "product_type" : "category",
        source: "search_bar_chip",
      },
    });
    navigate(
      storefrontPath(
        isDynamicProductType
          ? `/shop?type=${encodeURIComponent(typeValue)}`
          : `/shop?category=${encodeURIComponent(typeValue)}`,
        currentStore?.slug,
      ),
    );
    setQuery("");
    setOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  };

  const handleHistoryClick = (term: string) => {
    trackEvent({
      eventName: "search",
      eventCategory: "discovery",
      searchQuery: term,
      metadata: {
        source: "search_history",
      },
    });
    navigate(storefrontPath(`/shop?q=${encodeURIComponent(term)}`, currentStore?.slug));
    setQuery("");
    setOpen(false);
    setSelectedIndex(-1);
    onClose?.();
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
    if (e.key === "Escape") {
      // Prevent the native <input type="search"> Escape behavior from clearing
      // the value and firing onChange, which would immediately reopen the popup.
      e.preventDefault();
      setOpen(false);
      setSelectedIndex(-1);
      return;
    }

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

  const showDropdown = open && hasContent;
  const controlledPopupId = filtered.length > 0 ? listboxId : popupId;
  const resultStatus = query.trim()
    ? filtered.length > 0
      ? `${filtered.length} search results available.`
      : "No search results available."
    : "";

  return (
    <>
      {showDropdown && (
        <div
          className="fixed inset-0 z-[40] bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={() => {
            setOpen(false);
            setSelectedIndex(-1);
          }}
        />
      )}
      <div ref={containerRef} className={cn("relative z-[50]", className)}>
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search products"
          className="relative flex items-center"
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
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
            placeholder="Search products..."
            className="h-9 w-full rounded-md border border-border bg-secondary pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search products"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={showDropdown ? controlledPopupId : undefined}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {resultStatus}
          </span>
        </form>

        {showDropdown && (
          <div
            id={popupId}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {!isEmptyState && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <SearchX className="h-8 w-8 opacity-40" />
                <p className="text-sm">No items found</p>
                <p className="text-xs">Try a product name, category, or type.</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div id={listboxId} className="p-1" role="listbox" aria-label="Product search results">
                {filtered.map((product, index) => (
                  <button
                    key={product.id}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => handleSelect(product)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <SafeStorefrontImage
                      src={product.image}
                      alt={product.name}
                      width={40}
                      height={40}
                      sizes="40px"
                      className="h-10 w-10 rounded-md border border-border object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {product.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          BDT {product.price.toLocaleString("en-BD")}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isEmptyState && (
              <>
                {history.length > 0 && (
                  <div className="p-1">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recent Searches</p>
                    {history.map((term) => (
                      <div key={term} className="flex items-center rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                        <button
                          type="button"
                          onClick={() => handleHistoryClick(term)}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm">{term}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistory(e, term)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove ${term} from history`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {history.length > 0 && <div className="mx-1 h-px bg-border" />}
                <div className="p-1">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Browse Categories</p>
                  <div className="flex flex-wrap gap-1.5 px-2 py-2">
                    {categoryChips.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleCategoryClick(cat.value)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Tag className="h-3 w-3" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SearchBar;

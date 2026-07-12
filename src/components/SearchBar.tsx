import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { Search, X, SearchX, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useProductTypes } from "@/hooks/useProductTypes";
import { Badge } from "@/components/ui/badge";
import { productUrl } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
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
  const storeId = currentStore?.id;
  const historyKey = getScopedStorefrontStorageKey("threadbd-search-history", storeId);
  const [history, setHistory] = useState<string[]>(() => getSearchHistory(historyKey));
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useProducts(storeId);
  const { data: dynamicProductTypes = [] } = useProductTypes(storeId);
  const categoryChips = dynamicProductTypes.length > 0
    ? dynamicProductTypes.slice(0, 6).map((type: any) => ({
        label: type.name,
        value: type.name,
      }))
    : [
        { label: "Featured", value: "featured" },
        { label: "New Arrivals", value: "new-arrivals" },
        { label: "Best Sellers", value: "best-sellers" },
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
    ? products
        .filter((p) => {
          const q = debouncedQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.type.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  const isEmptyState = query.trim() === "";
  const hasContent = !isEmptyState ? true : history.length > 0 || categoryChips.length > 0;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        saveSearchHistory(historyKey, query.trim());
        setHistory(getSearchHistory(historyKey));
        navigate(storefrontPath(`/shop?q=${encodeURIComponent(query.trim())}`, currentStore?.slug));
        setQuery("");
        setOpen(false);
        onClose?.();
      }
    },
    [currentStore?.slug, historyKey, navigate, onClose, query]
  );

  const handleSelect = (product: { id: string; name: string }) => {
    if (query.trim()) {
      saveSearchHistory(historyKey, query.trim());
      setHistory(getSearchHistory(historyKey));
    }
    navigate(productUrl(product.id, product.name, currentStore?.slug));
    setQuery("");
    setOpen(false);
    onClose?.();
  };

  const handleCategoryClick = (typeValue: string) => {
    const isDynamicProductType = dynamicProductTypes.some((type: any) => type.name === typeValue);
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
    onClose?.();
  };

  const handleHistoryClick = (term: string) => {
    navigate(storefrontPath(`/shop?q=${encodeURIComponent(term)}`, currentStore?.slug));
    setQuery("");
    setOpen(false);
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

  const showDropdown = open && hasContent;

  return (
    <>
      {showDropdown && (
        <div 
          className="fixed inset-0 z-[40] bg-background/80 backdrop-blur-sm transition-opacity" 
          onClick={() => setOpen(false)}
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
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          {!isEmptyState && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <SearchX className="h-8 w-8 opacity-40" />
              <p className="text-sm">No items found</p>
              <p className="text-xs">Try a product name, category, or type.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="p-1" role="listbox">
              {filtered.map((product, index) => (
                <button
                  key={product.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors cursor-pointer",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 rounded-md object-cover border border-border"
                  />
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium truncate">{product.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
                    <button
                      key={term}
                      onClick={() => handleHistoryClick(term)}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{term}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemoveHistory(e, term)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        aria-label={`Remove ${term} from history`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </button>
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
                      onClick={() => handleCategoryClick(cat.value)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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


import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { products } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchBarProps {
  className?: string;
  onClose?: () => void;
  expanded?: boolean;
}

const SearchBar = ({ className, onClose, expanded = true }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
        setQuery("");
        setOpen(false);
        onClose?.();
      }
    },
    [query, navigate, onClose]
  );

  const handleSelect = (productId: string) => {
    navigate(`/product/${productId}`);
    setQuery("");
    setOpen(false);
    onClose?.();
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  if (!expanded) return null;

  return (
    <Popover open={open && query.trim().length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Search products"
          className={cn("relative flex items-center", className)}
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            placeholder="Search products..."
            className="h-9 w-full rounded-md border border-border bg-secondary pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search products"
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
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <SearchX className="h-8 w-8 opacity-40" />
                <p className="text-sm">No items found</p>
                <p className="text-xs">Try searching for "Drop Shoulder"</p>
              </div>
            </CommandEmpty>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => handleSelect(product.id)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-10 w-10 rounded-md object-cover border border-border"
                    />
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {product.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {product.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ৳{product.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchBar;

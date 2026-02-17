import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  onClose?: () => void;
  expanded?: boolean;
}

const SearchBar = ({ className, onClose, expanded = true }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
        setQuery("");
        onClose?.();
      }
    },
    [query, navigate, onClose]
  );

  if (!expanded) return null;

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search products"
      className={cn("relative flex items-center", className)}
    >
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tees..."
        className="h-9 w-full rounded-md border border-border bg-secondary pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Search products"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
};

export default SearchBar;

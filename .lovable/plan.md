
# Live Predictive Search with Thumbnails

## Overview

Replace the current basic search bar with a live predictive search that shows product results as the user types, complete with thumbnail images, names, and prices in a styled dropdown.

## How It Works

1. User clicks the search icon in the navbar (or the mobile search bar)
2. As they type, a dropdown appears below the input showing matching products
3. Results include a small product image, name, price, and product type badge
4. Clicking a result navigates directly to that product's detail page
5. If nothing matches, a friendly "No items found" message appears with a suggestion
6. Pressing Enter still navigates to the shop page with the query as a filter

## Technical Approach

### SearchBar Component Rewrite (`src/components/SearchBar.tsx`)

- Use shadcn's `Popover` component for the dropdown (anchored to the input)
- Use shadcn's `Command` (cmdk) inside the popover for keyboard-navigable search results
- Debounce input at 200ms using the existing `useEffect` + `setTimeout` pattern
- Filter products from `src/data/products.ts` by matching `name`, `type`, and `category` (case-insensitive)
- Limit visible results to 6 items to keep the dropdown compact
- Each result row: thumbnail (40x40 rounded), product name, type badge, and price
- "No items found" empty state with suggestion text
- Clicking a result calls `navigate(\`/product/\${product.id}\`)` and closes the dropdown
- Enter key submits to `/shop?q=...` as before
- Escape key or clicking outside closes the dropdown
- Clear button (X) resets query and closes dropdown

### Navbar Integration (`src/components/Navbar.tsx`)

- No major changes needed -- the SearchBar already renders inline
- The Popover dropdown will layer on top via z-index from shadcn defaults

### Mobile Menu (`src/components/MobileMenu.tsx`)

- The same SearchBar component is used here, so it gets predictive search automatically

## New Feature Ideas

Here are additional features that would boost the shopping experience:

1. **Quick Add to Cart from Search** -- Add a small cart icon on each search result so users can add items without leaving the search
2. **Search History** -- Remember and display the last 5 searches below the input when it's empty (stored in localStorage)
3. **Category Quick Links** -- When the search input is focused but empty, show popular categories as clickable chips (T-Shirts, Polos, etc.)
4. **Keyboard Navigation** -- Full arrow-key support to navigate results and Enter to select (provided free by cmdk)
5. **Product Comparison** -- Let users select 2-3 products to compare side-by-side on specs, price, and sizes

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/SearchBar.tsx` | Full rewrite: add Popover + Command for live search dropdown with thumbnails |
| `src/components/Navbar.tsx` | Minor: widen search bar area slightly to accommodate dropdown |

### No New Files Needed

The entire feature fits within the existing `SearchBar.tsx` using shadcn's `Popover` and `Command` components that are already installed.

### Dependencies

All required packages are already installed:
- `cmdk` (Command component)
- `@radix-ui/react-popover` (Popover component)
- `lucide-react` (icons)

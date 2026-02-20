
## Add "Sale" Filter Button to Shop Page

### What's Changing

A single "Sale" toggle button will be added to the second filter row (where the tier buttons and Price button live), letting shoppers instantly narrow to discounted items — products that have an `originalPrice` set.

### How It Works

- The active state is stored in the URL as `?sale=1` (consistent with how all other filters work — type, category, sort are all URL params)
- The filter logic adds one extra condition: `matchesSale = !saleOnly || !!p.originalPrice`
- The "Sale" count badge shows how many on-sale products exist among available products
- It integrates with "Clear all" — clicking Clear all resets the sale filter too
- `hasFilters` is updated to include the sale state so the "Clear all" button appears when Sale is active

### Visual Design

The Sale button will match the existing tier buttons in shape but use a distinct amber/orange accent color when active (like a sale tag feel), with a small tag icon from `lucide-react` to make it visually distinct and recognisable.

- Inactive: same muted style as other tier buttons
- Active: `bg-amber-500/15 text-amber-500 border border-amber-500/30` — a warm sale color that stands out without clashing with the primary green

### Technical Changes

**File: `src/pages/Shop.tsx`**

1. Read `sale` from URL params: `const saleOnly = searchParams.get("sale") === "1";`
2. Add `Tag` to the lucide-react import
3. Add `toggleSale` handler that sets/deletes `?sale=1` in the URL
4. Add `matchesSale` to the filter predicate
5. Update `hasFilters` to include `|| saleOnly`
6. Compute `saleCount` = number of available products with `originalPrice`
7. Insert the Sale button in the tier-buttons row, right after the last tier button and before the Price button

No database changes, no new files, no new dependencies needed.


# Fix Delivery Fee Display — Cart & Checkout Pages

## Root Cause

Two separate bugs:

### Bug 1 — Cart page (hardcoded, no fetch)
`Cart.tsx` has no delivery fee logic at all. The "Delivery" row is permanently hardcoded to show "Free" regardless of what is configured in the admin settings. The cart never fetches `delivery_settings` from the database.

### Bug 2 — Checkout page (wrong default state)
`Checkout.tsx` initialises `deliverySettings` with `enabled: false` as the default:
```
const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({ enabled: false, ... });
```
This means on the first render (before the async fetch completes), the fee is always calculated as `0`. While the data eventually loads and triggers a re-render, there is no loading indicator — users see "Free" flash first, then the correct fee appears (or doesn't, if the component unmounts or React batches the update poorly). The fix is to change the default to `enabled: true` so the default behaviour is to show the real fee while loading.

## What Will Be Fixed

### Cart.tsx — Add real delivery fee logic
- Import and use the `useSiteSettings` hook (already exists and is used elsewhere in the app) to fetch `delivery_settings`
- Calculate `deliveryFee` the same way Checkout does: fee applies if `enabled && totalPrice < free_threshold`
- Show a loading skeleton while the setting fetches
- Display the actual fee (e.g. `৳80`) or `Free` with a green colour when the threshold is met
- Update the "Total" to include `deliveryFee`
- Show a helpful note like "Free delivery on orders over ৳2,000" if the threshold isn't yet met

### Checkout.tsx — Fix the default state
- Change the `useState` default from `enabled: false` to `enabled: true` so the fee is shown immediately during loading (before the fetch resolves)
- This prevents the "Free" flash that happens on first render

## Technical Changes

### Files to Modify

**`src/pages/Cart.tsx`**
1. Import `useSiteSettings` hook
2. Fetch `delivery_settings` with `useSiteSettings<DeliverySettings>("delivery_settings")`
3. Compute `deliveryFee` from the fetched data (with `totalPrice` from cart)
4. Update the Order Summary section to show the real fee and real total
5. Add a small "Free delivery on orders over ৳X" nudge line when applicable (encourages users to add more to cart — industry standard e-commerce practice)

**`src/pages/Checkout.tsx`**
1. Change line 51: `{ enabled: false, ... }` → `{ enabled: true, free_threshold: 2000, delivery_fee: 80 }` so the fallback assumption matches the database defaults and avoids a "Free" flash

## No Database or Schema Changes Needed
The `delivery_settings` key already exists in the database with the correct value:
```json
{ "enabled": true, "delivery_fee": 80, "free_threshold": 2000 }
```
This is purely a frontend display fix.

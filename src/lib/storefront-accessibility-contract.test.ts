import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8");

const navbar = read("src/components/Navbar.tsx");
const cartDrawer = read("src/components/CartDrawer.tsx");
const gallery = read("src/components/ProductImageGallery.tsx");
const searchBar = read("src/components/SearchBar.tsx");
const sheet = read("src/components/ui/sheet.tsx");
const dialog = read("src/components/ui/dialog.tsx");

test("desktop storefront navigation exposes a keyboard disclosure contract", () => {
  assert.match(navbar, /openDropdownKey/);
  assert.match(navbar, /aria-expanded=\{link\.hasDropdown \? isDropdownOpen : undefined\}/);
  assert.match(navbar, /aria-controls=\{link\.hasDropdown \? dropdownId : undefined\}/);
  assert.match(navbar, /aria-haspopup=\{link\.hasDropdown \? "true" : undefined\}/);
  assert.match(navbar, /event\.key === "Escape"/);
  assert.match(navbar, /data-nav-dropdown-trigger='true'/);
  assert.match(navbar, /\.focus\(\)/);
});

test("cart drawer uses the shared modal sheet primitive", () => {
  assert.match(cartDrawer, /<Sheet open=\{isCartOpen\} onOpenChange=\{setIsCartOpen\}>/);
  assert.match(cartDrawer, /<SheetContent/);
  assert.match(cartDrawer, /<SheetTitle/);
  assert.match(cartDrawer, /<SheetDescription/);
  assert.doesNotMatch(cartDrawer, /className="fixed inset-0 z-\[100\]/);
  assert.match(sheet, /h-11 w-11/);
  assert.match(sheet, /onOpenAutoFocus/);
  assert.match(sheet, /restoreFocusRef/);
  assert.match(sheet, /onCloseAutoFocus/);
  assert.match(sheet, /restoreTarget\.focus\(\)/);
});

test("product image lightbox uses an accessible dialog contract", () => {
  assert.match(gallery, /<Dialog open=\{isFullscreen\} onOpenChange=\{setIsFullscreen\}>/);
  assert.match(gallery, /<DialogTitle className="sr-only">/);
  assert.match(gallery, /<DialogDescription className="sr-only">/);
  assert.match(gallery, /aria-label="Previous fullscreen image"/);
  assert.match(gallery, /aria-label="Next fullscreen image"/);
  assert.match(gallery, /event\.key === "ArrowLeft"/);
  assert.match(gallery, /event\.key === "ArrowRight"/);
  assert.match(gallery, /md:focus-visible:opacity-100/);
  assert.match(dialog, /h-11 w-11/);
});

test("search suggestions implement combobox/listbox active-descendant semantics", () => {
  assert.match(searchBar, /role="combobox"/);
  assert.match(searchBar, /aria-autocomplete="list"/);
  assert.match(searchBar, /aria-controls=\{showDropdown \? controlledPopupId : undefined\}/);
  assert.match(searchBar, /aria-activedescendant=\{activeOptionId\}/);
  assert.match(searchBar, /role="listbox"/);
  assert.match(searchBar, /role="option"/);
  assert.match(searchBar, /aria-selected=\{index === selectedIndex\}/);
  assert.match(searchBar, /role="status" aria-live="polite"/);
  assert.match(searchBar, /if \(e\.key === "Escape"\)[\s\S]*?e\.preventDefault\(\)[\s\S]*?setOpen\(false\)/);
});

test("recent-search removal is not nested interactive content", () => {
  assert.doesNotMatch(searchBar, /<span\s+role="button"/);
  assert.match(searchBar, /aria-label=\{`Remove \$\{term\} from history`\}/);
  assert.match(searchBar, /type="button"[\s\S]*handleRemoveHistory/);
});

# COMMERCE Engine — Comprehensive Editor & Template Strategy

## 1. Vision & Overview
The objective is to democratize storefront creation by providing an editing ecosystem that caters to two distinct audiences without compromising the experience for either:
- **Beginners/Non-Technical Merchants (Basic Mode):** Need a fast, visually guided experience that practically guarantees a stunning outcome. The UI hides complexity while offering powerful, high-impact levers (vibes, layouts).
- **Power Users/Agencies (Advanced Mode):** Need ultimate flexibility, code-level access, and granular control over every DOM element and state, akin to professional design tools (e.g., Webflow, Framer).

---

## 2. Template Ecosystem & Strategy
To allow users to build *any* type of site, we must move beyond the standard "catalog" e-commerce layout.

### Recommended Template Categories
1. **Classic E-Commerce (Multi-category):** Mega-menus, robust filtering, dynamic product grids, and related items. Best for fashion, electronics, and general retail with large inventories.
2. **Single Product / High-Conversion Landing Page:** Optimized for drop-shippers and flagship products. Features sticky "Buy Now" buttons, storytelling scroll sections, video backgrounds, feature highlights, and social proof sliders.
3. **Service-Based & Booking:** For consultants, salons, or agencies. Focuses on pricing tables, portfolio galleries, team sections, and integrated scheduling widgets instead of add-to-cart flows.
4. **Creator / Merch Drop:** Highly visual, countdown timers, limited stock scarcity elements, dark-mode default, edgy typography, large lifestyle imagery.
5. **Subscription Box / B2B:** Focus on tiered pricing, "How it works" steps, bulk ordering tables, and recurring billing highlights.

### Template Sector (Marketplace)
- **Publish & Share Hub:** A community-driven marketplace where creators and agencies can publish their custom templates (both free and premium).
- **Export/Import Engine:** One-click JSON export of a store's exact configuration (theme variables, block layouts, custom CSS). Users can share these "Theme Codes" with others or migrate setups between stores seamlessly.

---

## 3. Basic Mode: The "Magic" Editor
Designed with heavy guardrails and beautiful defaults so merchants cannot create a "bad" design. 

### Layout & Navigation Interfaces
The editor fundamentally adapts its UI based on the device the merchant is using to edit.

**Web Version (Split-Pane Dashboard):**
- **Left Sidebar:** The control center containing input fields, toggle switches, and the guided setup wizard. Kept clean and categorized.
- **Right Viewport (Interactive Preview):** A massive, live-updating iframe preview of the site.
- **Top Bar Controls:** Viewport toggles (Desktop, Tablet, Mobile icons) to check responsiveness, and a prominent "Full Screen Preview" button to collapse the sidebar entirely.

**Mobile Version (App-Like Experience):**
- **Simplified Settings UI:** The entire screen becomes the settings menu, optimized for fat-finger tapping.
- **Floating Action Buttons (FAB):** A persistent bottom/corner floating dock containing: **Preview (Eye Icon)**, **Undo (Arrow Left)**, **Redo (Arrow Right)**, and an **Autosave Status Indicator**.
- **Preview Overlay:** Tapping the "Preview" FAB slides up a full-screen iframe of the site. A sticky "X" button in the corner closes it instantly to return to editing.

### The Guided Wizard & Setup
- **Skeleton Previews for Layouts:** When selecting layout options (e.g., "Product grid: 3 per row vs 4 per row", "Sidebar Left vs Right"), users don't read text descriptions. Instead, they see minimalist wireframe/skeleton SVGs representing the layout structure. This provides instant, intuitive visual guidance.
- **Visual Section Ordering:** Simple up/down arrows or visual drag handles to reorder entire sections (e.g., move "Testimonials" above "Featured Products").

### Theme & Aesthetics Page (The "Vibe" Picker)
Instead of overwhelming users with individual CSS properties, they select an *Aesthetic Design Language* that holistically styles the site:
1. **Glassmorphism:** Frosted glass panels, translucent backgrounds, blurred backdrops (great for modern tech/fashion).
2. **Fluid / Organic:** Soft rounded corners, blob shapes, wavy section dividers, pastel gradients.
3. **Cubic / Brutalist:** Sharp edges, bold thick borders, high-contrast monochrome with bright accent colors, marquee scrolling text.
4. **Neumorphism:** Soft extruded UI elements that look physical and tactile.

*Action:* When a user selects an aesthetic, the editor automatically updates CSS variables for border-radii, box-shadows, background treatments, and input styles across all blocks globally. 

### Effects Tab (Micro-Interactions)
Users can add professional animations without writing a single line of JS/CSS:
- **Scroll Reveals:** Select how elements appear as the user scrolls down (Fade-in, Slide-up, Zoom-in, Staggered).
- **Hover Effects:** "Lift up" on cards, "Image Zoom" on products, "Glow/Pulse" on CTA buttons.
- **Parallax Backgrounds:** A simple toggle to make hero background images scroll at a different speed than the foreground content.

---

## 4. Advanced Mode: The "Pro" Editor
For users who want total control. This mode transforms the interface into a professional visual development environment.

### Powerful Customization Features:
1. **Full DOM Tree Navigator:** A layer panel showing the exact HTML/Block structure. Users can select, duplicate, or delete any nested element.
2. **Visual CSS Inspector:** A comprehensive right-hand panel with granular CSS properties (Flexbox/Grid controls, Z-index, padding/margin visual box models, exact typography metrics like letter-spacing and line-height).
3. **Code Injection & Editing:** 
   - **Global Scripts:** `<head>` and `<body>` script injection for custom tracking pixels, chatbots, or analytics.
   - **Block-Level CSS/HTML:** Write raw CSS/HTML scoped specifically to a selected block.
4. **Breakpoint Overrides:** Edit specific padding, display properties, or layout logic *only* for mobile, tablet, or desktop media queries.
5. **Dynamic Data Binding:** Advanced ability to map visual text or image fields directly to database fields (e.g., binding a text block to `product.inventory_count` or `store.meta_description`).

---

## 5. Creative Enhancements & UX Touches
- **"I'm Feeling Lucky" Generator:** In basic mode, clicking this uses an algorithm to randomly generate a harmonious color palette, typography pairing, and vibe setting. 
- **Smart Contrast Checker:** If a user manually picks a white text color on a light yellow button, the editor softly warns them about readability/accessibility and suggests a darker, compliant shade.
- **Gamified Progress Tracker:** A checklist (e.g., "Set Logo", "Add First Product") that fills up with satisfying micro-animations as they complete their store setup, celebrating with virtual confetti when they hit "Publish".

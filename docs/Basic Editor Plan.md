# COMMERCE Engine Basic + Advanced Editor Master Plan

## 1. Core Goal

The editor system should let a merchant with very low technical knowledge fully customize their storefront, quickly and confidently, without breaking layouts or getting lost in technical controls.

At the same time, it should give advanced users, agencies, and power sellers enough freedom to create highly custom storefronts, reusable layouts, and premium design systems without needing a separate builder.

This means the editor must support:

- a simple, guided, low-stress **Basic Mode**
- a powerful, structured **Advanced Mode**
- a shared data system underneath both modes
- all current and future storefront templates
- desktop and mobile editing experiences
- reusable template, theme, section, and layout presets

The product principle is:

`Easy at first glance, deep when needed, never chaotic.`

---

## 2. Product Vision

We are not building a generic page builder.

We are building a **merchant-friendly storefront operating system** where:

- templates define the starting structure
- blocks define editable sections
- themes define the visual system
- layouts define section arrangement and density
- effects define polish and motion
- Basic and Advanced modes edit the same storefront data in different ways

The merchant should feel:

- "I can launch fast"
- "I can change anything important"
- "I always understand what I am editing"
- "I can preview safely before going live"
- "I can switch templates without losing my previous work"

---

## 3. Editor Architecture Principles

### 3.1 One Shared Engine

Basic Mode and Advanced Mode must edit the same underlying store model:

- store theme
- storefront profile
- page graph
- blocks
- block props
- layout variants
- template-scoped settings
- merchant-wide settings

Basic Mode is not a separate editor. It is a guided layer over the same engine.

### 3.2 Template-Aware Everywhere

The active storefront template should control:

- which pages exist
- which blocks are recommended
- which layouts are recommended
- which settings are shown
- which flow settings are relevant
- which onboarding steps appear
- which previews and copy guidance are shown

### 3.3 Progressive Disclosure

The editor should reveal complexity in layers:

1. Start with only the most important choices.
2. Let the user expand deeper controls when needed.
3. Keep raw technical options out of the way in Basic Mode.
4. Expose maximum control in Advanced Mode.

### 3.4 Safe Customization

The system should strongly reduce broken designs by:

- using presets
- using design tokens
- using skeleton previews
- using guided defaults
- using visibility toggles before destructive deletion
- showing responsive previews early
- autosaving drafts
- keeping undo/redo accessible

---

## 4. Basic Mode Vision

## 4.1 Definition

Basic Mode should feel like:

- clean
- welcoming
- guided
- visually rich
- impossible to get lost in
- powerful without looking technical

The merchant should be able to:

- pick a template
- pick a vibe/theme
- change copy
- swap media
- reorder sections
- choose layouts
- manage visible store pages
- preview desktop/tablet/mobile
- adjust effects
- change fonts/colors/spacing
- save, undo, redo, and publish

without ever touching code.

## 4.2 First-Glance Experience

At first glance Basic Mode should show only a few clear editing areas:

1. Pages
2. Content
3. Layout
4. Theme
5. Effects
6. Launch

Each area should feel like a guided task, not a technical settings dump.

## 4.3 Basic Mode Main Jobs

Basic Mode should support these jobs:

- "I want my store to look different"
- "I want to reorder what customers see"
- "I want to change section text and images"
- "I want to make it feel more premium / playful / bold / clean"
- "I want to preview mobile"
- "I want to change product grid style"
- "I want to turn sections on/off"
- "I want to change checkout/cart/support behavior without code"

---

## 5. Basic Mode Desktop UX

## 5.1 Default Desktop Layout

Desktop Basic Mode should use a two-panel design:

- **Left panel:** editing controls
- **Right panel:** live storefront preview

### Left Panel

The left panel should contain:

- section navigation
- page switcher
- guided actions
- block-specific editors
- layout variant pickers
- theme settings
- effect settings
- save state

Recommended width:

- `380px` to `460px`

### Right Panel

The right side should contain:

- full live preview
- desktop/tablet/mobile toggle
- fullscreen preview button
- zoom controls
- preview refresh state
- quick open in new tab

## 5.2 Desktop Navigation Model

Recommended top-level tabs for Basic Mode:

- `Pages`
- `Content`
- `Layout`
- `Theme`
- `Effects`
- `Store Flow`
- `Launch`

These should be visible as:

- compact side rail with icons + labels
- or top-left segmented task tabs depending on available width

## 5.3 Desktop Preview Controls

Preview controls should include:

- Desktop preview
- Tablet preview
- Mobile preview
- Fullscreen preview
- Show/hide editing panel
- Safe refresh
- Preview loading indicator
- Optional compare mode: before / current draft

## 5.4 Desktop Quick Actions

Always-accessible actions:

- Undo
- Redo
- Autosave state
- Save draft
- Preview live
- Publish

These should stay pinned in the editor header.

---

## 6. Basic Mode Mobile UX

## 6.1 Mobile Editing Philosophy

Mobile editing should not try to copy the desktop layout exactly.

It should be:

- simplified
- focused on one task at a time
- thumb-friendly
- low-clutter
- fast to navigate

## 6.2 Mobile Editing Layout

Recommended mobile structure:

- full-screen editing sheet/page
- one section/task group visible at a time
- sticky top title and breadcrumb
- floating action dock

## 6.3 Mobile Floating Controls

Floating controls should include:

- Preview
- Undo
- Redo
- Autosave status

Optional expandable dock:

- Publish
- Save draft
- Jump to page

## 6.4 Mobile Preview Experience

When the user taps Preview:

- open full-page storefront preview
- use close button to return
- allow desktop / tablet / mobile device-frame toggle
- keep the editor draft state alive underneath

## 6.5 Mobile Editing Priorities

On mobile, the user should do these well:

- edit text
- upload images
- reorder sections
- toggle section visibility
- choose layouts from visual cards
- preview safely

Avoid making mobile users handle:

- too many tiny toggles in one view
- dense inspector controls
- large nested forms

---

## 7. Basic Mode Functional Areas

## 7.1 Pages Tab

Purpose:

- manage page-level structure
- switch pages quickly
- understand the storefront map

Must support:

- page list by type
- homepage / shop / product / cart / checkout / account / contact / custom pages
- add custom page
- duplicate custom page
- hide/unpublish custom page
- set page status badges
- page preview shortcut

User-friendly grouping:

- Core Pages
- Storefront Flow Pages
- Business Pages
- Custom Pages
- Hidden / Draft Pages

## 7.2 Content Tab

Purpose:

- edit actual customer-facing block content

Must support:

- hero copy
- promo copy
- category labels
- feature sections
- FAQ items
- trust badges
- testimonials
- banners
- video and social sections
- CTA labels
- section descriptions
- media upload

Each block editor should include:

- simple labels
- merchant-focused guidance
- optional "best practice" hint
- content preview when relevant

## 7.3 Layout Tab

Purpose:

- visually arrange the page

Must support:

- add section
- remove section
- duplicate section
- reorder section
- hide/show section
- choose layout variant
- choose density/columns
- choose alignment
- choose sidebar position

### Layout Variant Selection

This should use **visual skeleton previews**, not just dropdowns.

Examples:

- hero: split / centered / full-bleed / editorial
- product grid: 2-col / 3-col / 4-col / sidebar-left / sidebar-right
- category showcase: cards / carousel / compact list / masonry
- testimonials: cards / slider / stacked proof

Each option should show:

- mini wireframe preview
- short "best for" guidance
- optional recommendation badge for the active template

## 7.4 Theme Tab

Purpose:

- let the user change the full visual language without manual CSS

Theme should be broken into:

- Colors
- Fonts
- Aesthetic
- Radius & Density
- Theme Packages

## 7.5 Effects Tab

Purpose:

- make the site feel polished and modern

Must support:

- scroll reveal styles
- hover effects
- parallax
- glow / pulse CTA
- image zoom
- sticky behavior presets
- intensity levels
- section-level override

Effects should preview on hover where possible.

## 7.6 Store Flow Tab

Purpose:

- edit shared commerce behavior without code

Examples:

- product visibility mode
- checkout mode
- payment badges
- WhatsApp support behavior
- delivery fee structure
- upsell titles
- inquiry-first wording
- booking/reservation copy
- download/activation messaging

This tab should already be template-aware.

## 7.7 Launch Tab

Purpose:

- final confidence + readiness

Must support:

- readiness checklist
- SEO essentials summary
- missing content warnings
- missing payment/contact warnings
- preview live site
- publish / unpublish
- launch success confirmation

---

## 8. Theme System Brainstorm

## 8.1 Aesthetic Families

Keep and expand the aesthetic system with styles such as:

- Minimal
- Glassmorphism
- Fluid / Organic
- Cubic / Brutalist
- Neumorphism
- Editorial
- Retro / Y2K
- Warm Artisan
- Dark Luxury
- Playful Pop
- Soft Wellness
- Tech Precision

Each aesthetic should control:

- border radius behavior
- shadow style
- card styling
- button feel
- typography tone
- section spacing
- surface treatment
- accent treatment

## 8.2 Theme Controls

Theme page should allow:

- primary color
- accent color
- background color
- foreground color
- heading font
- body font
- radius scale
- spacing density
- theme mode
- aesthetic preset
- recommended palettes
- randomize look

## 8.3 Smart Theme Helpers

Helpful enhancements:

- smart contrast checker
- auto-fix low contrast suggestion
- font pairing recommendation
- palette suggestions based on category
- "match this hero image" palette generation
- one-click "refresh the vibe"

---

## 9. Templates and Layout Ecosystem

## 9.1 Current Template Direction

The editor must fully support all current storefront templates:

- landing
- beauty
- fashion
- electronics
- food
- crafts
- subscriptions
- digital-downloads
- single-product
- inquiry-catalog
- service
- general-catalog
- booking
- hotel
- real-estate

## 9.2 Recommended New Template Types

To make the platform more versatile, add more vertical and use-case templates.

Recommended additions:

- Creator merch
- Course / digital academy
- Donation / nonprofit
- Event launch / pre-order
- Portfolio + shop hybrid
- Kids / toys
- Pharmacy / healthcare catalog
- Furniture / home decor
- Pet shop
- Jewelry / luxury boutique
- Automotive parts
- Local grocery / essentials
- B2B industrial catalog
- Subscription box
- Restaurant quick-order
- Multi-brand marketplace lite

## 9.3 Layout Variants Within Templates

Each template should not be one fixed design.

Each template should have multiple layout variants:

- hero styles
- section rhythm styles
- grid density styles
- nav styles
- sidebar styles
- CTA arrangement styles
- section ordering presets

## 9.4 Template Preview Gallery

Template choosing should feel premium and inspiring.

The gallery should include:

- large preview cards
- live mini-preview or autoplay scroll
- desktop/mobile preview toggle
- category filters
- mood filters
- best-for tags
- "preview with my store" option

Template card metadata:

- template name
- best use case
- style tags
- supported features
- pages included
- category fit

---

## 10. Basic Mode Wizard Vision

## 10.1 Wizard Purpose

The guided wizard should help beginners launch without needing to understand the whole editor.

It should offer:

- Quick Setup
- Full Setup

## 10.2 Quick Setup

For fast launch:

1. Store identity
2. Hero content
3. Theme selection
4. Contact/payment essentials
5. Preview and publish

## 10.3 Full Setup

For deeper control:

1. Template and page structure
2. Brand basics
3. Hero and first impression
4. Core sections
5. Product / catalog behavior
6. Theme and effects
7. Contact / support / flow
8. Final preview and launch

## 10.4 Template-Aware Wizard Sections

The wizard must adapt per template:

- food: delivery, service zones, WhatsApp order support
- service: lead capture, appointment CTA, trust copy
- hotel: reservation flow, location and guest expectations
- real-estate: inquiry flow, office details, map and agent direction
- digital-downloads: download delivery expectations, license/support guidance
- subscriptions: billing and activation explanation
- single-product: hero product persuasion, proof, urgency

## 10.5 Wizard UX Improvements

Add:

- progress tracker
- "what this affects" hint
- preview card beside step
- skip for now option
- recommended defaults
- confidence copy instead of technical warnings

---

## 11. Block Editing Strategy

## 11.1 Goal

Every block used in merchant storefronts should have:

- beginner-safe edit controls
- good defaults
- template-aware guidance
- meaningful layout options

## 11.2 Block Editor Requirements

Every block editor should support:

- content editing
- media replacement
- visibility toggle
- layout variant choice
- optional advanced details drawer
- quick duplicate / move

## 11.3 Template-Aware Block Guidance

The same block should feel different by template.

Examples:

- `hero` in fashion should emphasize editorial storytelling
- `hero` in electronics should emphasize headline + specs + deal
- `featured-products` in food should feel like menu cards
- `featured-products` in subscriptions should emphasize plans and billing periods
- `trust-badges` in hotel should emphasize stay confidence, location, and guest promises

## 11.4 Reusable Block Presets

Merchants should be able to choose block presets like:

- luxury hero
- food deal strip
- minimalist trust row
- tech comparison row
- quote capture banner
- review-heavy landing proof

These should work like insertable section presets.

---

## 12. Recommended New Basic Mode Features

Strong additions to make Basic Mode feel simple but powerful:

- AI-assisted starter copy for each block
- section score: weak / good / strong
- mobile-first warning when section becomes too tall or dense
- one-click duplicate as variation
- compare version A / B for a section
- section notes for merchant team
- hidden draft section library
- saved layout presets per page type
- preview hotspots showing "you are editing this area"
- contextual merchant education tips

---

## 13. Advanced Mode Vision

## 13.1 Role of Advanced Mode

Advanced Mode should serve:

- agencies
- designers
- technical merchants
- developers
- growth teams

It should be powerful without being messy.

## 13.2 Advanced Mode Main Areas

Recommended top-level structure:

- Tree
- Inspector
- Responsive
- Data
- Code
- Versions
- Publish

## 13.3 DOM / Block Tree

Must support:

- full page structure
- nested block tree
- click-to-select from preview
- drag and drop in tree
- duplicate and clone
- visibility and lock
- grouping

## 13.4 Visual Inspector

Must support:

- spacing
- size
- radius
- borders
- typography
- shadows
- layout
- z-index
- display
- flex/grid
- overflow
- sticky/fixed behavior

## 13.5 Responsive Editing

Must support:

- desktop-only overrides
- tablet-only overrides
- mobile-only overrides
- preview sync
- breakpoint warning when content overflows

## 13.6 Data Binding

Advanced users should be able to bind:

- block text
- image
- price
- stock
- badge
- rating
- collection
- support content
- policy content

to actual store/product/category data.

## 13.7 Code-Level Controls

Advanced Mode can expose:

- global head injection
- global body injection
- block-level CSS
- block-level HTML
- block-level JS only where safe and approved
- scoped style preview
- safe sanitization layer

## 13.8 Power Features

Add:

- copy style / paste style
- multi-select styling
- named versions
- checkpoints
- comments/annotations
- advanced keyboard shortcuts
- import/export per page
- override block rendering

---

## 14. Template Marketplace and Export / Import

## 14.1 Export / Import Goals

Users should be able to export:

- theme only
- theme + effects
- page layout
- full template setup
- block presets

## 14.2 Import Experience

Import should show:

- what changes
- affected pages
- affected theme vars
- affected layouts
- overwrite / merge choice

## 14.3 Template Publishing System

Future template sector should support:

- publish template
- publish theme pack
- publish block pack
- preview before listing
- free / premium
- category tags
- ratings
- install count
- fork and customize

---

## 15. Preview System Requirements

Preview should be a first-class product feature.

Must support:

- live right-side preview on desktop
- full-screen preview
- mobile preview overlay
- tablet preview
- compare before/after
- real template rendering
- section highlight when editing
- preview safe state indicator

Future enhancements:

- heatmap overlay
- launch-readiness overlay
- accessibility overlay

---

## 16. Merchant Safety and Confidence Features

To keep low-technical merchants comfortable:

- autosave
- undo / redo
- safe draft mode
- restore previous version
- publish confirmation
- launch checklist
- accessibility guidance
- broken contrast warnings
- missing page warnings
- missing CTA warnings
- "this change affects" helper text

---

## 17. Suggested Build Roadmap

### Phase 1: Basic Mode Foundation Upgrade

- finish template-aware block editing
- finish template-aware layout tab
- finish skeleton variant picker system
- complete desktop split-pane UX
- complete mobile floating-preview UX

### Phase 2: Guided Wizard Expansion

- page-type-aware wizard
- template-aware section guidance
- quick setup vs full setup
- readiness checklist integration

### Phase 3: Template Gallery and Presets

- better gallery
- preview with my store
- more layouts per template
- block preset library
- theme package browser

### Phase 4: Effects and Theme Depth

- section-level effects
- more aesthetics
- palette assistant
- preview-on-hover effects

### Phase 5: Advanced Mode v1

- tree navigator
- inspector
- breakpoint editing
- version history

### Phase 6: Advanced Mode v2

- code editing
- data binding
- style copy/paste
- multi-select
- annotations

### Phase 7: Marketplace and Export / Import

- theme export/import
- block preset export/import
- template publish flow
- marketplace browsing

---

## 18. Final Product Standard

When this plan is fully realized:

- a beginner should be able to build a polished site without technical help
- a power user should be able to create premium custom storefront systems
- every template should feel editable, not fixed
- mobile editing should feel intentional, not reduced desktop
- preview should always give confidence
- customization should feel limitless but organized

The final standard is not:

"a page builder with ecommerce attached"

The final standard is:

"a full storefront design and launch system built for real merchants."

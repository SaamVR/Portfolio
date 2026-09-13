# Storefront Template Spacing Audit Backlog

Status: recorded during Threads v2 production work; do not block Threads completion.

## Discovery

The shared storefront CSS currently applies `padding-top` and `padding-bottom` from `--store-section-space` to every `<section>` inside every storefront template. `getStoreThemePresentationStyle()` resolves that token to `2.75rem`–`6rem` per side depending on the merchant "Breathing room" setting; the default is roughly `4.38rem` per side.

Many existing renderers already define their own section padding. A static audit on the current Threads branch found 78 storefront `<section>` declarations and at least 50 with explicit Tailwind `py-*` spacing. Examples include Generic Commerce, Fashion V3, Threads, blog surfaces, product related-content sections, and storefront empty/loading states. This means some templates receive component spacing plus the global section spacing, creating excessive vertical whitespace.

Threads exposed the problem clearly: its compact reference layout was receiving roughly 70px of extra top padding and 70px of extra bottom padding on blocks despite defining its own spacing.

## Follow-up after Threads / template replacements

Audit the final preserved + new template catalog at 390px and desktop. Measure computed section padding and adjacent block gaps. Classify sections as component-owned spacing vs token-owned spacing, then eliminate double application rather than applying one universal large value.

Target density bands for the audit: compact commerce ~12–24px, standard commerce ~24–48px, deliberate editorial breathing room ~40–64px. Hero, full-bleed media, trust strips, rails, and footers should normally own their geometry explicitly.

Do not globally delete the rule without regression checks: a minority of generic or utility surfaces may still depend on it. Validate Generic, preserved legacy templates, Fashion V3, Threads, product/shop pages, mobile editor preview, and 360/390/430/768/1440 widths before the cleanup ships.

This is a bounded UI-density cleanup, not a Storefront Platform architecture rewrite.

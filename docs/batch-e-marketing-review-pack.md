# Batch E Review Pack

Last updated: August 11, 2026

## Scope

This batch is the reviewable release slice for:
- public marketing page refreshes,
- plans and FAQ/help surfaces,
- new landing-page variants,
- public guide assets used by those surfaces.

## Exact Batch E Files In The Current Worktree

### Public app pages

- `src/app/page.tsx`
- `src/app/plans/page.tsx`
- `src/app/how-it-works/page.tsx`
- `src/app/platform-faq/page.tsx`

### Marketing components

- `src/components/marketing/CmsLandingPage.tsx`
- `src/components/marketing/CmsPricing.tsx`
- `src/components/marketing/ModernHighConvertingLandingPage.tsx`
- `src/components/marketing/NewLandLandingPage.tsx`
- `src/components/marketing/PlanCtaButton.tsx`
- `src/components/marketing/SleekBentoLandingPage.tsx`
- `src/components/marketing/VisualShowcaseLandingPage.tsx`
- `src/components/marketing/feedbacks.md`

### Public guide assets

- `public/images/guide/admin_dashboard_overview.png`
- `public/images/guide/site_creation_and_management_demo.webp`
- `public/images/guide/step1_template_selection.png`
- `public/images/guide/step2_brand_details.png`
- `public/images/guide/step3_hero_content.png`
- `public/images/guide/step4_catalog_layout.png`
- `public/images/guide/step5_theme_palette.png`
- `public/images/guide/step6_payments_launch.png`

## Release Intent

Batch E should be reviewed and released as public-site and marketing work. It should not be mixed with:
- storefront runtime scaling work,
- search rollout,
- CMS/editor restructuring,
- platform control-plane and operational changes.

## Verification Baseline

Recommended focused verification for this batch:

- `npm.cmd run lint`
- `npm.cmd run typecheck -- --pretty false`
- visual smoke of:
  - `/`
  - `/plans`
  - `/how-it-works`
  - `/platform-faq`

## Review Notes

- This batch is intentionally presentation-heavy, so browser verification matters more than typecheck alone.
- Public content assets should stay grouped with the pages that reference them, not spread across infra or storefront commits.

# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Frozen inputs

- R4 storefront integration: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- Commerce hardening: `e58deafa4996ae62addbadefe81d59a4ea606c5d`
- Order authority: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`
- Payment lifecycle: `23b1d6ee7c9ed839a86ae8bb017518fbea16801c`
- Billing authority: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`
- Invite authority: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`
- Dependency security blocker: #367

## Integration base rule

Do not merge a P0 lane directly into `r4/section-studio` and call it release-complete. R4 and the P0 production baseline diverge after their common history. The release integration branch must preserve both:

1. exact frozen R4 storefront behavior/content;
2. the production commits represented by `4caa14c...`;
3. each P0 authority lane;
4. commerce hardening;
5. the eventual isolated #367 dependency patch.

Before resolving product-code conflicts, verify the integration branch contains both `d6c689a...` content and the post-common-base production changes represented by `4caa14c...`.

## Merge / semantic precedence order

1. **Billing authority** (`e1ee505...`)
   - owns SaaS invoice settlement, manual billing replay, reviewer authority and billing rollout gates.
2. **Invite authority** (`a1fedb9...`)
   - owns exactly-once invite claiming and membership/role grant semantics.
3. **Order authority** (`5cf4db3...`)
   - owns delivery-zone/fee authority, enabled payment methods/prepaid benefits, and authoritative commercial option/variant/license/duration identity + pricing.
4. **Payment lifecycle** (`23b1d6e...`)
   - owns reservation release/expiry and bKash irreversible provider-boundary one-winner execution.
5. **Commerce hardening** (`e58deafa...`)
   - preserve all non-conflicting request bounds, publication/guest/auth-email checks, cart resilience, manual-payment claim replay protection, coupon scoping/privacy, tenant constraints, refund truth, recovery truth/idempotency, and function search-path pinning.
6. **#367 dependency-security patch**
   - apply last so `package.json` and `package-lock.json` are generated once after billing/invite script changes have converged.

This order is semantic, not permission to accept one side wholesale in conflicts.

## Conflict ownership rules

### Order creation / checkout / cart / product selection

For `src/app/api/orders/create/*`, `src/lib/cms/order-input.*`, checkout/cart/product-card/product-detail commercial selection, `Checkout.tsx`, `Products.tsx`, and generated types:

- **Order-authority semantics win** for paid option identity, price deltas, payment availability, delivery-zone authority and v3 authoritative order creation.
- Reapply commerce hardening around that authoritative core: body bounds, malformed JSON mapping, publication gate, guest policy, authenticated email authority, quantity/cart normalization and stale-product fail-closed behavior.
- Do not retain the commerce branch's older free-form option validation where it competes with #318 stable commercial option IDs.

### Payment lifecycle

For order-create reservation hooks, bKash provider/functions, callback handling and reservation state:

- **Payment-lifecycle semantics win** for #317/#327 reservation release and provider execution claims.
- Preserve commerce manual-payment replay claims only for manual bKash/Nagad external references; do not use them as a substitute for automated bKash provider execution authority.

### Billing

For billing routes, billing migrations/tests and reviewer roles:

- **Billing-authority semantics win**.
- Preserve shared smoke-runner registrations from every lane.

### Invite

For `claim-invite-code`, invite migrations and invite smoke:

- **Invite-authority semantics win**.
- Generated Supabase types must be regenerated/reconciled after all migrations rather than choosing one branch's generated file.

### Shared files

- `supabase/migration-drift-policy.json`: **union every valid exception**, never choose one side.
- `scripts/run-rls-smoke.mjs`: **union smoke registrations**.
- `package.json`: preserve billing/invite scripts; then apply #367 dependency versions/override fix.
- `src/lib/storefront-commercial-truth.test.ts`: combine assertions; do not delete truth checks to resolve an add/add conflict.

## Migration order

The 2026-09-14 migration versions have been checked across all lanes and currently have zero numeric-prefix collisions. Preserve this ordering:

`14140000` billing lock → `14140500` billing replay → `14161500` R4 options → `14200500` invite → `14201500` order authority → `14203000` payment lifecycle → `14205500` storefront manual-payment replay → `14211000` coupon scope → `14212000` cart quantity → `14213000` product tenant consistency → `14213500` order mutation lock → `14214000` owned-reference consistency → `14215000` numeric bounds → `14215900` commerce tenant graph → `14221000` refund truth → `14223000` recovery message authority → `14224000` recovery touch dedupe → `14225000` coupon privacy → `14225500` function search paths.

Do not renumber an already-pushed migration unless a real collision appears before production rollout.

## Required post-merge gates

Before any production migration/deploy:

- clean tree and exact integration SHA recorded;
- `npm ci` using Node 24.x / npm 11.17.0;
- typecheck;
- complete test suite;
- scoped/full ESLint and `git diff --check`;
- production build;
- migration drift guard;
- all registered DB preflight/smoke gates;
- authoritative order negative + positive-path tests, including non-zero option price delta;
- payment reservation abandonment/retry/cancel + bKash concurrency proof;
- billing preflight/postdeploy gates;
- invite atomicity concurrency smoke;
- direct order mutation negative proof;
- manual payment duplicate-reference negative proof;
- coupon same-code/two-store positive proof plus public enumeration negative proof;
- recovery queue duplicate-touch and direct-mutation negative proof;
- #367 `npm audit` + image optimizer smoke.

After migrations deploy, refresh the production migration ledger and remove `pending-production` drift exceptions only for migrations actually present in production.

## Current known validation state

Commerce pre-convergence head `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited failures; both failures reproduce on frozen R4. Commerce-focused suites, typecheck, lint, diff-check and drift guard were clean before the later search-path-only commit. Production reconciliation preflight for commerce migrations returned zero blocking rows across all checked invariants.

GitHub Actions on the commerce branch remain infrastructure-blocked before runner allocation (`runner_id=0`, no steps), so a red workflow without executed steps is not release evidence either way.

## Release decision

**NO-GO** until all P0 lanes converge, #367 is fixed, migrations are applied in a controlled rollout, database/postdeploy smokes pass, and Runtime 7 regression verification is completed against the exact integrated SHA.

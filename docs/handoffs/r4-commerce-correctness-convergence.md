# R4 Commerce + P0 Release Convergence Manifest

Snapshot date: 2026-09-15 (Asia/Dhaka)

## Frozen inputs

- R4 storefront integration: `d6c689a469fdc419cefca224c0e5f046644bb2df` (`r4/section-studio`)
- Production/P0 baseline: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
- Commerce hardening: `768e82483a97e82d57392a2b41a3d2d2fabb93a2`
- Order authority: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`
- Payment lifecycle: `23b1d6ee7c9ed839a86ae8bb017518fbea16801c`
- Billing authority: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`
- Invite authority: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`
- Dependency security blocker: #367

## Integration base rule

Do not merge a P0 lane directly into `r4/section-studio` and call it release-complete. R4 and the P0 production baseline diverge after their common history. The release integration branch must preserve both:

1. exact frozen R4 storefront behavior/content;
2. the production commits represented by `4caa14c...`;
3. each accepted P0 authority lane revision;
4. commerce hardening;
5. the eventual isolated #367 dependency patch.

Before resolving product-code conflicts, verify the integration branch contains both `d6c689a...` content and the post-common-base production changes represented by `4caa14c...`.

## Current P0 readiness

Branch existence is not Runtime-7 acceptance.

### Billing authority — #308 / #314

Current branch head: `e1ee5059958ab0dcb3d68ba5ea427990effde6f7`.

Implementation evidence is strong, but #314 has a real production reconciliation blocker: one normalized manual-bKash transaction identity is currently attached to two paid invoices in different stores. Neither invoice has sufficient review metadata to choose a legitimate winner automatically.

Before the billing uniqueness migration:

- preserve both historical invoice/entitlement records;
- preserve the original duplicated reference in auditable reconciliation history;
- use external/operator evidence to choose one canonical provider-identity owner;
- tombstone/supersede only the other active provider identity traceably;
- rerun the duplicate preflight, then apply the migration and postdeploy checks.

Do not auto-delete, auto-refund or infer which paid invoice is legitimate.

### Order authority — #309 / #310 / #318

Current branch head: `5cf4db3ac674b7c8bf91d368b95e8c8c7cf8178a`.

This head is not Runtime-7 accepted yet.

- #309: structured primary-city aliases and server-derived delivery-zone direction are correct, but new merchant registration must default delivery to disabled/unconfigured until deliberately configured. Client/server city normalization must remain identical, onboarding must not wipe saved aliases, and existing enabled stores with empty aliases need explicit rollout handling rather than heuristic rewrites.
- #310: structured manual-payment provider/reference must use one canonical grammar everywhere. Final R4 integration must make the replay ledger consume the structured reference for new orders; notes parsing is historical-backfill compatibility only. Operational backup/restore must preserve evidence without manufacturing a second global settlement claim.
- #318: final Runtime-7 proof still requires rollback-only database smoke against `create_store_order_authoritative_v3`, including authoritative option price deltas, stale/tampered selections, payment/delivery checks and idempotent replay. The latest coordinator evidence also recorded one focused fixture failure involving Next `after()` outside request scope that must be repaired before freeze.

### Payment lifecycle — #317 / #327

Current branch head: `23b1d6ee7c9ed839a86ae8bb017518fbea16801c`.

This pushed head is not Runtime-7 accepted. The accepted revision target is narrow:

- lifecycle order creation must wrap/extend accepted authoritative v3, never legacy v2;
- cancellation resource release must be guarded by durable release state so stock/coupon inverse happens at most once;
- `executing` / `reconciliation_required` payment attempts must block manual cancellation/resource release while provider outcome is unresolved;
- safe pre-execute attempts may be terminalized consistently before release;
- a previously `succeeded` payment attempt must prevent a new executable payment obligation even if mutable order state is later tampered/reset;
- regressions must cover cancel → reopen/state mutation → cancel, cancellation racing execute/reconciliation, and succeeded-attempt replay/tamper.

A stronger scratch composition has already been proven in coordinator evidence, but those invariants are not on the remote branch head above.

### Invite authority — #323

Current branch head: `a1fedb962a77402d88cb6ed94e3ab07ff7354f26`.

Concurrency/rollback behavior is strong, but one authority blocker remains: DB/claim authority must prevent a merchant-authored `store_staff_invites.role='owner'` row from granting owner membership. Add claim/constraint authority and source + DB smoke regression; keep existing legitimate owner membership semantics untouched.

### Dependency security — #367

Keep this isolated from commerce and apply after shared `package.json` script changes converge.

Current release graph has vulnerable Next/Sharp image-optimization dependencies. Remediation must be reproducible with Node 24 / npm 11.17, remove/update the nested Sharp override, prove `npm ci` recreates the secure graph, clear current Next/Sharp high/critical audit findings, and pass typecheck/full tests/build/image-optimizer smoke.

## Merge / semantic precedence order

1. **Billing authority** — only after #314 historical reconciliation is ready for controlled rollout.
2. **Invite authority** — after owner-role escalation guard is pushed and reverified.
3. **Order authority** — after the Runtime-7 #309/#310/#318 follow-ups above are pushed and accepted.
4. **Payment lifecycle** — after it is revised to compose around accepted v3 and the exactly-once/provider-state guards are present.
5. **Commerce hardening** (`768e824...`) — preserve all non-conflicting request bounds, publication/guest/auth-email checks, cart resilience, manual-payment replay claims, coupon scoping/privacy, tenant constraints, refund truth, recovery truth/idempotency, function search-path pinning, DB smoke and rollout preflight.
6. **#367 dependency-security patch** — apply last so `package.json` and `package-lock.json` are generated once after billing/invite script changes converge.

This order is semantic. It is not permission to accept one side wholesale in conflicts.

## Conflict ownership rules

### Order creation / checkout / cart / product selection

For `src/app/api/orders/create/*`, `src/lib/cms/order-input.*`, checkout/cart/product-card/product-detail commercial selection, `Checkout.tsx`, `Products.tsx`, and generated types:

- **Order-authority semantics win** for paid option identity, price deltas, payment availability, delivery-zone authority and v3 authoritative order creation.
- Reapply commerce hardening around that authoritative core: body bounds, malformed JSON mapping, publication gate, guest policy, authenticated email authority, quantity/cart normalization and stale-product fail-closed behavior.
- Do not retain the commerce branch's older free-form option validation where it competes with #318 stable commercial option IDs.

### Manual storefront payments

- Order authority owns the structured `manual_payment_provider` / `manual_payment_reference` order contract.
- Commerce owns durable provider+reference replay claims.
- Final integration must choose one bounded opaque reference grammar and use it in HTTP input, v3 constraints, stored order fields, replay ledger and tests.
- For new orders, the replay trigger must consume the structured field; free-form `notes` regex is historical backfill only.
- Store backup/restore must not discard structured evidence or clone a second settlement claim.

### Payment lifecycle

For order-create reservation hooks, bKash provider/functions, callback handling and reservation state:

- **Payment-lifecycle semantics win** for #317/#327 reservation release and provider execution claims after it is revised around v3.
- Preserve commerce manual-payment replay claims only for manual bKash/Nagad external references; do not use them as a substitute for automated bKash provider execution authority.

### Billing

For billing routes, billing migrations/tests and reviewer roles:

- **Billing-authority semantics win**.
- Preserve shared smoke-runner registrations from every lane.
- Do not apply the manual-bKash uniqueness migration until the known paid-history duplicate is explicitly reconciled.

### Invite

For `claim-invite-code`, invite migrations and invite smoke:

- **Invite-authority semantics win**, after the owner-role guard is added.
- Generated Supabase types must be regenerated/reconciled after all migrations rather than choosing one branch's generated file.

### Shared files

- `supabase/migration-drift-policy.json`: **union every valid exception**, never choose one side.
- `scripts/run-rls-smoke.mjs`: **union smoke registrations**.
- `package.json`: preserve billing/invite scripts; then apply #367 dependency versions/override fix.
- `package-lock.json`: regenerate once from the final package graph with the pinned toolchain; do not resolve by choosing a lane's lock wholesale.
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
- commerce reconciliation preflight (`supabase/tests/commerce_hardening_preflight.sql`);
- all registered DB preflight/smoke gates, including commerce function-security smoke;
- authoritative v3 order negative + positive-path DB tests, including non-zero option price delta;
- delivery-city tamper tests and first-store safe delivery defaults;
- structured manual-payment reference + replay-ledger compatibility and backup/restore proof;
- payment reservation abandonment/retry/cancel + bKash concurrency proof;
- durable exactly-once resource release and unresolved-provider cancellation rejection;
- billing preflight/postdeploy gates after historical provider-reference reconciliation;
- invite atomicity concurrency smoke + owner-role negative proof;
- direct order mutation negative proof;
- manual payment duplicate-reference negative proof;
- coupon same-code/two-store positive proof plus public enumeration negative proof;
- recovery queue duplicate-touch and direct-mutation negative proof;
- #367 `npm audit` + image optimizer smoke.

After migrations deploy, refresh the production migration ledger and remove `pending-production` drift exceptions only for migrations actually present in production.

## Current known commerce validation state

Commerce pre-convergence head `e5c3547...` completed 1,030 tests with 1,028 pass / 2 inherited failures; both failures reproduce on frozen R4. Commerce-focused suites, typecheck, lint, diff-check and drift guard were clean before the later migration/docs/smoke/preflight-only commits.

The version-controlled read-only commerce reconciliation preflight at `768e824...` has been executed against production and completes without raising a blocker. No production mutation was performed.

The search-path metadata assumption used by the new function-security smoke matches production PostgreSQL's existing `proconfig` representation (`search_path=...`). The search-path migration itself remains pending production.

GitHub Actions on current commerce head remain infrastructure-blocked before runner allocation (`runner_id=0`, empty runner, zero steps), so a red workflow without executed steps is not release evidence either way.

## Release decision

**NO-GO** until the outstanding P0 follow-ups above are pushed and accepted, #314 historical reconciliation is completed, #367 is fixed, all lanes converge on one exact release SHA, migrations are applied in a controlled rollout, database/postdeploy smokes pass, and Runtime 7 regression verification is completed against that exact integrated SHA.

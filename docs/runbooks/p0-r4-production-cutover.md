# P0 + R4 Production Cutover Runbook

Status: release-gate coordination document. No production mutation is authorized by this file alone.

## Preconditions

- Runtime-7 verifier is green on the exact integrated release SHA.
- All eight canonical P0s have accepted implementation evidence and integrated regressions.
- #314 historical duplicate manual-bKash identity has been reconciled from finance/provider-authoritative evidence.
- #367 dependency/image-optimizer gate is green on the exact integrated release SHA.
- Final accepted R4 hardening SHA is explicit; no blind rebase of R4 or P0 is permitted.
- Migration drift is green and the final migration-policy file is the union of all accepted lane entries.
- Production deployment target SHA, app artifact, and Edge Function revisions are recorded before checkout is reopened.

## Pre-cutover read-only checks

1. Re-run Billing preflight and confirm zero unresolved duplicate/manual identity defects.
2. Review every currently enabled delivery configuration lacking structured primary-city membership; do not rewrite fees/thresholds heuristically.
3. Confirm no active bKash reservation/reconciliation backlog requires manual handling.
4. Confirm no unused privileged platform invite lacks the identity-binding required by the accepted Invite migration.
5. Confirm production still matches the expected pre-migration schema/ACL baseline and no out-of-band migration has appeared.
## Maintenance and migration sequence

1. Enter a controlled checkout maintenance/drain window; stop new checkout attempts and allow in-flight requests to settle.
2. Snapshot the exact production app SHA, Edge Function revisions, migration ledger, and relevant read-only reconciliation counts.
3. Apply accepted migrations strictly by timestamp. Current expected order begins:
   - `20260914140000_lock_store_invoice_client_authority_308.sql`
   - `20260914140500_manual_bkash_transaction_replay_guard_314.sql`
   - `20260914161500_r4_section_studio_variant_options.sql`
   - `20260914200500_atomic_invite_claim_authority_323.sql`
   - `20260914201500_p0_authoritative_order_boundary.sql`
   - `20260914203000_payment_reservation_lifecycle_317_327.sql`
4. Continue with accepted later R4 commerce-hardening migrations in chronological order; do not skip or reorder overlapping authority migrations.
5. Run rollback-only / read-only DB smoke after each authority group before deploying application code.
6. Abort the cutover on any unexpected migration, ACL, constraint, duplicate-identity, or reconciliation failure; do not partially reopen checkout.

## Application and Edge deployment

- Deploy the exact integrated web/app artifact only after its required DB contracts are present.
- Deploy the matching `bkash-payment` Edge Function only after payment lifecycle migration + smoke succeed.
- Deploy the matching `claim-invite-code` Edge Function only after atomic invite migration + smoke succeed.
- Keep R4 request/access/cart hardening while preserving P0 Order as monetary truth and P0 Payment as reservation/provider-execution truth.
- Do not allow a stale instance to continue authoring new checkout orders through legacy v1/v2 order RPCs during the drain/cutover window.
## Postdeploy authority verification

- #308: authenticated/anon cannot INSERT/UPDATE/DELETE settlement truth; governed positive settlement still succeeds.
- #314: normalized manual-bKash replay is globally unique and legitimate same-obligation retry is idempotent.
- #323: concurrent invite claims have exactly one winner; revoked/expired/wrong-email/owner-valued invites fail; grant failure rolls claim back.
- #309: shipping city + merchant structured membership determines delivery charge; changing browser zone/fee assertions cannot lower payable truth.
- #310: disabled/disconnected methods fail; structured manual reference is persisted; prepaid benefits cannot be obtained from free-form notes.
- #318: stable option IDs resolve to merchant-authored commercial options; stale/tampered IDs or price assertions fail; legitimate non-zero delta persists correctly.
- #317: abandoned redirect reservations expire and release stock/coupon at most once; COD/manual semantics remain intentionally non-expiring where designed.
- #327: one durable execute winner exists before provider execute; uncertain outcomes quarantine; duplicate payment/transaction identity cannot double-settle.

## Legacy-path retirement

1. Prove all deployed app/Edge instances call the canonical lifecycle wrapper -> authoritative v3 path.
2. Search the deployed release source for runtime references to `create_store_order_with_stock` / `_v2`; tests/docs are not runtime callers.
3. Revoke `service_role` execute on superseded legacy order-creation RPCs, or replace them with an equivalently governed compatibility shim.
4. Re-run positive checkout and idempotent retry after legacy retirement.
5. Keep checkout closed if any stale deployment can still call retired authority.

## R4 + data compatibility regressions

- Preserve P0 `optionIds`, `commercial_options`, `fulfillment_type`, `delivery_zone`, structured manual provider/reference, and reservation fields through R4 cart/checkout/order hydration.
- R4 manual-payment replay guard must consume structured new-order payment identity; `notes` parsing may exist only for historical/backfill handling.
- Operational backup/restore must round-trip structured manual-payment fields without making restored historical references reusable.
- R4 governed order-status mutations must remain forward-only and compatible with Payment's unresolved-provider cancellation guard.
## Final release gates before reopening checkout

- Runtime-7 contract verifier passes on the exact integrated SHA.
- Full relevant repository suite, typecheck, migration drift, focused DB smoke, and production build pass on that exact SHA.
- #367: patched Next/Sharp graph is reproducible with pinned Node/npm; no critical/high image-optimizer advisory remains; local + allowed remote image smoke passes.
- Required hosted checks are rerun after external account/runner blockers are cleared; distinguish platform failure from code failure.
- The six currently enabled delivery configurations lacking structured primary-city aliases have been explicitly reviewed for launch behavior.
- Billing postdeploy verification is green after authoritative #314 reconciliation.
- Exact app SHA, Edge revisions, applied migrations, and postdeploy evidence are attached to #320.

## Runtime 8 decision

GO only when all gates above are green and no unresolved P0 authority or release-security dependency remains.

CONDITIONAL-GO may only be used for a non-security, non-authority condition with an explicit bounded operational mitigation; do not use it to waive #308/#309/#310/#314/#317/#318/#323/#327 or #367.

NO-GO if any monetary authority, settlement authority, invite authority, reservation/provider state, migration composition, dependency-security, or production-evidence gate remains unresolved.

## Current pre-cutover candidate — 2026-09-15

P0 authority convergence is locally green on `release/p0-integrated-2026-09-15`. The integrated graph contains the exact Billing, Order, Payment, Invite and #367 dependency heads recorded in the coordination handoff.

Before declaring the final deploy SHA, re-run the Runtime-7 suite after the frozen R4 reconciliation. The already-proven P0 candidate baseline is: 844/844 tests, 25/25 authority contracts, typecheck PASS, lint 0 errors, migration drift PASS, audit 0 vulnerabilities, production build PASS, commerce transactional DB composition PASS, and Invite atomicity/staff-seat DB smoke PASS.

Do not advance from this checkpoint to production until #314 historical finance reconciliation and hosted CI/account recovery are both complete. The database-first sequencing and Edge/app ordering above remain binding.

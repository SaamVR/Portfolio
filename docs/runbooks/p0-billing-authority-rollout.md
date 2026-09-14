# P0 billing authority production rollout

This runbook closes the operational gap for P0 issues #308 and #314 after branch `release/p0-billing-authority` is approved.

Release PR: `#364` from branch `release/p0-billing-authority`.

## Non-negotiable invariants

- Do not deploy #314 while duplicate normalized manual bKash transaction identities remain.
- Do not delete, void, downgrade, or alter the amount/plan/status of a paid invoice merely to satisfy the unique index.
- Do not guess which duplicate invoice owns the real provider transaction.
- Reconciliation must be based on the original bKash receipt/statement or another finance-authoritative source.
- Preserve an audit note describing the correction and the operator/reconciliation ticket.
- Apply #308 before #314 after reconciliation is complete.

## Current production blocker

Read-only inspection on 2026-09-14 found exactly one duplicate normalized manual bKash transaction group involving two paid invoices on two stores. Both historical rows have no `reviewed_at`, `reviewed_by`, or `review_note`, so database history alone cannot establish which row owns the provider transaction.

The stores' current subscription plans also no longer match those historical invoice plans consistently. Current subscription state therefore must not be used to choose the authoritative invoice.

Historical source reconstruction adds one useful provenance clue, but **not payment proof**: the July 12 manual-bKash merchant UI inserted only `pending` invoices, while the platform control plane approval action changed an invoice to `paid`, set `paid_at`, and set `billing_period_end` one month later. The two duplicate production rows became paid 118 seconds and 10 seconds after creation respectively, and both have the exact one-month billing-period shape. This is consistent with the old platform approval UI, but that UI did not record reviewer identity at the time and performed no provider verification in the database. Both duplicate invoices belong to stores owned by the same account. That strengthens the historical test/admin-submission hypothesis, but it still does not identify the real bKash payment and must not be used as a reconciliation decision. Do not use this shape to choose the authoritative payment; use it only to guide the operator toward historical admin/test records and the external bKash source.

Use the query below immediately before reconciliation; do not rely on the September 14 snapshot.
## Reconciliation discovery query

```sql
WITH duplicate_groups AS (
  SELECT upper(btrim(provider_invoice_id)) AS normalized_id
  FROM public.store_invoices
  WHERE provider = 'bkash_manual'
  GROUP BY upper(btrim(provider_invoice_id))
  HAVING count(*) > 1
)
SELECT i.id, i.store_id, s.name AS store_name,
       i.plan_id, i.amount, i.currency, i.status,
       i.provider, i.payment_method, i.provider_invoice_id,
       i.paid_at, i.created_at, i.reviewed_at, i.reviewed_by, i.review_note
FROM public.store_invoices AS i
JOIN duplicate_groups AS d
  ON d.normalized_id = upper(btrim(i.provider_invoice_id))
LEFT JOIN public.stores AS s ON s.id = i.store_id
WHERE i.provider = 'bkash_manual'
ORDER BY d.normalized_id, i.created_at, i.id;
```

Expected pre-reconciliation state for this rollout is one group / two paid rows. If the result differs, stop and investigate the new state before applying either reconciliation SQL or #314.
## Reconciliation decision

For each duplicated normalized provider transaction, compare both invoices with the original bKash transaction record. Record:

1. the authoritative invoice ID;
2. the non-authoritative invoice ID;
3. the authoritative bKash TrxID;
4. if the second invoice represents a different real payment, that payment's actual TrxID;
5. the finance/operator evidence used to decide;
6. the operator identity and ticket/reference.

Correct only facts that the evidence proves. The common safe case is that one invoice was entered with the wrong transaction ID; update that row to its actual transaction ID and append a reconciliation note. If the evidence shows that the payment method/provider itself was recorded incorrectly, correct those fields instead. Do not invent a replacement provider transaction ID solely to satisfy uniqueness.

Example shape after the operator has verified the actual replacement ID:

```sql
BEGIN;
UPDATE public.store_invoices
SET provider_invoice_id = upper(btrim('<VERIFIED_ACTUAL_TRXID>')),
    review_note = concat_ws(E'\n', nullif(review_note, ''),
      'P0 #314 reconciliation: corrected provider transaction identity; evidence=<REFERENCE>'),
    updated_at = now()
WHERE id = '<NON_AUTHORITATIVE_INVOICE_UUID>'
  AND provider = 'bkash_manual'
  AND status = 'paid';
-- Inspect the row and duplicate query again before COMMIT.
COMMIT;
```

Never run this template until `<VERIFIED_ACTUAL_TRXID>` is confirmed from an authoritative payment source.
## Pre-deploy gate

Preferred executable gate (read-only):

```bash
npm run billing:authority:preflight
```

The command uses a configured database URL when present, otherwise the linked Supabase project. It exits nonzero unless all three conditions below are zero.

After reconciliation, all three queries below must be zero:

```sql
SELECT count(*) AS duplicate_groups
FROM (
  SELECT upper(btrim(provider_invoice_id))
  FROM public.store_invoices
  WHERE provider = 'bkash_manual'
  GROUP BY upper(btrim(provider_invoice_id))
  HAVING count(*) > 1
) AS duplicates;

SELECT count(*) AS missing_identity
FROM public.store_invoices
WHERE provider = 'bkash_manual'
  AND (provider_invoice_id IS NULL OR btrim(provider_invoice_id) = '');

SELECT count(*) AS invalid_identity
FROM public.store_invoices
WHERE provider = 'bkash_manual'
  AND (char_length(btrim(provider_invoice_id)) > 128
       OR btrim(provider_invoice_id) !~ '^[A-Za-z0-9]+$');
```

If any value is non-zero, do not apply #314.

## Deployment order

Keep PR #364 draft while the production database is still on the vulnerable contract. The database changes are the authority boundary; do not deploy the new application head first and leave a window where route-level protection exists without the database invariant. Repository re-trace found merchant-facing `store_invoices` use outside governed server routes is read-only, while billing settlement routes use trusted server authority.

If merging `main` automatically deploys the app, use this order:

1. Re-run the reconciliation discovery query and `npm run billing:authority:preflight`; it must pass.
2. Apply `20260914140000_lock_store_invoice_client_authority_308.sql`.
3. Verify authenticated/anon invoice mutation privileges are absent and `stores.plan` client changes are blocked.
4. Apply `20260914140500_manual_bkash_transaction_replay_guard_314.sql`.
5. Run `npm run billing:authority:postdeploy`; it must pass.
6. Run `npm run test:db` against the migrated environment.
7. Re-run the duplicate query; expected result is zero groups.
8. Verify one legitimate server-side/manual-review settlement path still succeeds.
9. Only now mark PR #364 ready, merge it, and deploy the exact approved application SHA.
10. Smoke manual-invoice retry, platform manual review, and the normal billing read UX on the deployed app.
11. Refresh the production migration ledger.
12. Remove the two `pending-production` drift exceptions only after the ledger proves both migrations are applied.
13. Run `npm run migrations:drift`; expected result is green without those exceptions.

## Post-deploy privilege verification

Run the executable read-only verifier first:

```bash
npm run billing:authority:postdeploy
```

It validates client/server invoice grants, all authority triggers, the manual-bKash check constraint and unique index, and zero duplicate normalized identities. Then inspect the grant query below for operator evidence.

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'store_invoices'
  AND grantee IN ('anon','authenticated','service_role')
ORDER BY grantee, privilege_type;
```

Expected: authenticated has read authority only; service role retains server-side billing DML authority. Do not declare #308 production-closed from policy names alone—verify effective grants and the DB smoke.
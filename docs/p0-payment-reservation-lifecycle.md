# P0 Payment + Reservation Lifecycle Handoff

Branch: `release/p0-payment-lifecycle`
Production base: `4caa14c351cf0f7071e5b4ea14fb069a79403215`
Owned blockers: #317 and #327

## Authority model

Automated redirect bKash orders reserve stock/coupon capacity for a finite order lease. COD and non-redirect/manual methods remain accepted orders without an automated payment-expiry lease.

Order reservation states:
- `accepted`: non-redirect order; no automated reservation expiry.
- `reserved`: pending redirect payment with a finite lease.
- `consumed`: provider success was durably finalized and the order is confirmed.
- `released`: cancellation/final failure/known-safe expiry atomically restored stock and coupon capacity.
- `reconciliation_required`: an irreversible provider boundary may have been crossed; capacity remains quarantined until provider status proves success or terminal failure.

Payment attempt states:
`creating -> created -> executing -> succeeded`
with safe terminal branches to `failed`, `cancelled`, or `expired`; uncertain execution moves only to `reconciliation_required`.

## Exactly-once rules

Order cancellation is the single inverse transition for stock and coupon restoration. The cancellation trigger runs only when status changes into `cancelled`, so repeated expiry/failure processing cannot restore twice.

Every payment lifecycle RPC locks the order row before its attempt row. The durable `created -> executing` database transition commits before the Edge Function can call bKash Execute, so concurrent losers cannot cross the irreversible provider boundary.
Provider `paymentID` and transaction identities are unique globally within a provider, not tenant-scoped. Advisory transaction locks serialize the duplicate check before binding/finalization. Duplicate provider identities fail closed; duplicate transaction identities are quarantined for reconciliation.

The expiry worker never frees an `executing` or `reconciliation_required` attempt. A stale `executing` claim is promoted to reconciliation instead of being guessed failed.

## bKash lifecycle

Create:
1. Prepare/reuse the authoritative attempt under the order lease.
2. Only a `creating` winner calls provider Create Payment.
3. Bind the returned provider `paymentID` and checkout URL to that attempt.
4. A provider session expires independently of the longer order lease, allowing a fresh session without re-reserving inventory.

Execute:
1. Grant Token may happen first because it is reversible/non-charging.
2. Claim the exact `(store, order, provider, paymentID)` attempt durably.
3. Only the claimant calls bKash Execute.
4. Provider success finalizes attempt + order in the database.
5. Timeout/unknown or local-persistence failure becomes `reconciliation_required`.
6. Reconciliation uses Query Payment and never retries Execute.
7. `Initiated` is non-terminal. Only provider-proven terminal failure may release the reservation.

Callback cancellation/failure can release only when the exact bound payment identity is present and the attempt has not crossed execution. Missing identity or an in-flight/uncertain attempt is not advertised as retry-safe.
## Deployment contract

Do not deploy the Edge Function before the database migration. The Edge implementation depends on the new lifecycle RPCs.

Required order:
1. Apply `20260914203000_payment_reservation_lifecycle_317_327.sql` in staging.
2. Run `payment_reservation_lifecycle_smoke.sql` in a rollback-only staging transaction.
3. Verify the minute expiry cron and service-role-only lifecycle grants.
4. Deploy the matching `bkash-payment` Edge Function.
5. Deploy the application callback/order-create changes.
6. After production migration ledger refresh, remove the temporary migration-drift exception.

No destructive down-migration is recommended once live payment attempts exist. Application rollback should preserve the additive authority schema and use a compatible Edge version.

## Cross-lane dependency

Issue #314 remains Lane A-owned billing authority. This lane does not modify `store_invoices` or manual SaaS settlement authority. It applies the same external-identity principle inside `storefront_payment_attempts`: provider payment/transaction identities are provider-global. A future universal settlement ledger can unify the two domains without weakening this lane's constraints.

## Validation scope

Automated coverage includes abandoned payment expiry, stock and coupon restoration, same-client replay, provider cancellation/failure, late callback, simultaneous execute claims, unbound second payment ID, timeout after provider success, local finalization failure, duplicate callbacks, stale sessions, session recreation boundaries, and reconciliation success/failure behavior.
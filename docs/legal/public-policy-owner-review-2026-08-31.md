# EZComo public policy owner-review record

Status: **APPROVED FOR CONFIGURATION-GATED PAID-BETA ACTIVATION**  
Approved binding version: `2026-09-04-paid-beta-1`  
Review/public fallback version until activation: `2026-08-31-review-1`  
Public routes: `/terms`, `/privacy`, `/billing-policy`, `/support`

This record supersedes the earlier pending checklist. The owner has reviewed the exact staged Terms, Privacy Policy, and Billing, Renewal, Cancellation & Refund Policy and instructed the project to finalize this gate. Business/legal identity values are configuration, not source-code constants that must be supplied in chat.

## Admin-configurable identity contract

- The CMS Admin `Platform identity, legal policy & messaging` settings card owns the platform `siteName` and `legalOperatorName` values.
- The Admin API persists those values through the guarded platform-configuration path.
- Policy activation is intentionally refused while the legal operator value is blank.
- Activation snapshots the current site name and legal operator name into the binding policy record.
- Changing either Admin value after activation does **not** rewrite an accepted policy version. The Admin UI marks the binding snapshot as requiring reissue, and a material contractual identity change must use a new policy version/effective date and, where required, fresh merchant acceptance.
- The exact legal/operator value therefore remains an operational Admin configuration prerequisite for activation, not unfinished policy engineering and not a value to fabricate in repository history.
- No public business street address is required by this approved product contract; platform contact continues through `/support` unless a later approved policy version adds another public contact identity.

## Owner-approved commercial/legal contract

The owner-approved `2026-09-04-paid-beta-1` policy set preserves the following decisions and boundaries:

- subscriptions use renewal preference ON by default and merchants may opt out;
- opt-out renewal reminder is an attempted email + SMS/phone reminder around three days before expiry, with no delivery guarantee;
- renewal preference does not authorize silent or automatic bKash debit; reusable recurring payment authorization remains a separate future provider-supported capability;
- successful same-plan monthly renewal adds one calendar month from an existing future expiry; annual renewal adds 12 calendar months; prepaid time is preserved;
- plan changes do not promise cash proration, partial-period refunds, or account credit unless expressly offered;
- the EZComo subscription refund window is seven calendar days for an initial paid subscription charge or paid renewal charge, subject to the staged exclusions and mandatory legal rights;
- Core Service availability commitment is 99% monthly, measured in completed five-minute slots only after production monitoring activation, with the staged merchant-specific and independent-third-party exclusions;
- support remains best-effort unless a separate written SLA is later approved;
- no fixed universal data-retention period is promised;
- warranty/liability limitations apply only to the lawful extent and no artificial monetary liability cap is created;
- Bangladesh law governs the platform policy set; mandatory private arbitration is not required;
- persisted policy acceptance is versioned and jurisdiction-aware;
- material policy changes receive a new version/effective date rather than mutating historical accepted terms.

## Implementation already production-complete

- PR #252: renewal preference, opt-out/private reminder contact, reminder queueing, prepaid-period preservation, and DB-authoritative renewal settlement.
- PR #253: versioned policy infrastructure, immutable acceptance snapshots, CMS-managed platform identity, activation guard, availability-monitoring infrastructure, and modular messaging-provider runtime.
- PR #254: jurisdiction-aware merchant consent with merchant-selected business country authoritative, Vercel geo suggestion-only, and rollout-gated signup/paid-checkout enforcement.

## Activation boundary

Owner approval of the policy text does **not** bypass runtime safety guards. Before binding is activated for paying merchants:

1. An authorized platform admin sets the real site/legal-operator identity in CMS Admin.
2. The platform confirms the approved policy version and immutable identity snapshot.
3. Availability monitoring is deliberately started before relying on the 99% measured commitment.
4. Policy binding and jurisdiction enforcement are enabled only through their guarded production controls and verified end to end.
5. SMS/OTP/transactional SMS remain disabled unless the selected provider is separately configured, verified, and the relevant delivery/auth cutover gates have passed.
6. The final #202 production GO checklist is rerun against the exact production release.

## Approval record

- Policy version approved: `2026-09-04-paid-beta-1`
- Owner approval instruction: `finalize this now`
- Approval date: `2026-09-04`
- Policy source remains versioned in repository history; future material changes require a new version and effective date.

# EZComo public policy owner-review checklist

Status: **PENDING — blocks paid-beta legal sign-off**  
Technical review version: `2026-08-31-review-1`  
Public routes: `/terms`, `/privacy`, `/billing-policy`, `/support`

This file records policy facts that must be supplied or explicitly approved by the business owner/legal reviewer. Do not replace unresolved items with guessed boilerplate, placeholder company facts, or jurisdiction assumptions.

## Verified technical/public facts already implemented

- Public plan names, prices, trial duration, and store limits can be loaded from authoritative `cms_plans` data.
- Payment/courier connection state distinguishes configuration from verification; provider names are not proof of a live connection.
- Storefront customer contact remains store-scoped through `/contact` and `contact_messages`.
- Platform support is a separate `/support` intake recorded as sanitized `public_support` platform incidents for platform-admin follow-up.
- Public support has validation, honeypot protection, requester/email rate limits, and does not require a store context.
- Current infrastructure disclosures can identify Supabase, Vercel, Cloudinary, and Google/Firebase authentication where used; external payment/courier/messaging/domain providers remain configuration-dependent.

## Owner/legal decisions required before #202 GO

- [ ] Confirm the legal/operator entity name that should contract with merchants.
- [ ] Confirm any public business/contact identity or address that should appear in legal policies.
- [ ] Approve governing law, jurisdiction, dispute forum, and any arbitration language if applicable.
- [ ] Approve warranty/disclaimer, limitation-of-liability, indemnity, and termination language.
- [ ] Approve refund eligibility and exceptions.
- [ ] Approve proration rules, if any.
- [ ] Approve cancellation and downgrade timing/effects.
- [ ] Confirm renewal behavior and any required renewal notice language.
- [ ] Confirm billing-dispute handling and escalation wording.
- [ ] Approve a data-retention/deletion schedule or confirm that no fixed public duration should be promised.
- [ ] Confirm jurisdiction-specific privacy rights/processes that must be published.
- [ ] Approve any support response or escalation commitments; do not publish an SLA unless operationally supportable.
- [ ] Decide the final binding signup consent mechanism and exact policy version merchants accept.
- [ ] Decide whether consent/version acceptance must be persisted in the database before paid signup.
- [ ] Review named subprocessors and decide whether a maintained subprocessor list is required.
- [ ] Approve the final policy text and replace the public `Owner/legal review pending` marker with an approved status/version.
- [ ] Record approver and approval date in repository documentation before clearing #204/#202.

## Explicitly not asserted by the review version

Until the items above are approved, public policy pages must not state or imply a specific operator registration, governing jurisdiction, arbitration requirement, liability cap, certification, guaranteed refund, proration entitlement, `cancel anytime` promise, automatic-renewal rule, fixed retention period, guaranteed uptime, support SLA, or guaranteed security/outcome.

## Consent note

The signup surface currently provides visible links to the review-version Terms and Privacy disclosures. It intentionally does **not** represent those review documents as the final binding paid-beta consent. Final acceptance wording and any persisted acceptance/version record remain owner/legal decisions above.

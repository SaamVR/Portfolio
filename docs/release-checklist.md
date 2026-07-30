# Release Checklist

Use this checklist for every launch branch promotion.

Status note on Thursday, July 30, 2026:

- DB smoke is currently green
- lint is currently green
- production build is currently green
- protected-route browser smoke is currently green
- positive notification live proof is still pending
- positive Cloudflare custom-domain and SSL proof is still pending

## Required CI

- Quality Gate passed: `npm ci`, typecheck, unit tests, lint, production build, dependency audit.
- Database smoke workflow passed.
- Preview smoke workflow passed.
- Secret scan workflow passed.

## Exact local closeout sequence

Run this exact order before the final launch verdict:

```powershell
supabase.cmd db push --linked
npm.cmd run test:db
npm.cmd run lint
npm.cmd run build
npm.cmd run test:preview -- --grep "admin hard refresh restores representative routes without getting stuck on access recovery"
```

If you need the full representative preview smoke instead of only the protected-route recovery proof:

```powershell
npm.cmd run test:preview
```

## Supabase evidence

- Migration list matches local and remote.
- New migrations applied to the linked project.
- RLS and grant smoke tests passed for affected tables.
- Invoice and subscription consistency query returns zero mismatches.
- Edge Functions deployed when changed.
- Required environment variables are present in the target environment.

## Live smoke evidence

- Admin login works.
- Merchant dashboard loads for a real store.
- Storefront loads for a published or active-trial store.
- Checkout and payment initialization work for the configured payment method.
- Courier connection list and booking route work for a test order when courier changes are included.
- Analytics rejects invalid ingestion and accepts one valid public-store event.

## Deferred live-proof gaps

Do not mark full launch certification complete until these are captured:

- one positive live notification receipt proof
- one positive live merchant alert proof
- one positive Cloudflare custom-domain activation proof
- one positive SSL-active proof on a real custom hostname

## Launch notes

- Record migration IDs:
- Record Edge Function names and deployment time:
- Record environment variable changes:
- Record live smoke URLs and timestamps:
- Record deferred items, if any:
- Record rollback notes:

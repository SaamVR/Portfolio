# Database DR tooling drill — 2026-08-31

Issue: #170  
Production baseline at drill start: `054a63704f5e371b87e1276ee237092d457fd2e5`  
Result: **tooling PASS; production DR acceptance NOT YET MET**.

## Purpose

Validate the provider-independent PostgreSQL logical backup/encryption/restore mechanics before using any production database credential. This drill intentionally used disposable local PostgreSQL 17 containers and synthetic rows only.

## Environment

- authorized executor: `samvr`;
- source and target: isolated `postgres:17-alpine` containers on a private Docker network;
- production server version was independently read as PostgreSQL 17.6 for compatibility planning;
- pinned dump/restore client used PostgreSQL 17.x;
- no production database password was available to the executor;
- no production database dump was attempted or claimed.

## Fixture coverage

The synthetic source included durable auth identity data, Storage metadata, a store owner/membership, subscription, product, order, CMS page/block/revision, review, settings, audit history, backup lifecycle history and a private encrypted-credential placeholder. Representative `anon`, `authenticated` and `service_role` grants were added so ACL restoration could be proved.

## Failures found and fixed during the drill

1. **Internal checksum portability** — the first bundle wrote temporary absolute paths into `raw-checksums.sha256`; extraction to a new directory correctly failed verification. Fixed by writing basename-relative checksums.
2. **Auth/application FK ordering** — the first restore attempted the full application archive before durable `auth.users`; post-data FK creation correctly failed. Fixed by phased restore: app pre-data → auth data → app data → app post-data.
3. **Dirty-target repeatability** — `pg_restore --clean` could not reliably drop parent tables while constraints from the failed partial restore still existed. Fixed by requiring explicit isolated application-schema reset (`public`/`private` drop cascade) before restore.
4. **Authorization recovery** — the initial archive omitted ACLs. Fixed by preserving application ACLs and adding a source/target SHA-256 ACL fingerprint to the manifest acceptance gate.
5. **Artifact contract downgrade** — older artifacts could otherwise reach mutation before discovering missing ACL metadata. Fixed with exact contract `2026-08-31.2` validation before database mutation.

## Final exact-contract result

Final encrypted `.2` generation:

- bundle size: 6,152 bytes (tiny synthetic fixture; not representative of production size);
- external encrypted-artifact SHA-256 verified;
- internal dump-member SHA-256 values verified;
- manifest critical row counts verified after restore;
- application ACL fingerprint verified after restore;
- restored ACL spot checks: anonymous product read=true, authenticated product write=true, service-role private credential read=true;
- isolated restore script duration: **3 seconds** for the tiny fixture;
- invariant SQL returned `ok=true`;
- violations: orphan owners 0, orphan memberships 0, orphan orders 0, cross-store CMS blocks 0, cross-store review product/order references 0, plan-projection mismatches 0, duplicate homepages 0.

The `.2` production-label safety test exited 78 with `refusing restore: target label looks like production`; a pre/post target checksum was identical, proving refusal occurred before mutation. An older `.1` bundle was also rejected with exit 78 before mutation.

## Production-specific discovery

- Production is PostgreSQL 17.6, so the scripts correctly require PostgreSQL major 17.
- The direct production DB hostname resolved IPv6-only from `samvr`; the regional Supavisor session pooler was IPv4 reachable and is the appropriate route for a future dump from that executor.
- The connected Supabase surface did not expose the database password or an ephemeral read-only database login action.
- A proposed short-lived backup-role write was blocked by the platform safety boundary before execution. No temporary production role was created, and the control was not bypassed.
- Therefore the production `pg_dump`/independent-copy/isolated-production-data restore acceptance gate remains open.

## Independent storage and media

This local drill wrote encrypted artifacts to local staging only. It did **not** prove independent external storage, so local output does not count as a completed production backup.

The bundle protects Storage database metadata but not Storage/Cloudinary binary objects. Asset recovery remains a documented separate loss boundary until a binary export/restore mechanism is demonstrated.

## Security observation

Supabase advisory tooling reported RLS disabled on `private.store_courier_credentials`. Direct privilege checks showed `anon` and `authenticated` currently have no SELECT or INSERT privilege on that table, so no automatic RLS change was made during this DR batch. Treat RLS enablement/policies as separate defense-in-depth hardening; do not alter credential access semantics without a focused test.

## Remaining #170 acceptance work

1. Provide production DB access to the authorized executor via a local mode-0600 pgpass file (do not paste the password into chat/logs).
2. Run `backup-postgres.sh` against production through the appropriate PostgreSQL 17 connection endpoint.
3. Copy the encrypted artifact + manifest + checksum to independent storage and verify checksum after re-read.
4. Restore that exact artifact into a fresh isolated target with all external side effects disabled.
5. Run manifest/ACL verification, invariant SQL and authenticated application read smoke.
6. Record actual backup age and end-to-end production-sized restore duration; only then set supported RPO/RTO claims and close #170.

# Database disaster-recovery runbook

Status: **implementation validated on isolated PostgreSQL 17 fixtures; production drill still required**.

This runbook is the provider-independent database DR path for EZComo/EcomCMS while production remains on a Supabase plan without a relied-upon downloadable backup/PITR baseline. Merchant store export/import is not a substitute for this database-level recovery path.

## Recovery targets

Until a more frequent mechanism is proven, the intended schedule is one verified logical backup per day:

- Tier A — orders, payment/COD/return/billing transaction truth: target RPO <= 24 hours.
- Tier B — merchant catalog, CMS, settings, memberships, subscription/entitlement configuration: target RPO <= 24 hours.
- Tier C — analytics and rebuildable/derived state: recovery is best-effort and may exceed 24 hours.
- RTO is **measured, never assumed**. Do not publish an RTO until a production-sized isolated restore drill records it.

A missed scheduled generation means the advertised RPO was not met and must be treated as an operational incident.

## Artifacts and scope

`scripts/dr/backup-postgres.sh` requires PostgreSQL 17 on both source and pinned dump client. It creates an AES-256 encrypted bundle containing:

- full schema + data for application-owned `public` and `private` schemas, including application ACLs;
- durable identity rows required to preserve accounts: selected `auth` tables only;
- Supabase Storage bucket/object **metadata** only;
- an internal SHA-256 file for the raw dump members;
- a manifest containing source label, UTC generation, PostgreSQL/client version, migration version, critical row counts and application ACL fingerprint.

The encrypted artifact, external manifest and external SHA-256 sidecar are written with mode 0600. Raw dumps live only in a mode-0700 temporary directory and are removed on exit.

**Not included:** Storage/Cloudinary binary object contents, transient auth sessions/refresh tokens, provider-managed platform internals, or external provider state. Database URLs are not asset recovery. Maintain a separate media/export policy and never describe media as DR-protected until binary recovery is demonstrated.

## Credential boundary

Never pass database passwords on the command line, in GitHub, chat, build logs or issue comments.

- Put the database credential in a local `pgpass` file with mode 0600.
- Point `DR_PGPASSFILE` / `DR_TARGET_PGPASSFILE` at that file.
- Keep the encryption passphrase in a separate mode-0600 file and store it separately from backup artifacts.
- On IPv4-only workers, use Supabase's session-mode pooler if the direct database hostname is IPv6-only.
- The backup executor must have the minimum database privileges necessary to read all protected rows, including RLS-protected business data. Do not weaken application RLS merely to make backups work.

## Generate a backup

Prerequisites: Docker, GPG, SHA-256 utilities, Python 3, a reachable PostgreSQL 17 endpoint, a valid pgpass file and an encryption-passphrase file.

Example environment (values are placeholders):

```bash
export DR_PGHOST='<session-pooler-or-db-host>'
export DR_PGPORT='5432'
export DR_PGUSER='<backup-user>'
export DR_PGDATABASE='postgres'
export DR_PGPASSFILE='/secure/path/production.pgpass'
export DR_ENCRYPTION_PASSPHRASE_FILE='/secure/path/dr-encryption.pass'
export DR_BACKUP_ROOT='/secure/staging/ecomcms-db'
export DR_SOURCE_LABEL='production'
export DR_PG_IMAGE='postgres:17-alpine'
./scripts/dr/backup-postgres.sh
```

Success means all of the following:

1. the script exits zero;
2. `<generation>.tar.gpg` exists;
3. the external `.sha256` sidecar verifies the encrypted artifact;
4. the manifest reports PostgreSQL 17, a migration version, critical counts and an ACL fingerprint;
5. the encrypted artifact + manifest + checksum are copied to an **independent storage location** and re-read/checksum-verified there.

Do not count a local-only artifact or a successful `pg_dump` exit as a completed production backup.

## Retention and scheduler

Initial target after automation is enabled: retain 7 daily generations and 4 weekly generations, subject to storage budget validation. Never delete the last known-good verified generation.

Current GitHub Actions runner failures make Actions unsuitable as the sole DR scheduler. Prefer an already-authorized persistent machine or another low-cost scheduler that can protect the pgpass and encryption files. Alert on missed generation, checksum failure, upload failure or retention failure.

## Isolated restore only

Restore must target a disposable/sacrificial PostgreSQL 17 environment. Disable/neutralize outbound email, payment, courier, webhook, queue and notification side effects before application smoke testing.

The script contains multiple destructive interlocks:

- `DR_TARGET_ISOLATED=YES` is mandatory;
- a target label containing `prod` or `production` is rejected;
- set `DR_FORBIDDEN_HOST` to the production database/pooler host; an exact host match is rejected;
- `DR_RESET_MANAGED_DATA=YES` is mandatory;
- `DR_RESET_APPLICATION_SCHEMAS=YES` is mandatory;
- only DR contract `2026-08-31.2` is accepted.

The reset deliberately truncates the selected durable `auth` and Storage metadata tables and drops `public`/`private` schemas on the isolated target. Never point it at a shared environment.

Restore order is intentional:

1. verify encrypted-artifact SHA-256;
2. decrypt bundle and verify internal member SHA-256 values;
3. verify contract version and PostgreSQL 17 target;
4. reset isolated managed data and application schemas;
5. restore application **pre-data** schema;
6. restore durable `auth` rows;
7. restore application data;
8. restore application **post-data** constraints/indexes/ACLs;
9. restore Storage metadata;
10. compare critical counts and ACL fingerprint to the manifest.

Example:

```bash
export DR_ARTIFACT='/secure/verified/ecomcms-<generation>.tar.gpg'
export DR_CHECKSUM_FILE='/secure/verified/ecomcms-<generation>.sha256'
export DR_ENCRYPTION_PASSPHRASE_FILE='/secure/path/dr-encryption.pass'
export DR_TARGET_PGHOST='<isolated-target-host>'
export DR_TARGET_PGUSER='<isolated-target-admin>'
export DR_TARGET_PGPASSFILE='/secure/path/isolated.pgpass'
export DR_TARGET_LABEL='isolated-drill-2026-09'
export DR_TARGET_ISOLATED='YES'
export DR_RESET_MANAGED_DATA='YES'
export DR_RESET_APPLICATION_SCHEMAS='YES'
export DR_FORBIDDEN_HOST='<production-host>'
./scripts/dr/restore-postgres.sh
```

Then run:

```bash
psql '<isolated connection via pgpass>' -v ON_ERROR_STOP=1 -f scripts/dr/verify-dr-invariants.sql
```

A restore is not accepted if manifest counts/ACL differ, invariant `ok` is false, the target can trigger external side effects, or application smoke tests fail.

## Required invariant review

The supplied SQL checks at least:

- orphan store owners/memberships/orders;
- cross-store CMS page-block references;
- cross-store product-review product/order references;
- subscription plan projection mismatch;
- duplicate homepages per store;
- representative critical row counts.

For a production drill, also inspect representative payment/COD/return historical fields, publication state, billing/entitlement rows, secure connection-table shape (never print ciphertext/secrets), migration compatibility and authenticated application reads.

## Production acceptance gate

Do **not** close #170 or advertise production recoverability until one real production generation has:

- been created with PostgreSQL 17 tooling from the production database;
- been encrypted without retaining raw dumps;
- been copied to independent storage and checksum-verified after re-read;
- been restored into an isolated non-production PostgreSQL/Supabase environment;
- passed manifest count/ACL verification plus `verify-dr-invariants.sql`;
- passed side-effect-disabled app read/auth smoke;
- recorded backup age (achieved RPO) and end-to-end restore duration (measured RTO);
- been deleted from temporary staging after the independent copy is verified.

Record that evidence in a dated attestation and link it from #137 and #202.

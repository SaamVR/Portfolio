#!/usr/bin/env bash
set -euo pipefail
umask 077

required=(DR_ARTIFACT DR_CHECKSUM_FILE DR_ENCRYPTION_PASSPHRASE_FILE DR_TARGET_PGHOST DR_TARGET_PGUSER DR_TARGET_PGPASSFILE DR_TARGET_LABEL DR_TARGET_ISOLATED)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "missing required environment variable: $name" >&2; exit 64; }
done
[[ "$DR_TARGET_ISOLATED" == "YES" ]] || { echo "refusing restore: DR_TARGET_ISOLATED must be YES" >&2; exit 78; }
case "${DR_TARGET_LABEL,,}" in *prod*|*production*) echo "refusing restore: target label looks like production" >&2; exit 78;; esac
[[ -r "$DR_ARTIFACT" && -r "$DR_CHECKSUM_FILE" && -r "$DR_ENCRYPTION_PASSPHRASE_FILE" && -r "$DR_TARGET_PGPASSFILE" ]] || { echo "restore input is unreadable" >&2; exit 66; }

DR_TARGET_PGPORT="${DR_TARGET_PGPORT:-5432}"
DR_TARGET_PGDATABASE="${DR_TARGET_PGDATABASE:-postgres}"
DR_PG_IMAGE="${DR_PG_IMAGE:-postgres:17-alpine}"
DR_DOCKER_NETWORK="${DR_DOCKER_NETWORK:-host}"
DR_RESET_MANAGED_DATA="${DR_RESET_MANAGED_DATA:-NO}"
DR_RESET_APPLICATION_SCHEMAS="${DR_RESET_APPLICATION_SCHEMAS:-NO}"
DR_FORBIDDEN_HOST="${DR_FORBIDDEN_HOST:-}"
[[ -z "$DR_FORBIDDEN_HOST" || "$DR_TARGET_PGHOST" != "$DR_FORBIDDEN_HOST" ]] || { echo "refusing restore: target host equals forbidden production host" >&2; exit 78; }

for cmd in docker gpg sha256sum tar mktemp python3; do command -v "$cmd" >/dev/null || { echo "$cmd is required" >&2; exit 69; }; done
( cd "$(dirname "$DR_ARTIFACT")" && sha256sum -c "$(basename "$DR_CHECKSUM_FILE")" >/dev/null )

work="$(mktemp -d)"
cleanup(){ rm -rf "$work"; }
trap cleanup EXIT INT TERM

gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$DR_ENCRYPTION_PASSPHRASE_FILE" \
  --decrypt --output "$work/bundle.tar" "$DR_ARTIFACT"
tar -C "$work" -xf "$work/bundle.tar"
( cd "$work" && sha256sum -c raw-checksums.sha256 >/dev/null )
contract_version="$(python3 - "$work/manifest.json" <<'PYCONTRACT'
import json,sys
m=json.load(open(sys.argv[1]))
print(m.get('contract_version',''))
PYCONTRACT
)"
[[ "$contract_version" == "2026-08-31.2" ]] || { echo "refusing restore: unsupported DR contract $contract_version" >&2; exit 78; }

run_pg(){
  docker run --rm --network "$DR_DOCKER_NETWORK" \
    -v "$DR_TARGET_PGPASSFILE:/run/secrets/pgpass:ro" \
    -v "$work:/work" \
    -e PGPASSFILE=/run/secrets/pgpass \
    "$DR_PG_IMAGE" "$@"
}

psql_target(){ run_pg psql -X -v ON_ERROR_STOP=1 -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" "$@"; }

server_version="$(psql_target -At -c "select current_setting('server_version')")"
[[ "${server_version%%.*}" == "17" ]] || { echo "expected PostgreSQL 17 target, got $server_version" >&2; exit 70; }

[[ "$DR_RESET_MANAGED_DATA" == "YES" ]] || { echo "refusing restore: DR_RESET_MANAGED_DATA must be YES" >&2; exit 78; }
[[ "$DR_RESET_APPLICATION_SCHEMAS" == "YES" ]] || { echo "refusing restore: DR_RESET_APPLICATION_SCHEMAS must be YES" >&2; exit 78; }
psql_target -c "truncate table auth.identities, auth.mfa_factors, auth.sso_domains, auth.sso_providers, auth.saml_providers, auth.custom_oauth_providers, auth.oauth_clients, auth.users cascade; truncate table storage.objects, storage.buckets cascade;"
psql_target -c "drop schema if exists private cascade; drop schema if exists public cascade;"

start_epoch="$(date +%s)"
# Application FKs can reference managed auth rows, so restore schema first,
# durable auth identities second, application data third, and only then FKs.
run_pg pg_restore --no-owner --section=pre-data \
  -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" /work/app.dump
# Schema-filtered pg_dump archives do not carry extension objects. Production
# application indexes depend on these extensions living in public, so recreate
# the isolated target prerequisites after public exists and before post-data.
psql_target -c "create extension if not exists pg_trgm with schema public; create extension if not exists pg_net with schema public;"
extension_prereqs="$(psql_target -At -c "select string_agg(e.extname||':'||n.nspname, ',' order by e.extname) from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname in ('pg_net','pg_trgm')")"
[[ "$extension_prereqs" == "pg_net:public,pg_trgm:public" ]] || { echo "restore prerequisite mismatch: expected pg_net/pg_trgm in public" >&2; exit 70; }
run_pg pg_restore --data-only --no-owner --no-acl \
  -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" /work/auth-durable.dump
run_pg pg_restore --no-owner --section=data \
  -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" /work/app.dump
run_pg pg_restore --no-owner --section=post-data \
  -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" /work/app.dump
run_pg pg_restore --data-only --no-owner --no-acl \
  -h "$DR_TARGET_PGHOST" -p "$DR_TARGET_PGPORT" -U "$DR_TARGET_PGUSER" -d "$DR_TARGET_PGDATABASE" /work/storage-metadata.dump

actual_counts="$(psql_target -At -c "select json_build_object(
  'auth_users',(select count(*) from auth.users),
  'stores',(select count(*) from public.stores),
  'store_memberships',(select count(*) from public.store_memberships),
  'store_subscriptions',(select count(*) from public.store_subscriptions),
  'products',(select count(*) from public.products),
  'orders',(select count(*) from public.orders),
  'store_pages',(select count(*) from public.store_pages),
  'store_page_blocks',(select count(*) from public.store_page_blocks),
  'store_page_revisions',(select count(*) from public.store_page_revisions),
  'site_settings',(select count(*) from public.site_settings),
  'platform_audit_logs',(select count(*) from public.platform_audit_logs),
  'store_backup_events',(select count(*) from public.store_backup_events),
  'storage_objects',(select count(*) from storage.objects))::text")"
actual_acl_lines="$(psql_target -At -F '|' -c "
with roles(role_name) as (values ('anon'),('authenticated'),('service_role')),
schemas(schema_name) as (values ('public'),('private'))
select 'schema|'||r.role_name||'|'||s.schema_name||'|USAGE|'||has_schema_privilege(r.role_name,s.schema_name,'USAGE')::text
from roles r cross join schemas s
union all
select 'table|'||grantee||'|'||table_schema||'.'||table_name||'|'||privilege_type||'|true'
from information_schema.role_table_grants
where grantee in ('anon','authenticated','service_role') and table_schema in ('public','private')
order by 1")"
actual_acl_sha="$(printf '%s\n' "$actual_acl_lines" | sha256sum | cut -d' ' -f1)"
export DR_ACTUAL_COUNTS="$actual_counts" DR_ACTUAL_ACL_SHA="$actual_acl_sha"
python3 - "$work/manifest.json" <<'PYVERIFY'
import json, os, sys
manifest=json.load(open(sys.argv[1]))
actual=json.loads(os.environ['DR_ACTUAL_COUNTS'])
expected=manifest.get('critical_counts',{})
if actual != expected:
    raise SystemExit(f"critical row-count mismatch: expected={expected} actual={actual}")
expected_acl=manifest.get('application_acl',{}).get('sha256')
if not expected_acl or os.environ['DR_ACTUAL_ACL_SHA'] != expected_acl:
    raise SystemExit('application ACL fingerprint mismatch')
print('manifest_counts_and_acl_verified')
PYVERIFY
end_epoch="$(date +%s)"
printf 'restore_complete target=%s duration_seconds=%s manifest=%s\n' "$DR_TARGET_LABEL" "$((end_epoch-start_epoch))" "$work/manifest.json"

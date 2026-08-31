#!/usr/bin/env bash
set -euo pipefail
umask 077

required=(DR_PGHOST DR_PGUSER DR_PGPASSFILE DR_BACKUP_ROOT DR_ENCRYPTION_PASSPHRASE_FILE DR_SOURCE_LABEL)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "missing required environment variable: $name" >&2; exit 64; }
done
[[ -r "$DR_PGPASSFILE" ]] || { echo "DR_PGPASSFILE is not readable" >&2; exit 66; }
[[ -r "$DR_ENCRYPTION_PASSPHRASE_FILE" ]] || { echo "DR_ENCRYPTION_PASSPHRASE_FILE is not readable" >&2; exit 66; }

DR_PGPORT="${DR_PGPORT:-5432}"
DR_PGDATABASE="${DR_PGDATABASE:-postgres}"
DR_PG_IMAGE="${DR_PG_IMAGE:-postgres:17-alpine}"
DR_DOCKER_NETWORK="${DR_DOCKER_NETWORK:-host}"

for cmd in docker gpg sha256sum tar python3 stat; do command -v "$cmd" >/dev/null || { echo "$cmd is required" >&2; exit 69; }; done
mkdir -p "$DR_BACKUP_ROOT"
chmod 700 "$DR_BACKUP_ROOT"
work="$(mktemp -d "$DR_BACKUP_ROOT/.dr170-work.XXXXXX")"
cleanup(){ rm -rf "$work"; }
trap cleanup EXIT INT TERM

run_pg(){
  docker run --rm --network "$DR_DOCKER_NETWORK" \
    -v "$DR_PGPASSFILE:/run/secrets/pgpass:ro" \
    -v "$work:/work" \
    -e PGPASSFILE=/run/secrets/pgpass \
    "$DR_PG_IMAGE" "$@"
}

psql_scalar(){
  run_pg psql -X -v ON_ERROR_STOP=1 -At \
    -h "$DR_PGHOST" -p "$DR_PGPORT" -U "$DR_PGUSER" -d "$DR_PGDATABASE" \
    -c "$1"
}

server_version="$(psql_scalar "select current_setting('server_version')")"
server_major="${server_version%%.*}"
[[ "$server_major" =~ ^[0-9]+$ ]] || { echo "could not determine server major version" >&2; exit 70; }
[[ "$server_major" -eq 17 ]] || { echo "expected PostgreSQL 17 server, got $server_version" >&2; exit 70; }

client_version="$(docker run --rm "$DR_PG_IMAGE" pg_dump --version | tr -d '\r')"
client_major="$(printf '%s' "$client_version" | sed -E 's/.* ([0-9]+).*/\1/')"
[[ "$client_major" -eq 17 ]] || { echo "expected PostgreSQL 17 pg_dump, got $client_version" >&2; exit 70; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
generation="${DR_GENERATION_ID:-$stamp}"
prefix="ecomcms-${generation}"

app_dump="/work/app.dump"
auth_dump="/work/auth-durable.dump"
storage_dump="/work/storage-metadata.dump"

run_pg pg_dump -Fc --no-owner \
  -h "$DR_PGHOST" -p "$DR_PGPORT" -U "$DR_PGUSER" -d "$DR_PGDATABASE" \
  --schema=public --schema=private -f "$app_dump"

run_pg pg_dump -Fc --data-only --no-owner --no-acl \
  -h "$DR_PGHOST" -p "$DR_PGPORT" -U "$DR_PGUSER" -d "$DR_PGDATABASE" \
  --table=auth.users --table=auth.identities --table=auth.mfa_factors \
  --table=auth.sso_providers --table=auth.sso_domains --table=auth.saml_providers \
  --table=auth.custom_oauth_providers --table=auth.oauth_clients -f "$auth_dump"

run_pg pg_dump -Fc --data-only --no-owner --no-acl \
  -h "$DR_PGHOST" -p "$DR_PGPORT" -U "$DR_PGUSER" -d "$DR_PGDATABASE" \
  --table=storage.buckets --table=storage.objects -f "$storage_dump"

migration_version="$(psql_scalar "select coalesce(max(version),'unknown') from supabase_migrations.schema_migrations")"
counts_json="$(psql_scalar "select json_build_object(
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
  'storage_objects',(select count(*) from storage.objects)
)::text")"

acl_lines="$(run_pg psql -X -v ON_ERROR_STOP=1 -At -F '|' \
  -h "$DR_PGHOST" -p "$DR_PGPORT" -U "$DR_PGUSER" -d "$DR_PGDATABASE" -c "
with roles(role_name) as (values ('anon'),('authenticated'),('service_role')),
schemas(schema_name) as (values ('public'),('private'))
select 'schema|'||r.role_name||'|'||s.schema_name||'|USAGE|'||has_schema_privilege(r.role_name,s.schema_name,'USAGE')::text
from roles r cross join schemas s
union all
select 'table|'||grantee||'|'||table_schema||'.'||table_name||'|'||privilege_type||'|true'
from information_schema.role_table_grants
where grantee in ('anon','authenticated','service_role') and table_schema in ('public','private')
order by 1")"
acl_fingerprint="$(printf '%s\n' "$acl_lines" | sha256sum | cut -d' ' -f1)"
acl_entries="$(printf '%s\n' "$acl_lines" | sed '/^$/d' | wc -l | tr -d ' ')"

export DR_META_SOURCE="$DR_SOURCE_LABEL" DR_META_STAMP="$stamp" DR_META_GEN="$generation" \
  DR_META_SERVER="$server_version" DR_META_CLIENT="$client_version" DR_META_MIGRATION="$migration_version" \
  DR_META_COUNTS="$counts_json" DR_META_ACL_SHA="$acl_fingerprint" DR_META_ACL_ENTRIES="$acl_entries"
python3 - <<'PYMETA' > "$work/manifest.json"
import json, os
counts=json.loads(os.environ['DR_META_COUNTS'])
print(json.dumps({
  'contract_version':'2026-08-31.2',
  'source':os.environ['DR_META_SOURCE'],
  'captured_at_utc':os.environ['DR_META_STAMP'],
  'generation_id':os.environ['DR_META_GEN'],
  'server_version':os.environ['DR_META_SERVER'],
  'pg_dump_version':os.environ['DR_META_CLIENT'],
  'latest_migration_version':os.environ['DR_META_MIGRATION'],
  'critical_counts':counts,
  'application_acl':{'sha256':os.environ['DR_META_ACL_SHA'],'entries':int(os.environ['DR_META_ACL_ENTRIES'])},
  'included':{
    'application_schemas':['public','private'],
    'durable_auth_tables':['auth.users','auth.identities','auth.mfa_factors','auth.sso_providers','auth.sso_domains','auth.saml_providers','auth.custom_oauth_providers','auth.oauth_clients'],
    'storage_metadata_tables':['storage.buckets','storage.objects'],
    'storage_binary_objects':False
  },
  'security':{'raw_artifacts_retained':False,'encryption':'gpg-symmetric-aes256'},
},sort_keys=True,indent=2))
PYMETA

( cd "$work" && sha256sum app.dump auth-durable.dump storage-metadata.dump ) > "$work/raw-checksums.sha256"

tar -C "$work" -cf "$work/bundle.tar" app.dump auth-durable.dump storage-metadata.dump manifest.json raw-checksums.sha256
artifact="$DR_BACKUP_ROOT/${prefix}.tar.gpg"
gpg --batch --yes --quiet --pinentry-mode loopback --cipher-algo AES256 \
  --passphrase-file "$DR_ENCRYPTION_PASSPHRASE_FILE" --symmetric \
  --output "$artifact" "$work/bundle.tar"

manifest_out="$DR_BACKUP_ROOT/${prefix}.manifest.json"
cp "$work/manifest.json" "$manifest_out"
checksum_out="$DR_BACKUP_ROOT/${prefix}.sha256"
( cd "$DR_BACKUP_ROOT" && sha256sum "$(basename "$artifact")" ) > "$checksum_out"
( cd "$DR_BACKUP_ROOT" && sha256sum -c "$(basename "$checksum_out")" >/dev/null )
chmod 600 "$artifact" "$manifest_out" "$checksum_out"

bytes="$(stat -c %s "$artifact")"
sha="$(cut -d' ' -f1 "$checksum_out")"
printf 'backup_complete artifact=%s bytes=%s sha256=%s manifest=%s\n' "$artifact" "$bytes" "$sha" "$manifest_out"

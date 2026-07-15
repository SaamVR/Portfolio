# Secret Rotation Checklist

Use this checklist when a credential was committed, shared in the wrong channel, or copied into a tracked example file.

## Rotate immediately

1. Supabase:
   - Rotate the `anon` key.
   - Rotate the `service_role` key.
   - Update local `.env*`, Vercel, GitHub Actions, and any Supabase Edge Function secrets.
2. Resend:
   - Revoke the exposed API key.
   - Create a new key with the smallest required scope.
   - Update all mail-sending environments.
3. Vercel:
   - Revoke the exposed personal or team token.
   - Create a replacement token scoped only to the required project or team workflow.
   - Confirm domain automation still works after updating the secret store.

## Update secret stores

1. Replace rotated values in local untracked `.env.local` or deployment secret stores.
2. Update CI providers such as GitHub Actions secrets and Vercel environment variables.
3. Redeploy services that cache environment variables at build time.

## Verify after rotation

1. Confirm storefront and admin login still work.
2. Confirm billing webhooks and Edge Function mail flows still succeed.
3. Confirm domain provisioning or any Vercel API automation still succeeds.
4. Run the repository secret scan before the next push.

## Prevention

1. Keep `.env.example` placeholder-only.
2. Store live values in untracked `.env.local`, Vercel, and GitHub secrets.
3. Treat any credential committed to git as compromised, even if the repo is private.

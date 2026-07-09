# ThreadBD Commerce Engine

ThreadBD Commerce Engine is a Next.js and Supabase commerce CMS for Bangladesh-first storefronts. It includes a multi-tenant storefront runtime, merchant admin dashboard, page-builder CMS, onboarding flow, media management, store-scoped commerce data, and Supabase Edge Functions for platform operations.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS and shadcn/ui components
- Supabase Postgres, Auth, RLS, and Edge Functions
- Firebase-assisted phone and social auth flows
- Cloudinary-backed media uploads

## Local Development

Install dependencies:

```sh
npm install
```

Start the app:

```sh
npm run dev
```

The local server runs on:

```txt
http://localhost:8080
```

## Useful Commands

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Project Areas

- `src/app` - Next.js routes for platform, storefront, admin, and API surfaces.
- `src/views/admin` - Admin dashboard screens.
- `src/components/storefront` - Tenant storefront rendering.
- `src/lib/cms` - CMS schemas, templates, validation, and store resolution.
- `src/lib/platform` - Plan, entitlement, and lifecycle helpers.
- `supabase/migrations` - Chronological database migrations.
- `supabase/functions` - Supabase Edge Functions.

## Environment

Create `.env.local` with the Supabase, Firebase, Cloudinary, and platform URL values required by the features you are running locally. See the code paths under `src/integrations`, `src/lib/firebase-phone-auth.ts`, `src/lib/google-auth.ts`, and `supabase/functions` for the exact variable names used by each integration.

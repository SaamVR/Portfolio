# EZComo Database Export

## How to Import into Your Supabase Project

### Step 1: Create a new Supabase project
Go to [supabase.com](https://supabase.com) and create a new project.

### Step 2: Run the Schema SQL
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `01-schema.sql`
3. Paste and click **Run**
4. This creates all tables, functions, triggers, RLS policies, views, and storage buckets

### Step 3: Run the Seed Data
1. Still in the SQL Editor, paste the contents of `02-seed-data.sql`
2. Click **Run**
3. This inserts all products, categories, types, site settings, and coupon codes

### Step 4: Configure Authentication
1. Go to **Authentication → Providers** in your Supabase dashboard
2. Enable **Google** provider for admin login
3. Enable **Email** provider for customer signup (keep email confirmation ON)
4. Set your Site URL and Redirect URLs

### Step 5: Set Edge Function Secrets
In your Supabase dashboard → **Settings → Edge Functions → Secrets**, add:
- `CLOUDINARY_CLOUD_NAME` — your Cloudinary cloud name
- `CLOUDINARY_API_KEY` — your Cloudinary API key
- `CLOUDINARY_API_SECRET` — your Cloudinary API secret
- `ADMIN_SETUP_PASSWORD` — password for initial admin setup

### Step 6: Deploy Edge Functions
Deploy the edge functions from the `supabase/functions/` directory:
```bash
supabase functions deploy admin-setup
supabase functions deploy claim-invite-code
supabase functions deploy cloudinary-signature
supabase functions deploy sitemap
```

### Step 7: Update Frontend Environment
Create a `.env` file with your new Supabase project details:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

### Step 8: Upload Product Images
Upload the images from `src/assets/` to your hosting (Cloudinary, Supabase Storage, etc.) and update the `image_url` field in the products table accordingly.

## Security Notes
- All tables have Row Level Security (RLS) enabled
- Admin functions use `SECURITY DEFINER` to avoid RLS recursion
- Roles are stored in a separate `user_roles` table (never on profiles)
- The `has_role()` and `is_admin()` functions are the sole entry points for permission checks
- Contact form has rate limiting (5 messages/hour/email)
- Coupon claiming uses row-level locking to prevent race conditions
- Product reviews are only publicly visible after admin approval (via `public_product_reviews` view)

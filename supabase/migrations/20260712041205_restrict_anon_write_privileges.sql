-- Revoke all table-level privileges from anon on existing tables
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant SELECT only on all existing tables in schema public to anon
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant INSERT only on contact_messages to anon to support storefront guest inquiries
GRANT INSERT ON public.contact_messages TO anon;

-- Revoke all default table privileges for anon on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- Grant SELECT only as default table privilege for anon on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

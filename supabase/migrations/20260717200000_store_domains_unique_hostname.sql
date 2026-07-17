-- Add unique constraint to hostname in store_domains
ALTER TABLE "public"."store_domains"
ADD CONSTRAINT "store_domains_hostname_key" UNIQUE ("hostname");

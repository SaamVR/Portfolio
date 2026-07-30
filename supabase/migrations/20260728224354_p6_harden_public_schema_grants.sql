-- P6 hardening: stop broad anonymous access from propagating to future objects
-- and remove anon access to high-risk object classes that storefront clients do not need.

revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all routines in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;

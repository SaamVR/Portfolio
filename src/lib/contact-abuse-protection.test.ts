import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260829102000_contact_message_abuse_protection_175.sql", import.meta.url),
  "utf8",
);

describe("contact message abuse protection migration", () => {
  it("enforces both per-client and per-email limits in a BEFORE INSERT trigger", () => {
    expect(migration).toContain("before insert on public.contact_messages");
    expect(migration).toContain("contact:client:");
    expect(migration).toContain("contact:email:");
    expect(migration).toContain("check_request_rate_limit");
  });

  it("derives client identity from request metadata and fails closed to email", () => {
    expect(migration).toContain("x-forwarded-for");
    expect(migration).toContain("x-real-ip");
    expect(migration).toContain("coalesce(client_identity, 'email:' || new.email)");
  });

  it("validates published-store scope and bounded normalized payloads", () => {
    expect(migration).toContain("s.is_published = true");
    expect(migration).toContain("new.email := lower(btrim(new.email))");
    expect(migration).toContain("length(new.message) < 10");
    expect(migration).toContain("length(new.message) > 2000");
  });
});

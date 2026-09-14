import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  throw new Error("SUPABASE_DB_URL is required for invite atomicity smoke tests");
}

const ids = {
  owner: "00000000-0000-4000-8000-000000000321",
  staffA: "00000000-0000-4000-8000-000000000322",
  staffB: "00000000-0000-4000-8000-000000000323",
  staffSuccess: "00000000-0000-4000-8000-000000000324",
  staffExisting: "00000000-0000-4000-8000-000000000325",
  staffFail: "00000000-0000-4000-8000-000000000326",
  platformA: "00000000-0000-4000-8000-000000000327",
  platformB: "00000000-0000-4000-8000-000000000328",
  platformExisting: "00000000-0000-4000-8000-000000000329",
  platformSuccess: "00000000-0000-4000-8000-000000000331",
  platformFail: "00000000-0000-4000-8000-000000000332",
  platformUsedBy: "00000000-0000-4000-8000-000000000333",
};

const storeId = "00000000-0000-4000-8000-000000000330";
const seatStoreId = "00000000-0000-4000-8000-000000000334";
const unlimitedStoreId = "00000000-0000-4000-8000-000000000335";
const mainPlanId = "p0-323-staff-main";
const seatPlanId = "p0-323-staff-one";
const unlimitedPlanId = "p0-323-staff-unlimited";
const prefix = "P0-323-";
const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`;

async function sql(query, { allowFailure = false } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync("psql", [
      "-X", dbUrl, "-v", "ON_ERROR_STOP=1", "-Atq", "-c", query,
    ], { maxBuffer: 2 * 1024 * 1024 });
    if (stderr.trim()) process.stderr.write(stderr);
    return stdout.trim();
  } catch (error) {
    if (allowFailure) return { failed: true, error };
    throw error;
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function scalar(query) {
  return String(await sql(query)).trim();
}

async function claim(code, userId, email) {
  const raw = await sql(
    `set role service_role; select public.claim_invite_code_atomic(${sqlText(code)}, ${sqlText(userId)}::uuid, ${email ? sqlText(email) : "null"});`,
  );
  return JSON.parse(raw);
}

const users = [
  [ids.owner, "owner-323@example.test"],
  [ids.staffA, "staff-a-323@example.test"],
  [ids.staffB, "staff-b-323@example.test"],
  [ids.staffSuccess, "success-323@example.test"],
  [ids.staffExisting, "existing-323@example.test"],
  [ids.staffFail, "fail-323@example.test"],
  [ids.platformA, "platform-a-323@example.test"],
  [ids.platformB, "platform-b-323@example.test"],
  [ids.platformExisting, "platform-existing-323@example.test"],
  [ids.platformSuccess, "platform-success-323@example.test"],
  [ids.platformFail, "platform-fail-323@example.test"],
  [ids.platformUsedBy, "platform-used-323@example.test"],
];

async function resetFixtures() {
  const userList = Object.values(ids).map((id) => `${sqlText(id)}::uuid`).join(",");
  const userRows = users.map(([id, email]) =>
    `(${sqlText(id)}::uuid, ${sqlText(email)}, now(), now())`
  ).join(",\n");
  const storeList = [storeId, seatStoreId, unlimitedStoreId].map((id) => `${sqlText(id)}::uuid`).join(",");
  const planList = [mainPlanId, seatPlanId, unlimitedPlanId].map(sqlText).join(",");

  await sql(`
    delete from public.user_roles where user_id in (${userList});
    delete from public.store_memberships where user_id in (${userList}) or store_id in (${storeList});
    delete from public.store_staff_invites where invite_code like ${sqlText(prefix + "%")};
    delete from public.invite_codes where code like ${sqlText(prefix + "%")};
    delete from public.store_subscriptions where store_id in (${storeList});
    delete from public.stores where id in (${storeList});
    delete from public.cms_plans where id in (${planList});
    delete from auth.users where id in (${userList});

    insert into auth.users (id, email, created_at, updated_at) values ${userRows};

    insert into public.cms_plans
      (id, name, description, monthly_price, store_limit, feature_flags, is_active, sort_order)
    values
      (${sqlText(mainPlanId)}, 'Invite Smoke Staff 10', 'Rollback-only #323/#325 fixture', 0, 1, '{"staff":10}'::jsonb, true, 9323),
      (${sqlText(seatPlanId)}, 'Invite Smoke Staff 1', 'Rollback-only #323/#325 fixture', 0, 1, '{"staff":1}'::jsonb, true, 9324),
      (${sqlText(unlimitedPlanId)}, 'Invite Smoke Unlimited', 'Rollback-only #323/#325 fixture', 0, 1, '{"staff":-1}'::jsonb, true, 9325);

    insert into public.stores (id, owner_id, name, slug, plan)
    values
      (${sqlText(storeId)}::uuid, ${sqlText(ids.owner)}::uuid, 'Invite Atomicity Test', 'invite-atomicity-323', ${sqlText(mainPlanId)}),
      (${sqlText(seatStoreId)}::uuid, ${sqlText(ids.owner)}::uuid, 'Invite Seat Limit Test', 'invite-seat-limit-325', ${sqlText(seatPlanId)}),
      (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(ids.owner)}::uuid, 'Invite Unlimited Test', 'invite-unlimited-325', ${sqlText(unlimitedPlanId)});

    insert into public.store_subscriptions (store_id, plan_id, status)
    values
      (${sqlText(storeId)}::uuid, ${sqlText(mainPlanId)}, 'active'),
      (${sqlText(seatStoreId)}::uuid, ${sqlText(seatPlanId)}, 'active'),
      (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(unlimitedPlanId)}, 'active');

    insert into public.store_memberships (store_id, user_id, role)
    values
      (${sqlText(storeId)}::uuid, ${sqlText(ids.owner)}::uuid, 'owner'),
      (${sqlText(seatStoreId)}::uuid, ${sqlText(ids.owner)}::uuid, 'owner'),
      (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(ids.owner)}::uuid, 'owner');
  `);
}

async function seedCases() {
  await sql(`
    insert into public.store_staff_invites
      (store_id, invite_code, email, role, status, claimed_by, claimed_at, expires_at, created_by)
    values
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-RACE', null, 'editor', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-EXPIRED', 'success-323@example.test', 'viewer', 'pending', null, null, now() - interval '1 minute', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-USED', 'staff-a-323@example.test', 'viewer', 'claimed', ${sqlText(ids.staffA)}::uuid, now(), now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-WRONG', 'target-323@example.test', 'viewer', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-EXISTING', 'existing-323@example.test', 'admin', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-SUCCESS', 'success-323@example.test', 'admin', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-ROLLBACK', 'fail-323@example.test', 'editor', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-DOWNGRADE', 'platform-used-323@example.test', 'viewer', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(seatStoreId)}::uuid, '${prefix}STAFF-SEAT-A', 'staff-a-323@example.test', 'editor', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(seatStoreId)}::uuid, '${prefix}STAFF-SEAT-B', 'staff-b-323@example.test', 'editor', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid),
      (${sqlText(seatStoreId)}::uuid, '${prefix}STAFF-SEAT-FREED', 'success-323@example.test', 'viewer', 'pending', null, null, now() + interval '1 hour', ${sqlText(ids.owner)}::uuid);

    insert into public.store_memberships (store_id, user_id, role)
    values (${sqlText(storeId)}::uuid, ${sqlText(ids.staffExisting)}::uuid, 'viewer');

    insert into public.invite_codes (code, role, email, expires_at, used_by, used_at)
    values
      ('${prefix}PLATFORM-RACE', 'co_admin', 'platform-race-323@example.test', now() + interval '1 hour', null, null),
      ('${prefix}PLATFORM-EXPIRED', 'co_admin', 'platform-success-323@example.test', now() - interval '1 minute', null, null),
      ('${prefix}PLATFORM-USED', 'co_admin', 'platform-used-323@example.test', now() + interval '1 hour', ${sqlText(ids.platformUsedBy)}::uuid, now()),
      ('${prefix}PLATFORM-WRONG', 'co_admin', 'platform-target-323@example.test', now() + interval '1 hour', null, null),
      ('${prefix}PLATFORM-EXISTING', 'co_admin', 'platform-existing-323@example.test', now() + interval '1 hour', null, null),
      ('${prefix}PLATFORM-SUCCESS', 'co_admin', 'platform-success-323@example.test', now() + interval '1 hour', null, null),
      ('${prefix}PLATFORM-ROLLBACK', 'co_admin', 'platform-fail-323@example.test', now() + interval '1 hour', null, null);

    insert into public.user_roles (user_id, role)
    values (${sqlText(ids.platformExisting)}::uuid, 'admin');
  `);
}

async function testRpcAcl() {
  const acl = await scalar(`
    select has_function_privilege('authenticated', 'public.claim_invite_code_atomic(text,uuid,text)', 'execute')::int
      || '|' || has_function_privilege('anon', 'public.claim_invite_code_atomic(text,uuid,text)', 'execute')::int
      || '|' || has_function_privilege('service_role', 'public.claim_invite_code_atomic(text,uuid,text)', 'execute')::int;
  `);
  expect(acl === "0|0|1", `RPC ACL expected authenticated=0 anon=0 service_role=1, got ${acl}`);
  console.log(`acl: ${acl}`);
}

async function testRoleVocabulary() {
  const roles = await scalar(`
    select
      (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum join pg_type on pg_type.oid=enumtypid where typname='store_member_role')
      || '|' ||
      (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum join pg_type on pg_type.oid=enumtypid where typname='app_role');
  `);
  expect(roles === "owner,admin,editor,viewer|admin,co_admin", `unexpected role vocabulary: ${roles}`);
  console.log(`role vocabulary: ${roles}`);
}

async function testStaffRace() {
  const results = await Promise.all([
    claim(`${prefix}STAFF-RACE`, ids.staffA, "staff-a-323@example.test"),
    claim(`${prefix}STAFF-RACE`, ids.staffB, "staff-b-323@example.test"),
  ]);
  expect(results.filter((x) => x.success).length === 1, "staff race must have exactly one winner");
  expect(results.filter((x) => x.error === "already_used").length === 1, "staff race loser must see already_used");
  const count = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(storeId)}::uuid and user_id in (${sqlText(ids.staffA)}::uuid, ${sqlText(ids.staffB)}::uuid);`);
  expect(count === "1", `staff race created ${count} memberships instead of 1`);
  console.log(`staff race: ${JSON.stringify(results)} memberships=${count}`);
}

async function testPlatformRace() {
  const results = await Promise.all([
    claim(`${prefix}PLATFORM-RACE`, ids.platformA, "platform-race-323@example.test"),
    claim(`${prefix}PLATFORM-RACE`, ids.platformB, "platform-race-323@example.test"),
  ]);
  expect(results.filter((x) => x.success).length === 1, "platform race must have exactly one winner");
  expect(results.filter((x) => x.error === "already_used").length === 1, "platform race loser must see already_used");
  const count = await scalar(`select count(*) from public.user_roles where user_id in (${sqlText(ids.platformA)}::uuid, ${sqlText(ids.platformB)}::uuid);`);
  expect(count === "1", `platform race created ${count} roles instead of 1`);
  console.log(`platform race: ${JSON.stringify(results)} roles=${count}`);
}

async function testStaffNegativeCases() {
  const expired = await claim(`${prefix}STAFF-EXPIRED`, ids.staffSuccess, "success-323@example.test");
  expect(expired.error === "expired", "expired staff invite must fail as expired");
  const used = await claim(`${prefix}STAFF-USED`, ids.staffB, "staff-b-323@example.test");
  expect(used.error === "already_used", "already-used staff invite must fail as already_used");
  const wrong = await claim(`${prefix}STAFF-WRONG`, ids.staffB, "staff-b-323@example.test");
  expect(wrong.error === "wrong_email", "wrong-email staff invite must fail");
  const existing = await claim(`${prefix}STAFF-EXISTING`, ids.staffExisting, "existing-323@example.test");
  expect(existing.error === "existing_membership", "existing membership must be deterministic");
  const open = await scalar(`select count(*) from public.store_staff_invites where invite_code in ('${prefix}STAFF-EXPIRED','${prefix}STAFF-WRONG','${prefix}STAFF-EXISTING') and claimed_by is null and status='pending';`);
  expect(open === "3", `negative staff paths consumed an invite unexpectedly: open=${open}`);
  console.log(`staff negatives: expired=${expired.error} used=${used.error} wrong=${wrong.error} existing=${existing.error}`);
}

async function testPlatformNegativeCases() {
  const expired = await claim(`${prefix}PLATFORM-EXPIRED`, ids.platformSuccess, "platform-success-323@example.test");
  expect(expired.error === "expired", "expired platform invite must fail as expired");
  const used = await claim(`${prefix}PLATFORM-USED`, ids.platformA, "platform-used-323@example.test");
  expect(used.error === "already_used", "already-used platform invite must fail as already_used");
  const wrong = await claim(`${prefix}PLATFORM-WRONG`, ids.platformA, "platform-a-323@example.test");
  expect(wrong.error === "wrong_email", "wrong-email platform invite must fail");
  const existing = await claim(`${prefix}PLATFORM-EXISTING`, ids.platformExisting, "platform-existing-323@example.test");
  expect(existing.error === "existing_role", "existing platform role must be deterministic");
  const unused = await scalar(`select count(*) from public.invite_codes where code in ('${prefix}PLATFORM-EXPIRED','${prefix}PLATFORM-WRONG','${prefix}PLATFORM-EXISTING') and used_by is null;`);
  expect(unused === "3", `negative platform paths consumed an invite unexpectedly: unused=${unused}`);
  console.log(`platform negatives: expired=${expired.error} used=${used.error} wrong=${wrong.error} existing=${existing.error}`);
}

async function testPrivilegedIdentityBinding() {
  const failed = await sql(`insert into public.invite_codes (code, role, email, expires_at) values ('${prefix}UNBOUND-NEW', 'co_admin', null, now() + interval '1 hour');`, { allowFailure: true });
  expect(typeof failed === "object" && failed.failed === true, "new privileged bearer invite without identity binding must be rejected");
  const count = await scalar(`select count(*) from public.invite_codes where code='${prefix}UNBOUND-NEW';`);
  expect(count === "0", "rejected unbound privileged invite was persisted");
  console.log("platform identity binding: new unbound invite rejected");
}

async function testOwnerRoleInviteRejected() {
  const insertResult = await sql(`
    insert into public.store_staff_invites
      (store_id, invite_code, email, role, status, created_by, expires_at)
    values
      (${sqlText(storeId)}::uuid, '${prefix}STAFF-OWNER-BLOCKED', 'staff-b-323@example.test', 'owner', 'pending', ${sqlText(ids.owner)}::uuid, now() + interval '1 hour');
  `, { allowFailure: true });
  expect(typeof insertResult === "object" && insertResult.failed === true, "pending owner staff invite must be rejected by the database constraint");
  const count = await scalar(`select count(*) from public.store_staff_invites where invite_code='${prefix}STAFF-OWNER-BLOCKED';`);
  expect(count === "0", "rejected pending owner invite was persisted");
  console.log("owner invite authority: pending owner invite rejected by database constraint");
}

async function testLastStaffSeatRace() {
  const results = await Promise.all([
    claim(`${prefix}STAFF-SEAT-A`, ids.staffA, "staff-a-323@example.test"),
    claim(`${prefix}STAFF-SEAT-B`, ids.staffB, "staff-b-323@example.test"),
  ]);
  expect(results.filter((x) => x.success).length === 1, `last-seat race must have exactly one winner: ${JSON.stringify(results)}`);
  expect(results.filter((x) => x.error === "staff_seat_limit_reached").length === 1, `last-seat loser must see staff_seat_limit_reached: ${JSON.stringify(results)}`);
  const count = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(seatStoreId)}::uuid and role <> 'owner';`);
  expect(count === "1", `last-seat race created ${count} non-owner memberships instead of 1`);
  const pending = await scalar(`select count(*) from public.store_staff_invites where invite_code in ('${prefix}STAFF-SEAT-A','${prefix}STAFF-SEAT-B') and claimed_by is null and status='pending';`);
  expect(pending === "1", `last-seat loser invite was consumed unexpectedly: pending=${pending}`);
  console.log(`last-seat race: ${JSON.stringify(results)} seats=${count} pending=${pending}`);
}

async function testDirectMembershipAuthority() {
  const overLimit = await sql(`
    insert into public.store_memberships (store_id, user_id, role, invited_by)
    values (${sqlText(seatStoreId)}::uuid, ${sqlText(ids.staffExisting)}::uuid, 'viewer', ${sqlText(ids.owner)}::uuid);
  `, { allowFailure: true });
  expect(typeof overLimit === "object" && overLimit.failed === true, "direct membership insert over the plan seat limit must fail");

  const ownerEscalation = await sql(`
    insert into public.store_memberships (store_id, user_id, role, invited_by)
    values (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(ids.staffExisting)}::uuid, 'owner', ${sqlText(ids.owner)}::uuid);
  `, { allowFailure: true });
  expect(typeof ownerEscalation === "object" && ownerEscalation.failed === true, "direct non-owner owner-role membership must fail");

  const overLimitCount = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(seatStoreId)}::uuid and user_id=${sqlText(ids.staffExisting)}::uuid;`);
  const badOwnerCount = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(unlimitedStoreId)}::uuid and user_id=${sqlText(ids.staffExisting)}::uuid and role='owner';`);
  expect(overLimitCount === "0" && badOwnerCount === "0", `direct bypass persisted authority unexpectedly: seat=${overLimitCount} owner=${badOwnerCount}`);
  console.log("direct membership authority: over-limit and owner-escalation inserts rejected");
}

async function testFreedSeatCanBeClaimed() {
  const winnerId = await scalar(`select user_id::text from public.store_memberships where store_id=${sqlText(seatStoreId)}::uuid and role <> 'owner' limit 1;`);
  expect(Boolean(winnerId), "last-seat race winner membership missing before seat-release proof");
  await sql(`delete from public.store_memberships where store_id=${sqlText(seatStoreId)}::uuid and user_id=${sqlText(winnerId)}::uuid;`);

  const result = await claim(`${prefix}STAFF-SEAT-FREED`, ids.staffSuccess, "success-323@example.test");
  expect(result.success === true, `freed staff seat must be claimable: ${JSON.stringify(result)}`);
  const count = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(seatStoreId)}::uuid and role <> 'owner';`);
  expect(count === "1", `freed-seat claim should restore exactly one active staff seat, got ${count}`);
  console.log(`freed seat: winner_removed=${winnerId} replacement=${JSON.stringify(result)}`);
}

async function testUnlimitedStaffPlan() {
  await sql(`
    insert into public.store_memberships (store_id, user_id, role, invited_by)
    values
      (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(ids.staffA)}::uuid, 'editor', ${sqlText(ids.owner)}::uuid),
      (${sqlText(unlimitedStoreId)}::uuid, ${sqlText(ids.staffB)}::uuid, 'viewer', ${sqlText(ids.owner)}::uuid);
  `);
  const count = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(unlimitedStoreId)}::uuid and role <> 'owner';`);
  expect(count === "2", `unlimited plan should allow multiple non-owner staff memberships, got ${count}`);
  const limit = await scalar(`select public.resolve_store_staff_seat_limit(${sqlText(unlimitedStoreId)}::uuid);`);
  expect(limit === "-1", `unlimited plan sentinel should resolve to -1, got ${limit}`);
  console.log(`unlimited staff plan: limit=${limit} active_staff=${count}`);
}

async function testPlanDowngradeBlocksNewSeat() {
  await sql(`update public.cms_plans set feature_flags = jsonb_set(feature_flags, '{staff}', '0'::jsonb, true) where id=${sqlText(mainPlanId)};`);
  const result = await claim(`${prefix}STAFF-DOWNGRADE`, ids.platformUsedBy, "platform-used-323@example.test");
  expect(result.error === "staff_seat_limit_reached", `plan downgrade must block new staff claim: ${JSON.stringify(result)}`);
  const inviteState = await scalar(`select (claimed_by is null)::int || '|' || status from public.store_staff_invites where invite_code='${prefix}STAFF-DOWNGRADE';`);
  expect(inviteState === "1|pending", `downgrade-blocked invite was consumed: ${inviteState}`);
  await sql(`update public.cms_plans set feature_flags = jsonb_set(feature_flags, '{staff}', '10'::jsonb, true) where id=${sqlText(mainPlanId)};`);
  console.log(`plan downgrade: claim=${result.error} invite=${inviteState}`);
}

async function testLegitimateSuccesses() {
  const staff = await claim(`${prefix}STAFF-SUCCESS`, ids.staffSuccess, "success-323@example.test");
  expect(staff.success === true && staff.membership_type === "store", "legitimate staff invite must succeed");
  expect(staff.store_id === storeId && staff.role === "admin", "staff success returned wrong scope/role");
  const staffRow = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(storeId)}::uuid and user_id=${sqlText(ids.staffSuccess)}::uuid and role='admin' and invited_by=${sqlText(ids.owner)}::uuid;`);
  expect(staffRow === "1", "legitimate staff claim did not create exact scoped membership with inviter");

  const platform = await claim(`${prefix}PLATFORM-SUCCESS`, ids.platformSuccess, "platform-success-323@example.test");
  expect(platform.success === true && platform.membership_type === "platform" && platform.role === "co_admin", "legitimate platform invite must succeed");
  const platformRow = await scalar(`select count(*) from public.user_roles where user_id=${sqlText(ids.platformSuccess)}::uuid and role='co_admin';`);
  expect(platformRow === "1", "legitimate platform claim did not create role");
  console.log(`legitimate successes: staff=${JSON.stringify(staff)} platform=${JSON.stringify(platform)}`);
}

async function testStaffGrantFailureRollback() {
  await sql(`
    create or replace function public.test_323_reject_membership() returns trigger language plpgsql as $$
    begin
      if new.user_id = ${sqlText(ids.staffFail)}::uuid then raise exception 'forced membership failure for #323 smoke'; end if;
      return new;
    end; $$;
    drop trigger if exists test_323_reject_membership on public.store_memberships;
    create trigger test_323_reject_membership before insert on public.store_memberships for each row execute function public.test_323_reject_membership();
  `);
  const failed = await sql(`set role service_role; select public.claim_invite_code_atomic('${prefix}STAFF-ROLLBACK', ${sqlText(ids.staffFail)}::uuid, 'fail-323@example.test');`, { allowFailure: true });
  expect(typeof failed === "object" && failed.failed === true, "forced staff authority persistence failure must surface");
  const state = await scalar(`select (claimed_by is null)::int || '|' || status from public.store_staff_invites where invite_code='${prefix}STAFF-ROLLBACK';`);
  expect(state === "1|pending", `failed staff grant consumed invite: ${state}`);
  const count = await scalar(`select count(*) from public.store_memberships where store_id=${sqlText(storeId)}::uuid and user_id=${sqlText(ids.staffFail)}::uuid;`);
  expect(count === "0", "failed staff grant left membership behind");
  await sql(`drop trigger test_323_reject_membership on public.store_memberships; drop function public.test_323_reject_membership();`);
  console.log(`staff rollback: invite=${state} membership_count=${count}`);
}

async function testPlatformGrantFailureRollback() {
  await sql(`
    create or replace function public.test_323_reject_role() returns trigger language plpgsql as $$
    begin
      if new.user_id = ${sqlText(ids.platformFail)}::uuid then raise exception 'forced role failure for #323 smoke'; end if;
      return new;
    end; $$;
    drop trigger if exists test_323_reject_role on public.user_roles;
    create trigger test_323_reject_role before insert on public.user_roles for each row execute function public.test_323_reject_role();
  `);
  const failed = await sql(`set role service_role; select public.claim_invite_code_atomic('${prefix}PLATFORM-ROLLBACK', ${sqlText(ids.platformFail)}::uuid, 'platform-fail-323@example.test');`, { allowFailure: true });
  expect(typeof failed === "object" && failed.failed === true, "forced platform authority persistence failure must surface");
  const state = await scalar(`select (used_by is null)::int from public.invite_codes where code='${prefix}PLATFORM-ROLLBACK';`);
  expect(state === "1", `failed platform grant consumed invite: ${state}`);
  const count = await scalar(`select count(*) from public.user_roles where user_id=${sqlText(ids.platformFail)}::uuid;`);
  expect(count === "0", "failed platform grant left role behind");
  await sql(`drop trigger test_323_reject_role on public.user_roles; drop function public.test_323_reject_role();`);
  console.log(`platform rollback: invite_unused=${state} role_count=${count}`);
}

async function cleanup() {
  const userList = Object.values(ids).map((id) => `${sqlText(id)}::uuid`).join(",");
  const storeList = [storeId, seatStoreId, unlimitedStoreId].map((id) => `${sqlText(id)}::uuid`).join(",");
  const planList = [mainPlanId, seatPlanId, unlimitedPlanId].map(sqlText).join(",");
  await sql(`
    drop trigger if exists test_323_reject_membership on public.store_memberships;
    drop function if exists public.test_323_reject_membership();
    drop trigger if exists test_323_reject_role on public.user_roles;
    drop function if exists public.test_323_reject_role();
    delete from public.user_roles where user_id in (${userList});
    delete from public.store_memberships where user_id in (${userList}) or store_id in (${storeList});
    delete from public.store_staff_invites where invite_code like ${sqlText(prefix + "%")};
    delete from public.invite_codes where code like ${sqlText(prefix + "%")};
    delete from public.store_subscriptions where store_id in (${storeList});
    delete from public.stores where id in (${storeList});
    delete from public.cms_plans where id in (${planList});
    delete from auth.users where id in (${userList});
  `);
}

let failed = false;
try {
  await resetFixtures();
  await seedCases();
  await testRpcAcl();
  await testRoleVocabulary();
  await testStaffRace();
  await testPlatformRace();
  await testStaffNegativeCases();
  await testPlatformNegativeCases();
  await testPrivilegedIdentityBinding();
  await testOwnerRoleInviteRejected();
  await testLastStaffSeatRace();
  await testDirectMembershipAuthority();
  await testFreedSeatCanBeClaimed();
  await testUnlimitedStaffPlan();
  await testLegitimateSuccesses();
  await testStaffGrantFailureRollback();
  await testPlatformGrantFailureRollback();
  await testPlanDowngradeBlocksNewSeat();
  console.log("invite atomicity smoke: PASS");
} catch (error) {
  failed = true;
  console.error("invite atomicity smoke: FAIL");
  console.error(error);
} finally {
  try { await cleanup(); } catch (error) { console.error("invite atomicity cleanup failed", error); }
}

if (failed) process.exitCode = 1;

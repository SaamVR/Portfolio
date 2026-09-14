import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { jsonNoStore } from "@/lib/http/cache-control";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = 16 * 1024;
const maxFirebaseTokenLength = 12_000;

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getFirebaseApiKey() {
  return process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

function getFirebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

function getSupabasePublishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing Supabase publishable key.");
  }
  return key;
}

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function syntheticFirebaseEmail(projectId: string, subject: string) {
  const digest = createHash("sha256")
    .update(`${projectId}:${subject}`)
    .digest("hex")
    .slice(0, 40);
  return `firebase-${digest}@firebase-phone.local`;
}

type FirebaseLookupUser = {
  localId?: unknown;
  email?: unknown;
  emailVerified?: unknown;
  phoneNumber?: unknown;
};

type ExternalBinding = {
  supabase_user_id: string;
};

async function loadBinding(supabaseAdmin: any, projectId: string, subject: string) {
  const { data, error } = await supabaseAdmin
    .from("external_auth_identities")
    .select("supabase_user_id")
    .eq("provider", "firebase")
    .eq("provider_project_id", projectId)
    .eq("provider_subject", subject)
    .maybeSingle();

  if (error) throw error;
  return data as ExternalBinding | null;
}

async function loadBoundUser(supabaseAdmin: any, userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) throw error;
  if (!data.user) throw new Error("Bound Supabase user no longer exists.");
  return data.user;
}

async function touchBinding(
  supabaseAdmin: any,
  projectId: string,
  subject: string,
  verifiedEmail: string | null,
  verifiedPhone: string | null,
) {
  const { error } = await supabaseAdmin
    .from("external_auth_identities")
    .update({
      verified_email: verifiedEmail,
      verified_phone: verifiedPhone,
      last_seen_at: new Date().toISOString(),
    })
    .eq("provider", "firebase")
    .eq("provider_project_id", projectId)
    .eq("provider_subject", subject);

  if (error) throw error;
}

async function issueSupabaseSession(supabaseAdmin: any, supabaseUser: any) {
  const email = typeof supabaseUser?.email === "string" ? supabaseUser.email.trim() : "";
  if (!email) {
    throw new Error("Bound Supabase user has no email session identity.");
  }

  // Admin generateLink creates a one-time auth token but does not send email.
  // Verify that token through the normal public Auth endpoint to obtain a real
  // Supabase session without mutating the user's password.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Supabase did not return a one-time session token.");
  }

  const sessionClient = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: authData, error: sessionError } = await sessionClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (sessionError) throw sessionError;
  if (!authData.user || authData.user.id !== supabaseUser.id || !authData.session) {
    throw new Error("Supabase session identity did not match the durable external binding.");
  }

  return authData;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = await rateLimit(`auth_${ip}`, { limit: 10, windowMs: 60_000 });
  if (!success) {
    return jsonNoStore({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return jsonNoStore({ error: "Authentication payload is too large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody || "{}");
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return jsonNoStore({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const idToken = readText(body.id_token, maxFirebaseTokenLength);
    const displayName = readText(body.display_name, 120);
    if (!idToken) {
      return jsonNoStore({ error: "Missing id_token" }, { status: 400 });
    }

    const firebaseApiKey = getFirebaseApiKey();
    const firebaseProjectId = getFirebaseProjectId();
    if (!firebaseApiKey || !firebaseProjectId) {
      return jsonNoStore(
        { error: "Firebase server credentials are not configured." },
        { status: 500 },
      );
    }

    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    );
    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok || verifyData.error) {
      return jsonNoStore({ error: "Firebase token verification failed." }, { status: 401 });
    }

    const firebaseUser = verifyData.users?.[0] as FirebaseLookupUser | undefined;
    const subject = readText(firebaseUser?.localId, 240);
    if (!subject) {
      return jsonNoStore({ error: "Firebase token did not include a user." }, { status: 401 });
    }

    const rawEmail = readText(firebaseUser?.email, 320).toLowerCase();
    const verifiedEmail = firebaseUser?.emailVerified === true && rawEmail ? rawEmail : null;
    const verifiedPhone = readText(firebaseUser?.phoneNumber, 40) || null;

    // Never use an unverified/mutable email claim as account-link authority.
    // A verified phone claim is acceptable as proof that Firebase authenticated
    // this new external subject, but it still never selects an existing account.
    if (!verifiedEmail && !verifiedPhone) {
      return jsonNoStore(
        { error: "Firebase identity has no verified email or phone claim.", code: "firebase_identity_not_verified" },
        { status: 403 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    let binding = await loadBinding(supabaseAdmin as any, firebaseProjectId, subject);
    let supabaseUser: any;

    if (binding) {
      supabaseUser = await loadBoundUser(supabaseAdmin as any, binding.supabase_user_id);
      await touchBinding(
        supabaseAdmin as any,
        firebaseProjectId,
        subject,
        verifiedEmail,
        verifiedPhone,
      );
    } else {
      const email = verifiedEmail || syntheticFirebaseEmail(firebaseProjectId, subject);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        phone: verifiedPhone || undefined,
        email_confirm: Boolean(verifiedEmail),
        phone_confirm: Boolean(verifiedPhone),
        user_metadata: {
          full_name: displayName || verifiedPhone || verifiedEmail || "Firebase user",
          firebase_project_id: firebaseProjectId,
          firebase_uid: subject,
          firebase_email_verified: Boolean(verifiedEmail),
        },
      });

      if (createError || !created.user) {
        // A concurrent request for this exact immutable subject may have won
        // between our initial binding read and user creation. Only the durable
        // binding may resolve that race; email/phone collisions never do.
        binding = await loadBinding(supabaseAdmin as any, firebaseProjectId, subject);
        if (binding) {
          supabaseUser = await loadBoundUser(supabaseAdmin as any, binding.supabase_user_id);
        } else {
          return jsonNoStore(
            {
              error: "This Firebase identity collides with an existing account and must be linked explicitly.",
              code: "identity_link_required",
            },
            { status: 409 },
          );
        }
      } else {
        supabaseUser = created.user;
        const { error: bindingError } = await (supabaseAdmin as any)
          .from("external_auth_identities")
          .insert({
            provider: "firebase",
            provider_project_id: firebaseProjectId,
            provider_subject: subject,
            supabase_user_id: created.user.id,
            verified_email: verifiedEmail,
            verified_phone: verifiedPhone,
            metadata: {
              provisioned_by: "auth_bridge",
            },
          });

        if (bindingError) {
          if (errorCode(bindingError) === "23505") {
            const winner = await loadBinding(supabaseAdmin as any, firebaseProjectId, subject);
            if (winner) {
              if (winner.supabase_user_id !== created.user.id) {
                await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
              }
              supabaseUser = await loadBoundUser(supabaseAdmin as any, winner.supabase_user_id);
            } else {
              await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
              throw bindingError;
            }
          } else {
            await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
            throw bindingError;
          }
        }
      }
    }

    const authData = await issueSupabaseSession(supabaseAdmin as any, supabaseUser);

    return jsonNoStore({
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user: authData.user,
    });
  } catch (error) {
    console.error("Auth bridge error:", error);
    return jsonNoStore(
      { error: "Failed to complete Firebase authentication." },
      { status: 500 },
    );
  }
}

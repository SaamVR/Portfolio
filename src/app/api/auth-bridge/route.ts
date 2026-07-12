import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getFirebaseApiKey() {
  return process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

function getFirebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

function getFirebaseEmail(uid: string, email?: string) {
  return email || `${uid}@firebase-phone.local`;
}

function getSupabasePublishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing Supabase publishable key.");
  }
  return key;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = rateLimit(`auth_${ip}`, { limit: 10, windowMs: 60000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { id_token: idToken, display_name: displayName } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing id_token" }, { status: 400 });
    }

    const firebaseApiKey = getFirebaseApiKey();
    const firebaseProjectId = getFirebaseProjectId();
    if (!firebaseApiKey || !firebaseProjectId) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: `Firebase token verification failed: ${verifyData.error?.message || verifyResponse.statusText}` },
        { status: 401 },
      );
    }

    const firebaseUser = verifyData.users?.[0];
    const uid = firebaseUser?.localId;
    if (!uid) {
      return NextResponse.json({ error: "Firebase token did not include a user." }, { status: 401 });
    }

    const email = getFirebaseEmail(uid, firebaseUser.email);
    const phone = firebaseUser.phoneNumber || undefined;
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    let supabaseUser = users.users.find((user) => user.email === email || (phone && user.phone === phone));
    if (!supabaseUser) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        phone,
        email_confirm: true,
        phone_confirm: Boolean(phone),
        user_metadata: {
          full_name: displayName || phone || email,
          firebase_uid: uid,
        },
      });
      if (createError) throw createError;
      supabaseUser = created.user;
    }

    const tempPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUser.id,
      { password: tempPassword },
    );
    if (passwordError) throw passwordError;

    const supabasePasswordClient = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getSupabasePublishableKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: authData, error: signInError } = await supabasePasswordClient.auth.signInWithPassword({
      email,
      password: tempPassword,
    });
    if (signInError) throw signInError;

    return NextResponse.json({
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user: authData.user,
    });
  } catch (error) {
    console.error("Auth bridge error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to complete phone authentication.",
      },
      { status: 500 },
    );
  }
}


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { importX509, jwtVerify } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type FirebaseJwtPayload = {
  aud: string;
  auth_time?: number;
  exp: number;
  firebase?: {
    identities?: Record<string, string[]>;
    sign_in_provider?: string;
  };
  iat: number;
  iss: string;
  phone_number?: string;
  sub: string;
  user_id?: string;
};

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

function getEnv(name: string) {
  return Deno.env.get(name) ?? "";
}

function getFirebaseProjectId() {
  return (
    getEnv("FIREBASE_PROJECT_ID") ||
    getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ||
    ""
  );
}

function getBridgeSecret() {
  return getEnv("AUTH_BRIDGE_SECRET") || getFirebaseProjectId() || "commerce-engine-auth-bridge";
}

function buildSyntheticEmail(uid: string) {
  return `firebase-${uid}@users.commerce-engine.local`;
}

async function buildBridgePassword(uid: string) {
  const payload = new TextEncoder().encode(`${uid}:${getBridgeSecret()}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyFirebaseIdToken(idToken: string) {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase project ID is not configured");
  }

  const [headerSegment] = idToken.split(".");
  if (!headerSegment) {
    throw new Error("Invalid Firebase token");
  }

  const decodedHeader = JSON.parse(atob(headerSegment.replace(/-/g, "+").replace(/_/g, "/"))) as {
    alg?: string;
    kid?: string;
  };

  if (!decodedHeader.kid) {
    throw new Error("Firebase token missing key id");
  }

  const certsResponse = await fetch(FIREBASE_CERTS_URL, { cache: "no-store" });
  if (!certsResponse.ok) {
    throw new Error("Failed to fetch Firebase verification certificates");
  }

  const certs = (await certsResponse.json()) as Record<string, string>;
  const cert = certs[decodedHeader.kid];
  if (!cert) {
    throw new Error("Firebase token certificate not found");
  }

  const key = await importX509(cert, decodedHeader.alg || "RS256");
  const issuer = `https://securetoken.google.com/${projectId}`;
  const { payload } = await jwtVerify(idToken, key, {
    issuer,
    audience: projectId,
  });

  return payload as unknown as FirebaseJwtPayload;
}

async function findAuthUserIdByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await supabaseAdmin
    .rpc("get_user_id_by_email", { email_to_find: email });

  if (error) {
    throw new Error(`Failed to lookup auth user: ${error.message}`);
  }

  return (data as string) ?? null;
}

async function signInToSupabase(email: string, password: string) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const publishableKey =
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase client credentials are not configured");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || "Failed to create Supabase session");
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );

    const body = await req.json();
    const idToken = String(body.id_token ?? "").trim();
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : null;

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Firebase ID token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firebaseUser = await verifyFirebaseIdToken(idToken);
    const firebaseUid = firebaseUser.user_id || firebaseUser.sub;
    const phoneNumber = firebaseUser.phone_number || firebaseUser.firebase?.identities?.phone?.[0] || null;

    if (!firebaseUid || !phoneNumber) {
      return new Response(JSON.stringify({ error: "Verified Firebase user is missing a phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = buildSyntheticEmail(firebaseUid);
    const password = await buildBridgePassword(firebaseUid);
    const existingUserId = await findAuthUserIdByEmail(supabaseAdmin, email);

    if (existingUserId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
        password,
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: {
          auth_source: "firebase_phone",
          firebase_uid: firebaseUid,
          full_name: displayName || phoneNumber,
          phone_number: phoneNumber,
        },
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: {
          auth_source: "firebase_phone",
          firebase_uid: firebaseUid,
          full_name: displayName || phoneNumber,
          phone_number: phoneNumber,
        },
      });

      if (createError) {
        throw new Error(createError.message);
      }
    }

    const session = await signInToSupabase(email, password);

    const { data: memberships } = await supabaseAdmin
      .from("store_memberships")
      .select("store_id, role, stores:store_id (slug, name)")
      .eq("user_id", session.user.id);

    return new Response(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
        memberships: memberships ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("auth-bridge unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id_token, display_name } = await req.json();

    if (!id_token) {
      throw new Error("Missing id_token");
    }

    // Call Google Identity Toolkit to verify the Firebase ID Token
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const firebaseApiKey = Deno.env.get("FIREBASE_API_KEY");
    
    if (!firebaseProjectId || !firebaseApiKey) {
      throw new Error("Firebase environment variables are not configured on the server.");
    }

    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: id_token })
    });

    const verifyData = await verifyRes.json();
    if (verifyData.error) {
      throw new Error(`Firebase token verification failed: ${verifyData.error.message}`);
    }

    const firebaseUser = verifyData.users[0];
    const uid = firebaseUser.localId;
    const email = firebaseUser.email || `${uid}@firebase-phone.local`;
    const phone_number = firebaseUser.phoneNumber;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user exists in Supabase
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;

    let supabaseUser = users.users.find(u => u.email === email || (phone_number && u.phone === phone_number));

    if (!supabaseUser) {
      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        phone: phone_number,
        email_confirm: true,
        phone_confirm: !!phone_number,
        user_metadata: {
          full_name: display_name || phone_number,
          firebase_uid: uid
        }
      });
      if (createError) throw createError;
      supabaseUser = newUser.user;
    }

    // Generate custom JWT or trigger a magic link / OTP? 
    // Wait, the best way to login as a user from admin is to generate a link or use sign in with password if we know it.
    // Deno edge function can just return a custom token or we can use admin.generateLink.
    // Alternatively, we can use an undocumented generate token endpoint, but for Supabase it's easier to just use `admin.generateLink` for magic link and return the token.
    
    // Instead of messing with tokens directly, let's just generate a magic link and parse the access token from it.
    // Wait, generating a magic link sends an email.
    // To seamlessly log in a user from the backend in Supabase, we can use Postgres function or create a custom JWT, but Supabase doesn't natively accept custom JWTs easily without setting up external auth provider.
    // Another way is to just set a random password for the user, and then sign in with that password.
    
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, { password: tempPassword });
    
    const { data: authData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: tempPassword,
    });
    
    if (signInError) throw signInError;

    return new Response(JSON.stringify({
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      user: authData.user
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

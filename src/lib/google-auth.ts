"use client";

import { supabase } from "@/integrations/supabase/client";

interface GoogleSignInOptions {
  redirectPath?: string;
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  const redirectPath = options.redirectPath || "/admin/login";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${redirectPath}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  // Supabase OAuth redirects the page, so this return will only happen before redirect
  // The actual session is handled by the Supabase auth listener upon return.
  return data;
}

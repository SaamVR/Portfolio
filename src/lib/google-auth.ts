"use client";

import { supabase } from "@/integrations/supabase/client";

interface GoogleSignInOptions {
  redirectPath?: string;
  nextPath?: string;
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  const redirectPath = options.redirectPath || "/admin/login";
  const nextPath = typeof options.nextPath === "string" && options.nextPath.startsWith("/")
    ? options.nextPath
    : null;
  const redirectUrl = new URL(redirectPath, window.location.origin);

  if (nextPath) {
    redirectUrl.searchParams.set("next", nextPath);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl.toString(),
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

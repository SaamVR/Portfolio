"use client";

import { supabase } from "@/integrations/supabase/client";

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/admin/login`, // Redirect to admin login or a dedicated OAuth callback handler
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

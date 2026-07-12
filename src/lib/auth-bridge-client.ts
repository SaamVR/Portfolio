type AuthBridgePayload = {
  id_token: string;
  display_name?: string;
};

type AuthBridgeResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: unknown;
  error?: string;
};

export async function exchangeFirebaseTokenForSupabaseSession(
  payload: AuthBridgePayload,
): Promise<AuthBridgeResponse> {
  const response = await fetch("/api/auth-bridge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Phone login failed with ${response.status}`);
  }

  return data as AuthBridgeResponse;
}

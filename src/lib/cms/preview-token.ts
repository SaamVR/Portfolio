export interface StorePreviewSession {
  previewUrl: string;
  expiresAt: string;
}

export async function createPreviewSession(storeId: string): Promise<StorePreviewSession | null> {
  if (!storeId) return null;

  try {
    const response = await fetch("/api/stores/preview-token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ storeId }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<StorePreviewSession>;
    if (!payload.previewUrl || !payload.expiresAt) {
      return null;
    }

    return {
      previewUrl: payload.previewUrl,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function buildStorePreviewUrl(storeSlug: string, previewToken?: string | null): string {
  const basePath = `/stores/${encodeURIComponent(storeSlug)}`;
  if (!previewToken) return basePath;
  return `${basePath}?preview=${encodeURIComponent(previewToken)}`;
}

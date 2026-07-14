import { supabase } from "@/integrations/supabase/client";
import type { MediaLibraryAsset } from "@/lib/media-library";

type UploadMediaAssetOptions = {
  file: File;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  storeId: string;
};

type NormalizedUploadMediaAssetOptions = Required<UploadMediaAssetOptions>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

export function formatMediaUploadError(error: unknown) {
  const message = getErrorMessage(error);

  if (
    message.includes("Upload API is unreachable")
    || message.includes("Storage upload is unreachable")
    || message.includes("Failed to fetch")
  ) {
    return "Upload service is unreachable. Redeploy the latest build and check Vercel/Supabase environment variables.";
  }

  if (message.includes("You must be signed in to upload media")) {
    return "Your session has expired. Sign in again, then retry the upload.";
  }

  if (message.includes("No store workspace found for upload") || message.includes("Select a store before uploading media")) {
    return "Choose an active store before uploading media.";
  }

  return message;
}

async function postJson<T>(url: string, token: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Upload API is unreachable. Deploy the latest app build and check Vercel access settings. ${getErrorMessage(error)}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Upload API failed with ${response.status}`);
  }

  return payload as T;
}

async function proxyUpload({
  file,
  storeId,
  path,
  token,
}: {
  file: File;
  storeId: string;
  path: string;
  token: string;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("storeId", storeId);
  formData.append("path", path);
  formData.append("contentType", file.type || "application/octet-stream");

  let response: Response;
  try {
    response = await fetch("/api/media/proxy-upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (error) {
    throw new Error(`Storage upload is unreachable. ${getErrorMessage(error)}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Storage upload failed with ${response.status}`);
  }
}

async function uploadToSupabaseStorage({
  file,
  folder,
  resourceType,
  storeId,
}: NormalizedUploadMediaAssetOptions): Promise<MediaLibraryAsset> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (sessionError || !token) {
    throw new Error(sessionError?.message || "You must be signed in to upload media");
  }

  const payload = await postJson<{
    bucket: string;
    path: string;
    token: string;
    asset: MediaLibraryAsset;
  }>(
    "/api/media/upload",
    token,
    {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folder,
      resourceType,
      storeId,
    },
  );

  let directUploadError: unknown = null;

  try {
    const { error } = await supabase.storage
      .from(payload.bucket)
      .uploadToSignedUrl(payload.path, payload.token, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    directUploadError = error;
  } catch (error) {
    directUploadError = error;
  }

  if (directUploadError) {
    console.warn("Direct Supabase Storage upload failed, retrying through app server:", directUploadError);
    try {
      await proxyUpload({ file, storeId, path: payload.path, token });
    } catch (proxyError) {
      throw new Error(
        `Media upload failed after direct and fallback attempts. Direct upload: ${getErrorMessage(directUploadError)}. Fallback upload: ${getErrorMessage(proxyError)}`,
      );
    }
  }

  return payload.asset;
}

async function uploadToCloudinary({
  file,
  folder,
  resourceType,
  storeId,
}: NormalizedUploadMediaAssetOptions): Promise<MediaLibraryAsset> {
  const cloudinaryResourceType = resourceType === "auto" ? "auto" : resourceType;
  const { data: sigData, error: sigError } = await supabase.functions.invoke(
    "cloudinary-signature",
    {
      body: { folder, resource_type: cloudinaryResourceType, store_id: storeId },
    },
  );

  if (sigError || !sigData) {
    throw new Error(sigError?.message || "Failed to get upload signature");
  }

  const { signature, timestamp, cloud_name, api_key } = sigData;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", api_key);
  formData.append("folder", sigData.folder || folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${cloudinaryResourceType}/upload`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData?.error?.message || "Upload failed");
  }

  const result = await response.json();

  return {
    id: crypto.randomUUID(),
    url: result.secure_url,
    resourceType: result.resource_type === "video" ? "video" : "image",
    folder: folder || "cms",
    width: typeof result.width === "number" ? result.width : undefined,
    height: typeof result.height === "number" ? result.height : undefined,
    bytes: typeof result.bytes === "number" ? result.bytes : undefined,
    format: typeof result.format === "string" ? result.format : undefined,
    publicId: typeof result.public_id === "string" ? result.public_id : undefined,
    originalFilename: typeof result.original_filename === "string" ? result.original_filename : file.name,
    createdAt: new Date().toISOString(),
  };
}

export async function uploadMediaAsset({
  file,
  folder = "cms",
  resourceType = "image",
  storeId,
}: UploadMediaAssetOptions): Promise<MediaLibraryAsset> {
  const uploadOptions = { file, folder, resourceType, storeId };

  try {
    return await uploadToCloudinary(uploadOptions);
  } catch (error) {
    console.warn("Cloudinary upload unavailable, falling back to Supabase Storage:", error);
    try {
      return await uploadToSupabaseStorage(uploadOptions);
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError));
    }
  }
}

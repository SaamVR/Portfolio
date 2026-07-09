import { supabase } from "@/integrations/supabase/client";
import type { MediaLibraryAsset } from "@/lib/media-library";

type UploadMediaAssetOptions = {
  file: File;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  storeId: string;
};

export async function uploadMediaAsset({
  file,
  folder = "cms",
  resourceType = "image",
  storeId,
}: UploadMediaAssetOptions): Promise<MediaLibraryAsset> {
  const { data: sigData, error: sigError } = await supabase.functions.invoke(
    "cloudinary-signature",
    {
      body: { folder, resource_type: resourceType, store_id: storeId },
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

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;
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

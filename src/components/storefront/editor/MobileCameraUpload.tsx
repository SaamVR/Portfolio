"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-context";
import { formatMediaUploadError, uploadMediaAsset } from "@/lib/cloudinary-upload";
import { fetchMediaLibrary, saveMediaLibrary } from "@/lib/media-library";

export function MobileCameraUpload({
  storeId,
  folder,
  onChange,
}: {
  storeId?: string;
  folder: string;
  onChange: (url: string) => void;
}) {
  const { activeStoreId } = useAuth();
  const effectiveStoreId = storeId || activeStoreId || undefined;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!effectiveStoreId) {
      toast.error("Select a store before taking a photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo is too large. Maximum image size is 10MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const asset = await uploadMediaAsset({
        file,
        folder,
        resourceType: "image",
        storeId: effectiveStoreId,
      });
      try {
        const existingAssets = await fetchMediaLibrary(effectiveStoreId);
        if (!existingAssets.some((item) => item.url === asset.url)) {
          const updated = await saveMediaLibrary([asset, ...existingAssets], effectiveStoreId);
          queryClient.setQueryData(["media_library", effectiveStoreId], updated);
        }
      } catch (error) {
        console.warn("Failed to register camera asset in media library:", error);
      }
      onChange(asset.url);
      toast.success("Photo uploaded.");
    } catch (error) {
      toast.error(formatMediaUploadError(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-center gap-2 rounded-xl"
        disabled={uploading || !effectiveStoreId}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {uploading ? "Uploading photo..." : "Take photo"}
      </Button>
    </>
  );
}

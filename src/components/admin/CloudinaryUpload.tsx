import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Loader2, X, Film } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { formatMediaUploadError, uploadMediaAsset } from "@/lib/cloudinary-upload";
import type { MediaLibraryAsset } from "@/lib/media-library";

interface CloudinaryUploadProps {
  value: string;
  onChange: (url: string) => void;
  onSelectAsset?: (asset: MediaLibraryAsset | null) => void;
  folder?: string;
  accept?: string;
  label?: string;
  showPreview?: boolean;
  resourceType?: "image" | "video" | "auto";
  storeId?: string;
  inputTestId?: string;
}

const CloudinaryUpload = ({
  value,
  onChange,
  onSelectAsset,
  folder = "products",
  accept = "image/*",
  label = "Upload Image",
  showPreview = true,
  resourceType = "image",
  storeId,
  inputTestId,
}: CloudinaryUploadProps) => {
  const { activeStoreId } = useAuth();
  const effectiveStoreId = storeId || activeStoreId || undefined;
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!effectiveStoreId) {
      toast.error("Select a store before uploading media.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size (max 10MB for images, 50MB for videos)
    const maxSize = resourceType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${resourceType === "video" ? "50MB" : "10MB"}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      const asset = await uploadMediaAsset({
        file,
        folder,
        resourceType,
        storeId: effectiveStoreId,
      });

      // Also register this asset in the store's media library so it appears in the Media Library browser!
      try {
        const { fetchMediaLibrary, saveMediaLibrary } = await import("@/lib/media-library");
        const existingAssets = await fetchMediaLibrary(effectiveStoreId);
        if (!existingAssets.some((a) => a.url === asset.url)) {
          const updated = await saveMediaLibrary([asset, ...existingAssets], effectiveStoreId);
          queryClient.setQueryData(["media_library", effectiveStoreId], updated);
        }
      } catch (mediaLibErr) {
        console.warn("Failed to register asset in media library setting:", mediaLibErr);
      }

      onChange(asset.url);
      onSelectAsset?.(asset);
      toast.success("Uploaded successfully!");
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      toast.error(formatMediaUploadError(err));
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isVideo = value && (value.includes("/video/") || value.match(/\.(mp4|webm|mov)$/i));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          data-testid={inputTestId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload"
          className="flex-1"
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !effectiveStoreId}
          title={label}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        <MediaLibraryPicker
          value={value}
          storeId={effectiveStoreId}
          folder={folder}
          resourceType={resourceType}
          onSelect={(asset) => {
            onChange(asset.url);
            onSelectAsset?.(asset);
          }}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange("");
              onSelectAsset?.(null);
            }}
            title="Clear"
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showPreview && value && (
        <div className="relative h-24 w-24 overflow-hidden rounded-md border border-border bg-secondary">
          {isVideo ? (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CloudinaryUpload;


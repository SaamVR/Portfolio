import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, X, Image as ImageIcon, Film } from "lucide-react";

interface CloudinaryUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  showPreview?: boolean;
  resourceType?: "image" | "video" | "auto";
}

const CloudinaryUpload = ({
  value,
  onChange,
  folder = "products",
  accept = "image/*",
  label = "Upload Image",
  showPreview = true,
  resourceType = "image",
}: CloudinaryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB for images, 50MB for videos)
    const maxSize = resourceType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${resourceType === "video" ? "50MB" : "10MB"}`);
      return;
    }

    setUploading(true);

    try {
      // Get signed upload params from edge function
      const { data: sigData, error: sigError } = await supabase.functions.invoke(
        "cloudinary-signature",
        {
          body: { folder, resource_type: resourceType },
        }
      );

      if (sigError || !sigData) {
        throw new Error(sigError?.message || "Failed to get upload signature");
      }

      const { signature, timestamp, cloud_name, api_key } = sigData;

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", api_key);
      formData.append("folder", folder);

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
      onChange(result.secure_url);
      toast.success("Uploaded successfully!");
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      toast.error(err.message || "Upload failed");
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
          disabled={uploading}
          title={label}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange("")}
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

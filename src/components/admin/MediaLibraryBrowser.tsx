"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Film, FolderOpen, Image as ImageIcon, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadMediaAsset } from "@/lib/cloudinary-upload";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { type MediaLibraryAsset } from "@/lib/media-library";
import { useAuth } from "@/hooks/auth-context";
import { cn } from "@/lib/utils";

type MediaLibraryBrowserProps = {
  storeId?: string;
  title?: string;
  description?: string;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  selectedUrl?: string;
  onSelect?: (asset: MediaLibraryAsset) => void;
  showSelectionActions?: boolean;
};

export function MediaLibraryBrowser({
  storeId,
  title = "Media Library",
  description = "Upload and reuse store media across pages, onboarding, and settings.",
  folder = "cms",
  resourceType = "auto",
  selectedUrl,
  onSelect,
  showSelectionActions = true,
}: MediaLibraryBrowserProps) {
  const { activeStoreId } = useAuth();
  const effectiveStoreId = storeId || activeStoreId;
  const queryClient = useQueryClient();
  const { data: assets = [], isLoading } = useMediaLibrary(effectiveStoreId ?? undefined);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = !search || [asset.originalFilename, asset.alt, asset.folder, asset.url]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "all" || asset.resourceType === typeFilter;
      const matchesFolder = folderFilter === "all" || asset.folder === folderFilter;
      const matchesRequestedType = resourceType === "auto" || asset.resourceType === resourceType;

      return matchesSearch && matchesType && matchesFolder && matchesRequestedType;
    });
  }, [assets, folderFilter, resourceType, search, typeFilter]);

  const folderOptions = useMemo(() => {
    return Array.from(new Set(assets.map((asset) => asset.folder))).sort();
  }, [assets]);

  const persistAssets = async (nextAssets: MediaLibraryAsset[]) => {
    if (!effectiveStoreId) {
      throw new Error("Select a store before managing media.");
    }

    // dynamically import saveMediaLibrary to avoid circular deps if any
    const { saveMediaLibrary } = await import("@/lib/media-library");
    const saved = await saveMediaLibrary(nextAssets, effectiveStoreId);
    queryClient.setQueryData(["media_library", effectiveStoreId], saved);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (!effectiveStoreId) {
      toast.error("Select a store before uploading media.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);

    try {
      const uploadedAssets: MediaLibraryAsset[] = [];

      for (const file of files) {
        const effectiveType = resourceType === "auto"
          ? file.type.startsWith("video/") ? "video" : "image"
          : resourceType;
        const nextAsset = await uploadMediaAsset({
          file,
          folder,
          resourceType: effectiveType,
          storeId: effectiveStoreId,
        });
        uploadedAssets.push(nextAsset);
      }

      await persistAssets([...uploadedAssets, ...assets]);
      toast.success(uploadedAssets.length === 1 ? "Media uploaded." : "Media files uploaded.");
      if (uploadedAssets[0] && onSelect) {
        onSelect(uploadedAssets[0]);
      }
    } catch (error: any) {
      console.error("Media library upload error:", error);
      const message = String(error?.message || "Upload failed");
      toast.error(
        message.includes("Failed to fetch")
          ? "Upload service is unreachable. Redeploy the latest build and check Vercel/Supabase environment variables."
          : message,
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (assetId: string) => {
    try {
      await persistAssets(assets.filter((asset) => asset.id !== assetId));
      toast.success("Asset removed from library.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove asset");
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Asset URL copied.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={resourceType === "video" ? "video/*" : resourceType === "image" ? "image/*" : "image/*,video/*"}
            multiple
            onChange={handleUpload}
          />
          <Button type="button" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || !effectiveStoreId}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Media
          </Button>
        </div>
      </div>

      {!effectiveStoreId ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-sm text-muted-foreground">
          Choose an active store to view, upload, and reuse media safely.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file name, folder, or URL" className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | "image" | "video")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            {folderOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}

      {!isLoading && effectiveStoreId && visibleAssets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No assets yet. Upload your first store image or video to start building reusable media.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.map((asset) => {
          const isSelected = selectedUrl === asset.url;

          return (
            <div
              key={asset.id}
              className={cn(
                "overflow-hidden rounded-lg border bg-card",
                isSelected ? "border-primary shadow-sm" : "border-border",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40">
                {asset.resourceType === "video" ? (
                  <video src={asset.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={asset.url} alt={asset.alt || asset.originalFilename || "Asset preview"} className="h-full w-full object-cover" />
                )}
                <div className="absolute left-3 top-3 flex gap-2">
                  <Badge variant="secondary">{asset.resourceType === "video" ? "Video" : "Image"}</Badge>
                  <Badge variant="outline">{asset.folder}</Badge>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{asset.originalFilename || asset.publicId || "Uploaded asset"}</p>
                  <p className="truncate text-xs text-muted-foreground">{new Date(asset.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {showSelectionActions && onSelect ? (
                    <Button type="button" size="sm" variant={isSelected ? "secondary" : "outline"} onClick={() => onSelect(asset)}>
                      {isSelected ? "Selected" : "Use Asset"}
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy(asset.url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => window.open(asset.url, "_blank", "noopener,noreferrer")}>
                    {asset.resourceType === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setFolderFilter(asset.folder)}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => void handleDelete(asset.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


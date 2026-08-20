"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MediaLibraryBrowser } from "@/components/admin/MediaLibraryBrowser";

export default function MediaLibraryManager() {
  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-6">
        <MediaLibraryBrowser
          showSelectionActions={false}
          title="Store media"
          description="Upload and reuse store-scoped images and videos across logos, hero sections, pages, and templates."
        />
      </CardContent>
    </Card>
  );
}

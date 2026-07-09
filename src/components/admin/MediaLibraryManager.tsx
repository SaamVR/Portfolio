"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaLibraryBrowser } from "@/components/admin/MediaLibraryBrowser";

export default function MediaLibraryManager() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Media Library</CardTitle>
        <CardDescription>Store-scoped media for logos, hero sections, CMS pages, and future templates.</CardDescription>
      </CardHeader>
      <CardContent>
        <MediaLibraryBrowser showSelectionActions={false} />
      </CardContent>
    </Card>
  );
}


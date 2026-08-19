import { NextResponse } from "next/server";
import { loadPublishedBlogPosts } from "@/lib/cms/blog-server";

export const dynamic = "force-dynamic";

function boundedLimit(value: string | null) {
  const parsed = Number(value ?? 6);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(24, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim();
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const posts = await loadPublishedBlogPosts(storeId, {
    limit: boundedLimit(url.searchParams.get("limit")),
    category: url.searchParams.get("category"),
    tag: url.searchParams.get("tag"),
    search: url.searchParams.get("q"),
  });

  return NextResponse.json(
    { posts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

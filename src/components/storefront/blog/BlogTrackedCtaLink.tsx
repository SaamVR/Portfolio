"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStorefrontAnalytics } from "@/components/storefront/StorefrontAnalyticsProvider";
import type { BlogCtaKind } from "@/lib/cms/blog-cta";

const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90";

export default function BlogTrackedCtaLink({
  href,
  external,
  label,
  postId,
  postSlug,
  kind,
  category,
}: {
  href: string;
  external: boolean;
  label: string;
  postId: string;
  postSlug: string;
  kind: BlogCtaKind;
  category?: string;
}) {
  const { trackEvent } = useStorefrontAnalytics();

  const trackClick = () => {
    trackEvent({
      eventName: "blog_cta_click",
      eventCategory: "blog",
      pageType: "blog_article",
      metadata: {
        source: "blog",
        medium: "editorial",
        campaign: postSlug,
        content: "cta",
        blogPostId: postId,
        blogPostSlug: postSlug,
        ctaKind: kind,
        ...(category ? { ctaCategory: category } : {}),
      },
    });
  };

  const content = <>{label}<ArrowRight className="h-4 w-4" /></>;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass} onClick={trackClick}>
        {content}
      </a>
    );
  }

  return <Link href={href} className={buttonClass} onClick={trackClick}>{content}</Link>;
}

import React from "react";
import "@/index.css";
import { Providers } from "./providers";
import { appFontVariables } from "@/lib/fonts";
import { getPlatformRuntimeIdentity } from "@/lib/platform/runtime-identity";
import { getPlatformSiteUrl } from "@/lib/platform/site-config";

function getSupabaseOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!configuredUrl) return null;
  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata() {
  const { siteName } = await getPlatformRuntimeIdentity();
  return {
    metadataBase: new URL(getPlatformSiteUrl()),
    title: `${siteName} Storefront CMS`,
    description: `${siteName} is a mobile-first storefront CMS for launch templates, pages, products, checkout flows, and store operations.`,
    authors: [{ name: siteName }],
    openGraph: {
      title: `${siteName} Storefront CMS`,
      description: `Launch and manage online stores with ${siteName} templates, CMS pages, products, payments, and admin workflows.`,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ezcomo",
      title: `${siteName} Storefront CMS`,
      description: `Launch and manage online stores with ${siteName} templates, CMS pages, products, payments, and admin workflows.`,
      images: ["/og-image.png"],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseOrigin = getSupabaseOrigin();
  const platformIdentity = await getPlatformRuntimeIdentity();

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        {supabaseOrigin ? <link rel="preconnect" href={supabaseOrigin} /> : null}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={appFontVariables}>
        <Providers platformIdentity={platformIdentity}>{children}</Providers>
      </body>
    </html>
  );
}

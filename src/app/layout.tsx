import React from "react";
import "@/index.css";
import { Providers } from "./providers";
import { PLATFORM_BRAND_NAME, getPlatformSiteUrl } from "@/lib/platform/site-config";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(getPlatformSiteUrl()),
  title: `${PLATFORM_BRAND_NAME} Storefront CMS`,
  description: `${PLATFORM_BRAND_NAME} is a mobile-first storefront CMS for launch templates, pages, products, checkout flows, and store operations.`,
  authors: [{ name: PLATFORM_BRAND_NAME }],
  openGraph: {
    title: `${PLATFORM_BRAND_NAME} Storefront CMS`,
    description: `Launch and manage online stores with ${PLATFORM_BRAND_NAME} templates, CMS pages, products, payments, and admin workflows.`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ezcomo",
    title: `${PLATFORM_BRAND_NAME} Storefront CMS`,
    description: `Launch and manage online stores with ${PLATFORM_BRAND_NAME} templates, CMS pages, products, payments, and admin workflows.`,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://kipopygvmfvknbtjbzzv.supabase.co" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
